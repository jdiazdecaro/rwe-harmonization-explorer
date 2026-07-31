import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";

// ── Country ISO-numeric mappings ─────────────────────────────────────
const COUNTRY_ISO = {
  "United States": "840",
  Canada: "124",
  Brazil: "076",
  "United Kingdom": "826",
  Switzerland: "756",
  Japan: "392",
  China: "156",
  Australia: "036",
  "South Korea": "410",
  "Saudi Arabia": "682",
  Taiwan: "158",
};

// EU member-state ISO codes (for EMA)
const EU_ISO = new Set([
  "040","056","100","191","196","203","208","233","246","250",
  "276","300","348","372","380","428","440","442","470","528",
  "616","620","642","703","705","724","752",
]);

// ── Mercator projection helpers ──────────────────────────────────────
// Cropped longitude range to cut empty Pacific and make map more square
const LON_MIN = -135;
const LON_MAX = 165;
const LAT_MIN = -55;
const LAT_MAX = 72;
const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const MERC_BOT = mercatorY(LAT_MIN);
const MERC_TOP = mercatorY(LAT_MAX);
const LON_RANGE = LON_MAX - LON_MIN;
const MERC_RANGE = MERC_TOP - MERC_BOT;
const ASPECT = MERC_RANGE / ((LON_RANGE * Math.PI) / 180); // height/width ratio

// Internal viewBox size (arbitrary; SVG scales to container)
const VB_W = 800;
const VB_H = Math.round(VB_W * ASPECT);

function project(lon, lat) {
  const x = ((lon - LON_MIN) / LON_RANGE) * VB_W;
  const clamped = Math.max(LAT_MIN, Math.min(LAT_MAX, lat));
  const y = VB_H - ((mercatorY(clamped) - MERC_BOT) / MERC_RANGE) * VB_H;
  return [x, y];
}

// ── Path helpers — clip rings to visible longitude to kill horizontal-line artifacts
function clipRing(ring) {
  // If any segment jumps more than 90° of longitude, it wraps the date-line
  // → split into separate sub-rings (effectively dropping the cross-world stroke)
  const subRings = [];
  let current = [];
  for (let i = 0; i < ring.length; i++) {
    const [lon, lat] = ring[i];
    if (current.length > 0) {
      const prevLon = current[current.length - 1][0];
      // Large longitude jump → this segment crosses outside our view
      if (Math.abs(lon - prevLon) > 90) {
        if (current.length >= 3) subRings.push(current);
        current = [];
      }
    }
    current.push([lon, lat]);
  }
  if (current.length >= 3) subRings.push(current);
  return subRings;
}

function ringToSvg(ring) {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = project(ring[i][0], ring[i][1]);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d + "Z";
}

function geoToPath(geom) {
  const rings = [];
  if (geom.type === "Polygon") {
    for (const r of geom.coordinates) rings.push(...clipRing(r));
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates)
      for (const r of poly) rings.push(...clipRing(r));
  }
  return rings.map(ringToSvg).join("");
}

// ── Pre-compute GeoJSON from TopoJSON ────────────────────────────────
// Filter out Antarctica (010) to avoid visual artifacts
const geoCountries = feature(worldTopo, worldTopo.objects.countries).features
  .filter((f) => f.id !== "010");

// Pre-compute static SVG path data (no dependency on container size since we use viewBox)
const staticPaths = geoCountries.map((feat) => ({
  id: feat.id,
  d: geoToPath(feat.geometry),
}));

// ── Component ────────────────────────────────────────────────────────
export default function WorldMap({
  agencies,
  regionColors,
  hoveredAgency,
  lockedAgency,
  onHoverAgency,
  onLockAgency,
  palette,
}) {
  const [hoveredCountry, setHoveredCountry] = useState(null);

  // Build lookup: ISO code → agency object
  const isoToAgency = useMemo(() => {
    const map = {};
    for (const a of agencies) {
      if (a.country === "European Union") {
        for (const code of EU_ISO) map[code] = a;
      } else {
        const iso = COUNTRY_ISO[a.country];
        if (iso) map[iso] = a;
      }
    }
    return map;
  }, [agencies]);

  // Build lookup: agencyId → set of ISO codes (for reverse highlight)
  const agencyToIsos = useMemo(() => {
    const map = {};
    for (const a of agencies) {
      if (a.country === "European Union") {
        map[a.id] = EU_ISO;
      } else {
        const iso = COUNTRY_ISO[a.country];
        if (iso) map[a.id] = new Set([iso]);
      }
    }
    return map;
  }, [agencies]);

  const activeAgency = lockedAgency || hoveredAgency;

  // Determine which ISO codes should be highlighted (from heatmap interaction)
  const highlightedIsos = useMemo(() => {
    if (!activeAgency) return null;
    return agencyToIsos[activeAgency] || null;
  }, [activeAgency, agencyToIsos]);

  // Attach agency info to static paths
  const countryPaths = useMemo(() => {
    return staticPaths.map((sp) => ({
      ...sp,
      agency: isoToAgency[sp.id] || null,
    }));
  }, [isoToAgency]);

  const handleClick = useCallback(
    (agency) => {
      if (agency) onLockAgency(agency.id);
    },
    [onLockAgency]
  );

  const handleMouseEnter = useCallback(
    (agency) => {
      if (agency && !lockedAgency) onHoverAgency(agency.id);
      setHoveredCountry(agency?.id || null);
    },
    [lockedAgency, onHoverAgency]
  );

  const handleMouseLeave = useCallback(() => {
    if (!lockedAgency) onHoverAgency(null);
    setHoveredCountry(null);
  }, [lockedAgency, onHoverAgency]);

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Title */}
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          color: palette.dukeNavy,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 8,
          borderBottom: `2px solid ${palette.dukeNavy}`,
          paddingBottom: 4,
        }}
      >
        Agency Locations
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "auto",
          background: "#e8eff6",
          borderRadius: 6,
          border: `1px solid ${palette.borderLight}`,
          display: "block",
          overflow: "hidden",
        }}
      >
        {/* Clip to visible area */}
        <defs>
          <clipPath id="map-clip">
            <rect x={0} y={0} width={VB_W} height={VB_H} />
          </clipPath>
        </defs>

        <g clipPath="url(#map-clip)">
          {/* All countries */}
          {countryPaths.map(({ id, d, agency }) => {
            if (!d) return null;
            const isAgencyCountry = !!agency;
            const isHovered = agency && hoveredCountry === agency.id;
            const isHighlighted = agency && highlightedIsos && highlightedIsos.has(id);
            const isDimmed = highlightedIsos && !isHighlighted && isAgencyCountry;

            let fill = "#d0d8e0";
            let opacity = 1;
            let strokeW = 0.5;
            let stroke = "#b0b8c2";

            if (isAgencyCountry) {
              fill = regionColors[agency.region];
              opacity = isHighlighted ? 0.95 : isDimmed ? 0.25 : 0.7;
              strokeW = isHighlighted || isHovered ? 2.5 : 0.8;
              stroke = isHighlighted || isHovered ? regionColors[agency.region] : "#8a96a2";
            }

            return (
              <path
                key={id}
                d={d}
                fill={fill}
                opacity={opacity}
                stroke={stroke}
                strokeWidth={strokeW}
                strokeLinejoin="round"
                style={{
                  cursor: isAgencyCountry ? "pointer" : "default",
                  transition: "opacity 0.2s, stroke-width 0.15s",
                }}
                onMouseEnter={() => handleMouseEnter(agency)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(agency)}
              />
            );
          })}

          {/* Agency marker dots + labels */}
          {agencies.map((a) => {
            const isos = agencyToIsos[a.id];
            if (!isos) return null;
            const coords = AGENCY_LABEL_COORDS[a.id];
            if (!coords) return null;
            const [px, py] = project(coords[0], coords[1]);
            const isActive = activeAgency === a.id;
            const showLabel = !activeAgency || isActive;
            const color = regionColors[a.region];

            return (
              <g key={a.id} style={{ pointerEvents: "none" }}>
                <circle
                  cx={px}
                  cy={py}
                  r={isActive ? 8 : 5}
                  fill={isActive ? color : "#fff"}
                  stroke={isActive ? "#fff" : color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  opacity={activeAgency && !isActive ? 0.25 : 1}
                  style={{ transition: "all 0.2s" }}
                />
                {showLabel && (
                  <g>
                    <text
                      x={px + (coords[2] || 10)}
                      y={py + 1}
                      fontSize={isActive ? 16 : 13}
                      fontWeight={700}
                      fontFamily="'Source Sans Pro','Source Sans 3',sans-serif"
                      fill={palette.surface}
                      stroke={palette.surface}
                      strokeWidth={4}
                      strokeLinejoin="round"
                      dominantBaseline="central"
                      paintOrder="stroke"
                    >
                      {a.label}
                    </text>
                    <text
                      x={px + (coords[2] || 10)}
                      y={py + 1}
                      fontSize={isActive ? 16 : 13}
                      fontWeight={700}
                      fontFamily="'Source Sans Pro','Source Sans 3',sans-serif"
                      fill={isActive ? color : palette.textSecondary}
                      dominantBaseline="central"
                      style={{ transition: "all 0.2s" }}
                    >
                      {a.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Compact region legend below map */}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
        {Object.entries(regionColors).map(([region, color]) => (
          <div key={region} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: color,
              }}
            />
            <span style={{ fontSize: 10, color: palette.textSecondary }}>{region}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// [lon, lat, xOffset] — hand-tuned to avoid overlap (in viewBox coordinates)
const AGENCY_LABEL_COORDS = {
  FDA: [-97, 38, 10],
  HC: [-105, 58, 10],
  ANVISA: [-50, -14, 10],
  EMA: [15, 52, 10],
  MHRA: [-4, 55, -65],
  SWISS: [8, 47, -85],
  PMDA: [140, 36, 10],
  NMPA: [100, 32, -55],
  TGA: [134, -26, 10],
  MFDS: [127, 42, 10],
  SFDA: [45, 24, 10],
  TFDA: [121, 22, 10],
};
