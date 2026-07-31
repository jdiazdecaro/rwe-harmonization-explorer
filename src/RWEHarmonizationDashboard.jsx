import { useState, useEffect, useRef, useMemo, useCallback, Fragment, createContext, useContext } from "react";
import { fetchDashboardData } from "./fetchAirtableData";
import bakedData from "./data.json";
import WorldMap from "./WorldMap";

// ── Color Palette (Duke-Margolis Brand Guidelines) ─────────────────────
const PALETTE = {
  // Backgrounds & Surfaces
  bg: "#F2F2F2",           // Light Gray — page background
  surface: "#FFFFFF",       // White — card / surface background
  surfaceMuted: "#F2F2F2", // Light Gray — subtle backgrounds, alt rows
  skyBlue: "#D6E8F5",      // Policy Sky Blue — pull quote/callout fills
  border: "#c8cfd7",
  borderLight: "#dce2e8",

  // Text
  textPrimary: "#222222",   // Dark Charcoal — primary body text
  textSecondary: "#666666", // Mid Gray — body text, footnotes
  textMuted: "#666666",     // Mid Gray
  textFaint: "#999999",

  // Primary Brand Colors
  dukeNavy: "#001a57",      // Duke Navy — headers, section bars, logo bg
  dukeBlue: "#1464A0",      // Duke Blue Medium — subheadings, links, active
  skyBlueLight: "#D6E8F5",  // Policy Sky Blue — backgrounds

  // Kept for data viz (teal accent per brand)
  teal0: "#e3f4f5",
  teal1: "#b2dde0",
  teal2: "#7fc4c9",
  teal3: "#4aabb1",
  teal4: "#1A7A8A",         // Teal Accent (brand) — page numbers, decorative
  teal5: "#156470",
  teal6: "#0f4d57",

  // Accent Colors
  amber: "#C8631A",         // Orange-Amber (brand) — sparingly for emphasis
  amberLight: "#f7e0ce",
  red: "#b5281c",
  redLight: "#f8dbd8",
};

const REGION_COLORS = {
  Americas: "#1464A0",      // Duke Blue Medium
  Europe: "#003366",        // Duke Navy
  "Asia-Pacific": "#1A7A8A",// Teal Accent
  MENA: "#C8631A",          // Orange-Amber
};
const REGION_BG = {
  Americas: "#D6E8F5",
  Europe: "#cfd9e8",
  "Asia-Pacific": "#ddf0f2",
  MENA: "#f7e0ce",
};

// ── Data ───────────────────────────────────────────────────────────────
const AGENCIES = [
  { id: "FDA", label: "FDA", full: "Food and Drug Administration", region: "Americas", country: "United States" },
  { id: "EMA", label: "EMA", full: "European Medicines Agency", region: "Europe", country: "European Union" },
  { id: "HC", label: "Health Canada", full: "Health Canada", region: "Americas", country: "Canada" },
  { id: "PMDA", label: "PMDA", full: "Pharmaceuticals and Medical Devices Agency", region: "Asia-Pacific", country: "Japan" },
  { id: "MHRA", label: "MHRA", full: "Medicines and Healthcare products Regulatory Agency", region: "Europe", country: "United Kingdom" },
  { id: "NMPA", label: "NMPA", full: "National Medical Products Administration", region: "Asia-Pacific", country: "China" },
  { id: "TGA", label: "TGA", full: "Therapeutic Goods Administration", region: "Asia-Pacific", country: "Australia" },
  { id: "ANVISA", label: "ANVISA", full: "Agência Nacional de Vigilância Sanitária", region: "Americas", country: "Brazil" },
  { id: "MFDS", label: "MFDS", full: "Ministry of Food and Drug Safety", region: "Asia-Pacific", country: "South Korea" },
  { id: "SFDA", label: "SFDA", full: "Saudi Food and Drug Authority", region: "MENA", country: "Saudi Arabia" },
  { id: "SWISS", label: "Swissmedic", full: "Swissmedic", region: "Europe", country: "Switzerland" },
  { id: "TFDA", label: "TFDA", full: "Taiwan FDA", region: "Asia-Pacific", country: "Taiwan" },
];

const DEFINITION_CONCEPTS = [
  { id: "quality", label: "Quality" },
  { id: "reliability", label: "Reliability" },
  { id: "relevance", label: "Relevance" },
  { id: "fit_purpose", label: "Fit for Purpose" },
  { id: "fit_use", label: "Fit for Use" },
  { id: "rwd", label: "Real-World Data" },
  { id: "rwe", label: "Real-World Evidence" },
];

const DEFINITION_MATRIX = {
  FDA:   { quality: "defined", reliability: "defined", relevance: "defined", fit_purpose: "defined", fit_use: "defined", rwd: "defined", rwe: "defined" },
  EMA:   { quality: "defined", reliability: "defined", relevance: "defined", fit_purpose: "defined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  HC:    { quality: "informal", reliability: "undetermined", relevance: "undetermined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  PMDA:  { quality: "undetermined", reliability: "undetermined", relevance: "undetermined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "undetermined", rwe: "undetermined" },
  MHRA:  { quality: "defined", reliability: "undetermined", relevance: "undetermined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  NMPA:  { quality: "informal", reliability: "informal", relevance: "informal", fit_purpose: "defined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  TGA:   { quality: "defined", reliability: "undetermined", relevance: "undetermined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "cites_other", rwe: "defined" },
  ANVISA:{ quality: "defined", reliability: "undetermined", relevance: "defined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  MFDS:  { quality: "undetermined", reliability: "informal", relevance: "informal", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  SFDA:  { quality: "defined", reliability: "undetermined", relevance: "undetermined", fit_purpose: "defined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  SWISS: { quality: "undetermined", reliability: "undetermined", relevance: "undetermined", fit_purpose: "undetermined", fit_use: "undetermined", rwd: "defined", rwe: "defined" },
  TFDA:  { quality: "defined", reliability: "defined", relevance: "defined", fit_purpose: "undetermined", fit_use: "defined", rwd: "defined", rwe: "defined" },
};

const DEFINITION_EXCERPTS = {
  FDA: {
    rwd: "\"Data relating to patient health status and/or the delivery of health care routinely collected from a variety of sources.\"",
    rwe: "\"Real-World Evidence (RWE) is the clinical evidence about the usage and potential benefits or risks of a medical product derived from analysis of RWD.\"",
    quality: "\"Sponsors should consider the methods and systems used to help ensure data quality, including data accuracy, completeness, and the transformation of data...\"",
    reliability: "\"The term reliability includes data accuracy, completeness, and provenance, and also includes the adequacy of the processes and systems used to collect and store data.\"",
    relevance: "\"The term relevance includes the availability of key data elements (exposures, outcomes, covariates) needed to address the regulatory question.\"",
    fit_purpose: "\"If sponsors include RWE in support of regulatory submissions, they should include a discussion of data relevance and reliability...\"",
    fit_use: "\"Whether registry data are fit-for-use in regulatory decision-making depends on the clinical context and the specific regulatory question being addressed.\"",
  },
  EMA: {
    rwd: "\"Real-World Data are routinely collected data relating to patient health status or the delivery of health care from a variety of sources other than clinical trials.\"",
    rwe: "\"Real-World Evidence is evidence derived from the analysis of RWD.\"",
    quality: "\"Data quality is defined as fitness for purpose for users' needs in relation to the study objectives, including accuracy, completeness, and consistency.\"",
    reliability: "\"EMA defines reliability as it relates to Data Quality. 'The dimension that covers how closely the data represent the truth about the real-world phenomena they describe.'\"",
    relevance: "\"EMA defines relevance as it relates to Data Quality. 'For the purpose of Data Quality assessment, relevance captures the degree to which data meet current and potential needs.'\"",
    fit_purpose: "\"Possessing all required data quality characteristics ensures the data are fit for purpose for regulatory use.\"",
  },
  HC: {
    rwd: "\"RWD are data relating to patient status and/or the delivery of health care collected outside of conventional clinical trials.\"",
    rwe: "\"RWE is defined as the evidence surrounding the usage and potential benefits or risks of a medical product derived from analysis of RWD.\"",
    quality: "Not formally defined but stated as having characteristics including accuracy, completeness, and consistency of data collection processes.",
  },
  NMPA: {
    rwd: "\"RWD refer to a variety of data, collected through regular practice, reflecting the real status of patients' diagnosis, treatment and prognosis.\"",
    rwe: "\"Real-World Evidence (RWE) refers to the clinical evidence on the use and potential benefits/risks of medical products derived from the analysis of RWD.\"",
    quality: "Not formally defined but NMPA notes that \"quality assurance approaches include data cleaning, logic verification, consistency checking, and completeness evaluation.\"",
    reliability: "Not formally defined but is stated as being mainly evaluated in terms of data accuracy, completeness, and transparency of data collection.",
    relevance: "Not formally defined but stated as: \"To assess whether RWD are closely relevant to the research objectives and regulatory decision-making.\"",
    fit_purpose: "\"The fitness (fit-for-purpose) assessment should be conducted based on specific study objectives and regulatory requirements.\"",
  },
  MHRA: {
    quality: "\"The quality of the source data should be understood including its provenance, completeness, accuracy, and potential biases.\"",
    rwd: "\"Data relating to patient health status or delivery of health care routinely collected from a variety of sources.\"",
    rwe: "\"There are vast amounts of data being collected on patients, for a variety of purposes... evidence derived from the analysis of such data.\"",
  },
  TGA: {
    quality: "\"Assessment of evidence quality should consider study type, study design, data quality, and analysis methods.\"",
    rwd: "TGA cites FDA's definition of RWD: \"data relating to patient health status and/or the delivery of health care routinely collected...\"",
    rwe: "\"RWE: Data regarding the usage, or the potential benefits or risks, of a medical product derived from sources other than traditional clinical trials.\"",
  },
  ANVISA: {
    quality: "\"High quality data is data that presents, in every aspect of its origin, clarity and transparency in its collection, processing and analysis methods.\"",
    relevance: "\"The relevance of real-world data is determined if the data is robust and reliable enough to answer the regulatory question at hand.\"",
    rwd: "\"For the purposes of this document, real-world data is considered to be data routinely collected from a variety of sources...\"",
    rwe: "\"Real-world evidence is evidence regarding the usage and potential benefits or risks of a medical product.\"",
  },
  MFDS: {
    rwd: "\"Real world data is a term that embraces various types of medical information collected outside of conventional clinical trials.\"",
    rwe: "\"Real World Evidence is evidence derived from analyzing real world data to understand the use and risks/benefits of medical products.\"",
    reliability: "Not formally defined but includes considerations around data accuracy, traceability, and source documentation.",
    relevance: "Not formally defined but includes considerations around alignment with study objectives and availability of necessary variables.",
  },
  SFDA: {
    quality: "\"Data quality is a key element for optimizing the utilization of real-world data in regulatory decision-making.\"",
    fit_purpose: "\"Fit-for-purpose assessment should consider whether the data source can adequately address the specific regulatory question.\"",
    rwd: "\"Real-World Data is defined as any data routinely collected from a variety of sources outside of traditional clinical trials.\"",
    rwe: "\"Real-World Evidence (RWE) is the clinical evidence about the usage and potential benefits or risks derived from analysis of RWD.\"",
  },
  SWISS: {
    rwd: "\"Swissmedic considers real world data (RWD) as all data other than those collected in conventional randomized controlled trials.\"",
    rwe: "\"Real world evidence (RWE) is defined as information on health care that is derived from multiple sources outside of typical clinical research settings.\"",
  },
  TFDA: {
    quality: "\"Data quality must take into account completeness, accuracy, consistency, and timeliness of the data.\"",
    reliability: "\"The reliability of real-world data is affected by the source and the methods used for data capture, storage, and curation.\"",
    relevance: "\"Data relevance refers to the degree of fit between the collected data and the research question being addressed.\"",
    fit_use: "\"The fit for use refers to whether the real-world data collected can be used to adequately address the specific study question.\"",
    rwd: "\"Real-world data refers to routinely collected data related to the patients' health status or healthcare delivery.\"",
    rwe: "\"Real-world evidence refers to clinical evidence generated from the analysis of RWD.\"",
  },
};

const STATUS_CONFIG = {
  defined:     { bg: PALETTE.teal4, bgLight: PALETTE.teal0, label: "Formally Defined", short: "", textColor: "#fff" },
  informal:    { bg: PALETTE.amber, bgLight: PALETTE.amberLight, label: "Informal / Partial", short: "", textColor: "#fff" },
  cites_other: { bg: PALETTE.dukeBlue, bgLight: PALETTE.skyBlue, label: "Cites Other Agency", short: "", textColor: "#fff" },
  undetermined:{ bg: "#c8cfd7", bgLight: "#F2F2F2", label: "Undetermined", short: "N/A", textColor: "#666666" },
};

const STANCE_DIMENSIONS = [
  {
    id: "ext_controls", label: "External Comparators",
    positions: [
      { id: "ec1", label: "Explicit guidance issued", maturity: 0, agencies: ["FDA", "EMA", "PMDA", "HC", "TGA"] },
      { id: "ec2", label: "Accepted, limited guidance", maturity: 1, agencies: ["MHRA", "TFDA", "SFDA", "ANVISA"] },
      { id: "ec3", label: "No formal framework", maturity: 2, agencies: ["NMPA", "MFDS", "SWISS"] },
    ],
  },
  {
    id: "data_quality", label: "Data Quality Framework",
    positions: [
      { id: "dq1", label: "Structured framework", maturity: 0, agencies: ["FDA", "EMA", "HC", "MHRA", "TFDA"] },
      { id: "dq2", label: "General principles", maturity: 1, agencies: ["PMDA", "TGA", "ANVISA", "SFDA", "NMPA"] },
      { id: "dq3", label: "Under development", maturity: 2, agencies: ["MFDS", "SWISS"] },
    ],
  },
  {
    id: "transparency", label: "Study Registration & Transparency",
    positions: [
      { id: "tr1", label: "Protocol registration expected", maturity: 0, agencies: ["FDA", "EMA", "HC"] },
      { id: "tr2", label: "Encouraged, not mandated", maturity: 1, agencies: ["PMDA", "TGA", "MHRA", "TFDA"] },
      { id: "tr3", label: "Not addressed", maturity: 2, agencies: ["NMPA", "ANVISA", "MFDS", "SFDA", "SWISS"] },
    ],
  },
  {
    id: "causal_methods", label: "Causal Inference Methods",
    positions: [
      { id: "cm1", label: "Detailed guidance", maturity: 0, agencies: ["FDA", "EMA", "HC"] },
      { id: "cm2", label: "General recommendations", maturity: 1, agencies: ["PMDA", "TGA", "MHRA", "TFDA", "ANVISA"] },
      { id: "cm3", label: "Defers to ICH / silent", maturity: 2, agencies: ["NMPA", "MFDS", "SFDA", "SWISS"] },
    ],
  },
  {
    id: "ich_alignment", label: "ICH M-14 Alignment",
    positions: [
      { id: "ic1", label: "Active ICH member", maturity: 0, agencies: ["FDA", "EMA", "PMDA", "HC", "SWISS"] },
      { id: "ic2", label: "Observer / selective adoption", maturity: 1, agencies: ["NMPA", "MHRA", "TGA", "SFDA", "TFDA"] },
      { id: "ic3", label: "References ICH independently", maturity: 2, agencies: ["ANVISA", "MFDS"] },
    ],
  },
];

const MATURITY_COLORS = { 0: PALETTE.teal4, 1: PALETTE.amber, 2: PALETTE.red };

// ── Custom hook: useIsMobile ──────────────────────────────────────────
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Keyboard handler helper ───────────────────────────────────────────
function handleKeyActivate(callback) {
  return (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      callback(e);
    }
  };
}

// ── Data Context (allows sub-components to use Airtable data when available) ──
const DataContext = createContext(null);
function useData() {
  const ctx = useContext(DataContext);
  // Fall back to module-level constants if no context provided
  return {
    AGENCIES: ctx?.AGENCIES || AGENCIES,
    DEFINITION_CONCEPTS: ctx?.DEFINITION_CONCEPTS || DEFINITION_CONCEPTS,
    DEFINITION_MATRIX: ctx?.DEFINITION_MATRIX || DEFINITION_MATRIX,
    DEFINITION_EXCERPTS: ctx?.DEFINITION_EXCERPTS || DEFINITION_EXCERPTS,
    STANCE_DIMENSIONS: ctx?.STANCE_DIMENSIONS || STANCE_DIMENSIONS,
  };
}

// ── Sankey Engine ──────────────────────────────────────────────────────
function computeSankey(dim, cW, cH, agenciesList) {
  const nW = 14, pad = 10, leftPad = 120;
  const nodeH = 30;
  const ag = agenciesList.filter(a => dim.positions.some(p => p.agencies.includes(a.id)));
  const L = ag.map(a => ({ ...a, side: "left" }));
  const R = dim.positions.map((p, i) => ({ id: p.id, label: p.label, count: p.agencies.length, posIndex: i, maturity: p.maturity }));
  const lH = L.length * nodeH + (L.length - 1) * pad, lS = Math.max(0, (cH - lH) / 2);
  L.forEach((n, i) => { n.x = leftPad; n.y = lS + i * (nodeH + pad); n.h = nodeH; n.w = nW; });
  const rH = R.reduce((s, n) => s + n.count * nodeH, 0) + (R.length - 1) * (pad + 8), rS = Math.max(0, (cH - rH) / 2);
  let ry = rS; R.forEach(n => { n.x = cW - nW; n.y = ry; n.h = n.count * nodeH; n.w = nW; ry += n.h + pad + 8; });
  const rO = {}; R.forEach(n => { rO[n.id] = 0; });
  const links = [];
  dim.positions.forEach((p, pi) => {
    p.agencies.forEach(aId => {
      const l = L.find(n => n.id === aId), r = R.find(n => n.id === p.id);
      if (!l || !r) return;
      const h = 26, sy = l.y + l.h / 2, ty = r.y + rO[p.id] + h / 2;
      rO[p.id] += h + 5;
      links.push({ source: l, target: r, sy, ty, height: h, agencyId: aId, posIndex: pi, region: l.region });
    });
  });
  return { leftNodes: L, rightNodes: R, links };
}

function SankeyPath({ link, highlighted, active }) {
  const sx = link.source.x + link.source.w, tx = link.target.x, mx = (sx + tx) / 2, hh = link.height / 2;
  const d = `M${sx},${link.sy - hh} C${mx},${link.sy - hh} ${mx},${link.ty - hh} ${tx},${link.ty - hh} L${tx},${link.ty + hh} C${mx},${link.ty + hh} ${mx},${link.sy + hh} ${sx},${link.sy + hh} Z`;
  const c = REGION_COLORS[link.region] || PALETTE.textMuted;
  const op = active ? (highlighted ? 0.55 : 0.05) : 0.22;
  return <path d={d} fill={c} opacity={op} stroke={highlighted ? c : "none"} strokeWidth={highlighted ? 1.5 : 0} style={{ transition: "opacity 0.2s" }} />;
}

// ── Cell Tooltip (floating popup) ─────────────────────────────────────
function CellTooltip({ data }) {
  if (!data) return null;
  const cfg = STATUS_CONFIG[data.status];
  return (
    <div style={{
      position: "fixed", left: data.x, top: data.y - 14,
      transform: "translate(-50%, -100%)", zIndex: 9999,
      background: PALETTE.surface, border: `1px solid ${PALETTE.dukeBlue}`,
      borderTop: `3px solid ${PALETTE.dukeNavy}`,
      borderRadius: 6, padding: "14px 18px", maxWidth: 420, minWidth: 280,
      boxShadow: "0 8px 30px rgba(0,51,102,0.14), 0 2px 8px rgba(0,0,0,0.06)",
      pointerEvents: "none",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.dukeNavy }}>{data.agency.label}</span>
          <span style={{ fontSize: 12, color: PALETTE.textMuted, marginLeft: 6 }}>— {data.concept.label}</span>
        </div>
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 3, whiteSpace: "nowrap",
          background: cfg.bgLight, color: data.status === "undetermined" ? PALETTE.textMuted : cfg.bg,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ height: 1, background: PALETTE.borderLight, margin: "0 0 10px" }} />

      {/* Definition excerpt or fallback */}
      {data.excerpt ? (
        <div style={{ fontSize: 12.5, lineHeight: 1.65, color: PALETTE.textPrimary, fontStyle: "italic" }}>{data.excerpt}</div>
      ) : (
        <div style={{ fontSize: 12, color: PALETTE.textMuted, fontStyle: "italic" }}>
          {data.status === "undetermined"
            ? "No definition found in published guidance documents for this concept."
            : "Definition excerpt not yet captured in the tracker. Refer to the agency's published guidance for details."}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 9.5, color: PALETTE.textFaint }}>Source: Duke-Margolis Institute for Health Policy, International Harmonization of Real-World Evidence Standards Dashboard</div>

      {/* Arrow pointing down */}
      <div style={{
        position: "absolute", bottom: -7, left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
        width: 12, height: 12, background: PALETTE.surface,
        borderRight: `1px solid ${PALETTE.borderLight}`, borderBottom: `1px solid ${PALETTE.borderLight}`,
      }} />
    </div>
  );
}

// ── Definition Heatmap (HTML table, horizontal headers) ───────────────
function DefinitionHeatmap({ hoveredAgency, lockedAgency, hoveredConcept, lockedConcept, onHoverAgency, onLockAgency, onHoverConcept, onLockConcept, onCellHover, onCellLeave }) {
  const { AGENCIES, DEFINITION_CONCEPTS, DEFINITION_MATRIX, DEFINITION_EXCERPTS } = useData();
  const activeAgency = lockedAgency || hoveredAgency;
  const activeConcept = lockedConcept || hoveredConcept;
  return (
    <div style={{ overflowX: "auto" }}>
      <table role="grid" style={{ borderCollapse: "separate", borderSpacing: "3px 0", fontFamily: "'Source Sans Pro','Source Sans 3',sans-serif", width: "auto" }}>
        <thead>
          <tr role="row">
            <th style={{ width: 100, padding: "8px 8px 10px 0", textAlign: "right" }} />
            {DEFINITION_CONCEPTS.map(c => {
              const isActive = activeConcept === c.id;
              const isLocked = lockedConcept === c.id;
              return (
                <th key={c.id}
                  role="columnheader"
                  tabIndex={0}
                  aria-label={`Filter by concept: ${c.label}`}
                  onMouseEnter={() => { if (!lockedConcept) onHoverConcept(c.id); }}
                  onMouseLeave={() => { if (!lockedConcept) onHoverConcept(null); }}
                  onClick={() => onLockConcept(c.id)}
                  onKeyDown={handleKeyActivate(() => onLockConcept(c.id))}
                  style={{
                    padding: "8px 10px 10px", fontSize: 11.5, fontWeight: 700,
                    color: isActive ? "#fff" : PALETTE.textSecondary,
                    background: isActive ? PALETTE.dukeNavy : "transparent",
                    textAlign: "center", whiteSpace: "nowrap",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: isLocked ? `3px solid ${PALETTE.teal4}` : `2px solid ${PALETTE.border}`,
                    minWidth: 95, cursor: "pointer",
                    borderRadius: isActive ? "5px 5px 0 0" : 0,
                    transition: "all 0.15s",
                  }}>
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {AGENCIES.map((a, ai) => {
            const isRowActive = activeAgency === a.id;
            return (
              <tr key={a.id}
                role="row"
                tabIndex={0}
                aria-label={`Agency: ${a.label} (${a.full})`}
                onMouseEnter={() => { if (!lockedAgency) onHoverAgency(a.id); }}
                onMouseLeave={() => { if (!lockedAgency) onHoverAgency(null); }}
                onClick={() => onLockAgency(a.id)}
                onKeyDown={handleKeyActivate(() => onLockAgency(a.id))}
                style={{
                  background: isRowActive ? REGION_BG[a.region] : (ai % 2 === 0 ? PALETTE.surfaceMuted : PALETTE.surface),
                  transition: "background 0.15s",
                  cursor: "pointer",
                  borderBottom: `1px solid ${PALETTE.borderLight}`,
                }}>
                <td role="rowheader" style={{
                  padding: "6px 10px 6px 0", textAlign: "right", fontSize: 12.5,
                  fontWeight: isRowActive ? 700 : 500,
                  color: isRowActive ? PALETTE.textPrimary : PALETTE.textSecondary,
                  whiteSpace: "nowrap", transition: "color 0.15s",
                }}>
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: 2,
                    background: REGION_COLORS[a.region], opacity: isRowActive ? 1 : 0.45,
                    marginRight: 7, verticalAlign: "middle", transition: "opacity 0.15s",
                  }} />
                  {a.label}
                </td>
                {DEFINITION_CONCEPTS.map(c => {
                  const status = DEFINITION_MATRIX[a.id]?.[c.id] || "undetermined";
                  const cfg = STATUS_CONFIG[status];
                  const isColActive = activeConcept === c.id;
                  const dimmed = (activeAgency && !isRowActive) || (activeConcept && !isColActive);
                  const highlighted = (isRowActive && isColActive);
                  const excerpt = DEFINITION_EXCERPTS[a.id]?.[c.id];
                  return (
                    <td key={c.id}
                      role="gridcell"
                      tabIndex={0}
                      aria-label={`${a.label} ${c.label}: ${cfg.label}`}
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        onCellHover({ agency: a, concept: c, status, excerpt, x: r.left + r.width / 2, y: r.top });
                      }}
                      onMouseLeave={onCellLeave}
                      onKeyDown={handleKeyActivate((e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        onCellHover({ agency: a, concept: c, status, excerpt, x: r.left + r.width / 2, y: r.top });
                      })}
                      style={{
                        textAlign: "center", padding: "4px 3px", cursor: "pointer",
                        background: isColActive ? "rgba(0,51,102,0.05)" : "transparent",
                        transition: "background 0.15s",
                      }}>
                      <div style={{
                        background: cfg.bg,
                        opacity: dimmed ? 0.12 : (status === "undetermined" ? 0.22 : 0.78),
                        borderRadius: 5, padding: "6px 4px", transition: "opacity 0.2s",
                        outline: highlighted ? `2px solid ${PALETTE.dukeNavy}` : "none",
                        outlineOffset: 1,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          fontFamily: "'Source Code Pro',monospace",
                          color: status === "undetermined" ? "#343a40" : "#fff",
                          opacity: dimmed ? 0.35 : (status === "undetermined" ? 0.8 : 1),
                        }}>
                          {cfg.short}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Agency Crosscut Panel ─────────────────────────────────────────────
function AgencyCrosscut({ agencyId }) {
  const { AGENCIES, DEFINITION_CONCEPTS, DEFINITION_MATRIX, DEFINITION_EXCERPTS, STANCE_DIMENSIONS } = useData();
  const agency = AGENCIES.find(a => a.id === agencyId);
  if (!agency) return null;
  const counts = { defined: 0, informal: 0, cites_other: 0, undetermined: 0 };
  DEFINITION_CONCEPTS.forEach(c => { counts[DEFINITION_MATRIX[agencyId]?.[c.id] || "undetermined"]++; });
  const definedPct = Math.round(((counts.defined + (counts.cites_other || 0)) + counts.informal * 0.5) / DEFINITION_CONCEPTS.length * 100);

  return (
    <div style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeSlideIn 0.3s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.dukeNavy }}>{agency.label}</div>
          <div style={{ fontSize: 11, color: PALETTE.textMuted }}>{agency.full}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, padding: "2px 8px", borderRadius: 10, background: REGION_BG[agency.region], fontSize: 10, fontWeight: 600, color: REGION_COLORS[agency.region] }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: REGION_COLORS[agency.region] }} />
            {agency.country}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: definedPct >= 60 ? PALETTE.teal4 : definedPct >= 30 ? PALETTE.amber : PALETTE.red, fontFamily: "'Source Code Pro',monospace" }}>
            {definedPct}%
          </div>
          <div style={{ fontSize: 9, color: PALETTE.textMuted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Coverage</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: PALETTE.textMuted, lineHeight: 1.5, marginBottom: 12, padding: "6px 8px", background: PALETTE.surfaceMuted, borderRadius: 4, border: `1px solid ${PALETTE.borderLight}` }}>
        <strong>Coverage</strong> = (Formally Defined × 1.0 + Cites Other × 1.0 + Informal × 0.5) ÷ {DEFINITION_CONCEPTS.length} concepts
      </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PALETTE.dukeBlue, marginBottom: 6, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>Key Definitions</div>
      {DEFINITION_CONCEPTS.map(c => {
        const status = DEFINITION_MATRIX[agencyId]?.[c.id] || "undetermined";
        const cfg = STATUS_CONFIG[status];
        const excerpt = DEFINITION_EXCERPTS[agencyId]?.[c.id];
        return (
          <div key={c.id} style={{ padding: "5px 0", borderBottom: `1px solid ${PALETTE.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: PALETTE.textPrimary }}>{c.label}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 3, background: cfg.bgLight, color: status === "undetermined" ? PALETTE.textMuted : cfg.bg }}>{cfg.label}</span>
            </div>
            {excerpt && <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 3, lineHeight: 1.45, fontStyle: "italic" }}>{excerpt}</div>}
          </div>
        );
      })}

      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.dukeBlue, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 14, marginBottom: 6, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>Regulatory Positions</div>
      {STANCE_DIMENSIONS.map(d => {
        const pos = d.positions.find(p => p.agencies.includes(agencyId));
        if (!pos) return null;
        return (
          <div key={d.id} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: PALETTE.textMuted }}>{d.label}</div>
            <div style={{ fontSize: 11, color: MATURITY_COLORS[pos.maturity], fontWeight: 600, marginTop: 1 }}>{pos.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Concept Crosscut Panel ────────────────────────────────────────────
function ConceptCrosscut({ conceptId }) {
  const { AGENCIES, DEFINITION_CONCEPTS, DEFINITION_MATRIX, DEFINITION_EXCERPTS } = useData();
  const concept = DEFINITION_CONCEPTS.find(c => c.id === conceptId);
  if (!concept) return null;

  const counts = { defined: 0, informal: 0, cites_other: 0, undetermined: 0 };
  AGENCIES.forEach(a => {
    const s = DEFINITION_MATRIX[a.id]?.[conceptId] || "undetermined";
    counts[s]++;
  });
  const total = AGENCIES.length;

  // Convergence: how many agencies share the most common non-undetermined status
  const substantive = [counts.defined, counts.informal, counts.cites_other];
  const maxSubstantive = Math.max(...substantive);
  const convergencePct = maxSubstantive > 0 ? Math.round((maxSubstantive / total) * 100) : 0;

  const statusBreakdown = [
    { key: "defined", label: "Formally Defined", count: counts.defined, color: PALETTE.teal4, bgColor: PALETTE.teal0 },
    { key: "informal", label: "Informal / Partial", count: counts.informal, color: PALETTE.amber, bgColor: PALETTE.amberLight },
    { key: "cites_other", label: "Cites Other Agency", count: counts.cites_other, color: PALETTE.dukeBlue, bgColor: PALETTE.skyBlue },
    { key: "undetermined", label: "Undetermined", count: counts.undetermined, color: "#999999", bgColor: "#F2F2F2" },
  ];

  return (
    <div style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PALETTE.textMuted, marginBottom: 3 }}>Concept Profile</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: PALETTE.dukeNavy }}>{concept.label}</div>
      </div>

      {/* Convergence score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: PALETTE.surfaceMuted, borderRadius: 6, border: `1px solid ${PALETTE.borderLight}`, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.textMuted }}>Definitional Convergence</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 2, lineHeight: 1.4 }}>
            % of agencies sharing the most common status
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Source Code Pro',monospace", color: convergencePct >= 60 ? PALETTE.teal5 : convergencePct >= 40 ? PALETTE.amber : PALETTE.red }}>
          {convergencePct}%
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.dukeBlue, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>
        Status Breakdown ({total} agencies)
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        {statusBreakdown.filter(s => s.count > 0).map(s => (
          <div key={s.key} style={{
            width: `${(s.count / total) * 100}%`,
            background: s.color,
            opacity: s.key === "undetermined" ? 0.35 : 0.8,
            transition: "width 0.3s",
          }} />
        ))}
      </div>

      {/* Stats */}
      {statusBreakdown.map(s => (
        <div key={s.key} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "6px 0", borderBottom: `1px solid ${PALETTE.borderLight}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, opacity: s.key === "undetermined" ? 0.35 : 0.8 }} />
            <span style={{ fontSize: 11.5, color: PALETTE.textPrimary }}>{s.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Source Code Pro',monospace", color: s.count > 0 ? PALETTE.textPrimary : PALETTE.textFaint }}>
              {s.count}
            </span>
            <span style={{ fontSize: 11, color: PALETTE.textMuted, fontFamily: "'Source Code Pro',monospace", minWidth: 36, textAlign: "right" }}>
              {Math.round((s.count / total) * 100)}%
            </span>
          </div>
        </div>
      ))}

      {/* Agency list per status */}
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.dukeBlue, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 14, marginBottom: 6, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>
        Per-Agency Detail
      </div>
      {AGENCIES.map(a => {
        const status = DEFINITION_MATRIX[a.id]?.[conceptId] || "undetermined";
        const cfg = STATUS_CONFIG[status];
        const excerpt = DEFINITION_EXCERPTS[a.id]?.[conceptId];
        return (
          <div key={a.id} style={{ padding: "5px 0", borderBottom: `1px solid ${PALETTE.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: REGION_COLORS[a.region], display: "inline-block" }} />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: PALETTE.textPrimary }}>{a.label}</span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 3, background: cfg.bgLight, color: status === "undetermined" ? PALETTE.textMuted : cfg.bg }}>{cfg.label}</span>
            </div>
            {excerpt && <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 3, lineHeight: 1.45, fontStyle: "italic", paddingLeft: 11 }}>{excerpt}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Position Crosscut Panel (Sankey cluster) ──────────────────────────
function PositionCrosscut({ dimension, positionIndex }) {
  const { AGENCIES } = useData();
  if (!dimension || positionIndex === null || positionIndex === undefined) return null;
  const position = dimension.positions[positionIndex];
  if (!position) return null;

  const total = AGENCIES.length;
  const clusterSize = position.agencies.length;
  const clusterPct = Math.round((clusterSize / total) * 100);

  // "Most developed" convergence for this dimension
  const mostDeveloped = dimension.positions.find(p => p.maturity === 0);
  const mostDevCount = mostDeveloped ? mostDeveloped.agencies.length : 0;
  const mostDevPct = Math.round((mostDevCount / total) * 100);

  const maturityLabels = { 0: "Most developed", 1: "Intermediate", 2: "Least developed" };
  const maturityLabel = maturityLabels[position.maturity] || "Unknown";

  return (
    <div style={{ background: PALETTE.surface, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeSlideIn 0.3s ease-out" }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PALETTE.textMuted, marginBottom: 3 }}>Cluster Profile</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.dukeNavy, lineHeight: 1.3 }}>{position.label}</div>
        <div style={{ fontSize: 11, color: PALETTE.textMuted, marginTop: 3 }}>{dimension.label}</div>
      </div>

      {/* Maturity badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, marginBottom: 14,
        padding: "3px 10px", borderRadius: 4,
        background: position.maturity === 0 ? PALETTE.teal0 : position.maturity === 1 ? PALETTE.amberLight : "#fce4e4",
        color: MATURITY_COLORS[position.maturity], fontSize: 10.5, fontWeight: 700,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: MATURITY_COLORS[position.maturity] }} />
        {maturityLabel}
      </div>

      {/* Cluster size */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: PALETTE.surfaceMuted, borderRadius: 6, border: `1px solid ${PALETTE.borderLight}`, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.textMuted }}>Cluster Size</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 2 }}>Agencies sharing this position</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Source Code Pro',monospace", color: MATURITY_COLORS[position.maturity] }}>
            {clusterPct}%
          </span>
          <div style={{ fontSize: 10, color: PALETTE.textMuted }}>{clusterSize} of {total}</div>
        </div>
      </div>

      {/* Most-developed convergence */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: PALETTE.surfaceMuted, borderRadius: 6, border: `1px solid ${PALETTE.borderLight}`, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PALETTE.textMuted }}>Most-Developed Convergence</div>
          <div style={{ fontSize: 10, color: PALETTE.textMuted, marginTop: 2 }}>
            Agencies at highest maturity for {dimension.label}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Source Code Pro',monospace", color: mostDevPct >= 40 ? PALETTE.teal5 : mostDevPct >= 25 ? PALETTE.amber : PALETTE.red }}>
            {mostDevPct}%
          </span>
          <div style={{ fontSize: 10, color: PALETTE.textMuted }}>{mostDevCount} of {total}</div>
        </div>
      </div>

      {/* Agencies in this cluster */}
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, borderBottom: `1px solid ${PALETTE.borderLight}`, paddingBottom: 4 }}>
        Agencies in this Cluster
      </div>
      {position.agencies.map(aId => {
        const a = AGENCIES.find(ag => ag.id === aId);
        if (!a) return null;
        return (
          <div key={aId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: `1px solid ${PALETTE.borderLight}` }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: REGION_COLORS[a.region], display: "inline-block" }} />
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 500, color: PALETTE.textPrimary }}>{a.label}</div>
              <div style={{ fontSize: 10, color: PALETTE.textMuted }}>{a.country}</div>
            </div>
          </div>
        );
      })}

      {/* All positions in this dimension for context */}
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 14, marginBottom: 6, borderBottom: `1px solid ${PALETTE.borderLight}`, paddingBottom: 4 }}>
        All Positions — {dimension.label}
      </div>
      {dimension.positions.map((p, pi) => {
        const isCurrent = pi === positionIndex;
        return (
          <div key={p.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "5px 8px", marginBottom: 2, borderRadius: 4,
            background: isCurrent ? (p.maturity === 0 ? PALETTE.teal0 : p.maturity === 1 ? PALETTE.amberLight : "#fce4e4") : "transparent",
            border: isCurrent ? `1px solid ${MATURITY_COLORS[p.maturity]}33` : "1px solid transparent",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MATURITY_COLORS[p.maturity], display: "inline-block" }} />
              <span style={{ fontSize: 11, color: PALETTE.textPrimary, fontWeight: isCurrent ? 700 : 400 }}>{p.label}</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "'Source Code Pro',monospace", fontWeight: 600, color: PALETTE.textMuted }}>
              {p.agencies.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function RWEHarmonizationDashboard() {
  // ── Airtable data loading ──
  const [liveData, setLiveData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardData()
      .then((data) => { if (!cancelled) { setLiveData(data); setDataLoading(false); } })
      .catch((err) => {
        console.warn("Airtable fetch failed, using hardcoded fallback:", err);
        if (!cancelled) { setDataError(err); setDataLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  // Data source priority:
  //   1. liveData    — live Airtable fetch (local dev with .env credentials)
  //   2. bakedData   — build-time Airtable snapshot (src/data.json, refreshed on deploy)
  //   3. hardcoded   — last-resort constants baked into this component
  const agencies = liveData?.AGENCIES || bakedData?.AGENCIES || AGENCIES;
  const definitionConcepts = liveData?.DEFINITION_CONCEPTS || bakedData?.DEFINITION_CONCEPTS || DEFINITION_CONCEPTS;
  const definitionMatrix = liveData?.DEFINITION_MATRIX || bakedData?.DEFINITION_MATRIX || DEFINITION_MATRIX;
  const definitionExcerpts = liveData?.DEFINITION_EXCERPTS || bakedData?.DEFINITION_EXCERPTS || DEFINITION_EXCERPTS;
  const stanceDimensions = liveData?.STANCE_DIMENSIONS || bakedData?.STANCE_DIMENSIONS || STANCE_DIMENSIONS;

  const [view, setView] = useState("definitions");
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [hoveredAgency, setHoveredAgency] = useState(null);
  const [lockedAgency, setLockedAgency] = useState(null);
  const [hoveredConcept, setHoveredConcept] = useState(null);
  const [lockedConcept, setLockedConcept] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const [lockedPosition, setLockedPosition] = useState(null);
  const [cellTooltip, setCellTooltip] = useState(null);
  const containerRef = useRef(null);
  const [chartW, setChartW] = useState(480);

  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile(900);
  const isNarrow = useIsMobile(1080); // map stacks below heatmap under 1080px

  // View transition key for fade effect
  const [viewTransitionKey, setViewTransitionKey] = useState(0);

  // Default selectedDimension once data is available
  const effectiveDimension = selectedDimension || (stanceDimensions[0]?.id ?? null);

  // Active states = locked takes priority over hovered
  const activeAgency = lockedAgency || hoveredAgency;
  const activeConcept = lockedConcept || hoveredConcept;
  const activePosition = lockedPosition !== null ? lockedPosition : hoveredPosition;

  // Mutually exclusive locks
  const handleLockAgency = useCallback((id) => {
    setLockedAgency(prev => prev === id ? null : id);
    setLockedConcept(null);
    setLockedPosition(null);
  }, []);
  const handleLockConcept = useCallback((id) => {
    setLockedConcept(prev => prev === id ? null : id);
    setLockedAgency(null);
    setLockedPosition(null);
  }, []);
  const handleLockPosition = useCallback((idx) => {
    setLockedPosition(prev => prev === idx ? null : idx);
    setLockedAgency(null);
    setLockedConcept(null);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setChartW(Math.max(380, el.getBoundingClientRect().width - 16));
    const obs = new ResizeObserver(entries => { setChartW(Math.max(380, entries[0].contentRect.width - 16)); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [dataLoading]);

  // Close sidebar on mobile by default, open on desktop
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const dimension = stanceDimensions.find(d => d.id === effectiveDimension);
  const agencyCount = dimension ? agencies.filter(a => dimension.positions.some(p => p.agencies.includes(a.id))).length : 0;
  const chartH = Math.max(480, agencyCount * 40 + 20);
  const sankeyW = Math.max(300, chartW - 220);
  const layout = useMemo(() => dimension ? computeSankey(dimension, sankeyW, chartH, agencies) : { leftNodes: [], rightNodes: [], links: [] }, [dimension, sankeyW, chartH, agencies]);
  const isActive = activeAgency !== null || activePosition !== null;

  // Handle view switching with transition
  const handleViewSwitch = useCallback((newView) => {
    setView(newView);
    setViewTransitionKey(prev => prev + 1);
    setHoveredAgency(null);
    setLockedAgency(null);
    setLockedConcept(null);
    setHoveredConcept(null);
    setHoveredPosition(null);
    setLockedPosition(null);
    setCellTooltip(null);
  }, []);

  // Data context value for sub-components
  const dataCtx = useMemo(() => ({
    AGENCIES: agencies,
    DEFINITION_CONCEPTS: definitionConcepts,
    DEFINITION_MATRIX: definitionMatrix,
    DEFINITION_EXCERPTS: definitionExcerpts,
    STANCE_DIMENSIONS: stanceDimensions,
  }), [agencies, definitionConcepts, definitionMatrix, definitionExcerpts, stanceDimensions]);

  // Loading state
  if (dataLoading) {
    return (
      <div style={{ fontFamily: "'Source Sans Pro','Source Sans 3','Segoe UI',sans-serif", background: PALETTE.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: PALETTE.dukeNavy, marginBottom: 8 }}>Loading dashboard data...</div>
          <div style={{ fontSize: 12, color: PALETTE.textMuted }}>Fetching from Airtable</div>
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={dataCtx}>
    <div style={{ fontFamily: "'Source Sans Pro','Source Sans 3','Segoe UI',sans-serif", background: PALETTE.bg, color: PALETTE.textPrimary, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Data source indicator — shown only when connected live to Airtable in
          local dev. The public build serves a current build-time snapshot, so
          no "offline" banner is shown there. */}
      {liveData && (
        <div style={{ background: PALETTE.teal4, color: "#fff", textAlign: "center", padding: "3px 0", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>
          LIVE DATA — Connected to Airtable
        </div>
      )}
      {/* Injected keyframes and global styles */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rwe-focus-visible:focus-visible {
          outline: 2px solid ${PALETTE.dukeBlue};
          outline-offset: 2px;
        }
        .rwe-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          z-index: 10000;
          background: ${PALETTE.dukeNavy};
          color: #fff;
          padding: 8px 16px;
          font-size: 13px;
          text-decoration: none;
          border-radius: 0 0 4px 0;
        }
        .rwe-skip-link:focus {
          left: 0;
        }
        @media (max-width: 899px) {
          .rwe-sidebar-overlay {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 310px !important;
            max-width: 85vw !important;
            z-index: 1000 !important;
            box-shadow: -4px 0 20px rgba(0,0,0,0.18) !important;
            transition: transform 0.3s ease !important;
          }
          .rwe-sidebar-closed {
            transform: translateX(100%) !important;
          }
          .rwe-sidebar-open {
            transform: translateX(0) !important;
          }
        }
      `}</style>

      {/* Skip to content link */}
      <a href="#rwe-main-content" className="rwe-skip-link">Skip to main content</a>

      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Floating tooltip for heatmap cells */}
      <CellTooltip data={cellTooltip} />

      {/* ── Header Banner ───────────────────────────── */}
      <div style={{ background: PALETTE.dukeNavy, padding: "0 0 0", position: "relative" }}>

        {/* ── Top identity bar: Logo + Prototype badge ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 28px 14px" }}>
          {/* Duke-Margolis Logo */}
          <img
            src={`${import.meta.env.BASE_URL}duke-margolis-logo.png`}
            alt="Duke Margolis Institute for Health Policy"
            style={{ height: 88, display: "block" }}
          />

          {/* Prototype badge — top-right per layout */}
          <div style={{ textAlign: "right" }}>
            <div style={{
              background: PALETTE.amber, color: "#fff",
              fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "4px 12px", borderRadius: 3,
            }}>
              Prototype
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.40)", marginTop: 4, fontStyle: "italic" }}>
              Best viewed on desktop
            </div>
          </div>
        </div>

        {/* ── Document title block ── */}
        <div style={{ padding: "16px 28px 0" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#FFFFFF", lineHeight: 1.3, fontFamily: "'Source Sans Pro',sans-serif" }}>
            International Regulatory Real-World Evidence Standards
          </h1>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", margin: "7px 0 0", maxWidth: 660, lineHeight: 1.55 }}>
            Mapping key definitions and regulatory positions across {agencies.length} national regulatory agencies. Data sourced from the Duke-Margolis Institute for Health Policy's International Harmonization of Real-World Evidence Standards Dashboard.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 0, marginTop: 18, paddingLeft: 28, flexWrap: "wrap" }}>
          {[{ id: "definitions", label: "Key Definitions Heatmap" }, { id: "stances", label: "Regulatory Positions" }].map(v => (
            <button key={v.id} onClick={() => handleViewSwitch(v.id)}
              style={{
                padding: "9px 22px", fontSize: 12.5, fontWeight: view === v.id ? 700 : 500,
                fontFamily: "'Source Sans Pro',sans-serif",
                letterSpacing: view === v.id ? "0.02em" : 0,
                background: view === v.id ? PALETTE.surface : "transparent",
                color: view === v.id ? PALETTE.dukeNavy : "rgba(255,255,255,0.62)",
                border: "none",
                borderRadius: view === v.id ? "5px 5px 0 0" : 0,
                cursor: "pointer", transition: "all 0.2s",
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────── */}
      <div id="rwe-main-content" style={{ display: "flex", flexWrap: (view === "definitions" && isNarrow) ? "wrap" : "nowrap", minHeight: 500, flex: 1, position: "relative" }}>

        {/* ── Main visualization area ── */}
        <div ref={containerRef} style={{ flex: (view === "definitions" && isNarrow) ? "1 1 100%" : "1 1 0%", padding: view === "definitions" ? "20px 16px 20px 24px" : "20px 24px", minWidth: 0, overflow: "hidden" }}>
          <div key={viewTransitionKey} style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
          {view === "definitions" ? (
            <div>
              <div style={{ display: "inline-flex", gap: 16, marginBottom: 14, flexWrap: "wrap", padding: "6px 12px", background: PALETTE.surface, border: `1px solid ${PALETTE.borderLight}`, borderRadius: 4 }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: cfg.bg, opacity: key === "undetermined" ? 0.35 : 0.85 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cfg.label}</span>
                  </div>
                ))}
              </div>
              <DefinitionHeatmap
                hoveredAgency={hoveredAgency}
                lockedAgency={lockedAgency}
                hoveredConcept={hoveredConcept}
                lockedConcept={lockedConcept}
                onHoverAgency={setHoveredAgency}
                onLockAgency={handleLockAgency}
                onHoverConcept={setHoveredConcept}
                onLockConcept={handleLockConcept}
                onCellHover={setCellTooltip}
                onCellLeave={() => setCellTooltip(null)}
              />
              <p style={{ marginTop: 14, fontSize: 11.5, color: PALETTE.textMuted, lineHeight: 1.6, maxWidth: 640, fontFamily: "'Source Sans Pro',sans-serif" }}>
                Click any <strong>agency row</strong> to pin its definition profile, or click a <strong>column header</strong> to see cross-agency convergence for that concept. Hover over individual cells for excerpted definitions. Gaps (—) highlight upstream barriers to harmonization.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                {stanceDimensions.map(d => {
                  const active = d.id === effectiveDimension;
                  return (
                    <button key={d.id} onClick={() => { setSelectedDimension(d.id); setHoveredAgency(null); setLockedAgency(null); setLockedConcept(null); setLockedPosition(null); setHoveredPosition(null); }}
                      style={{
                        padding: "6px 14px", fontSize: 12, fontWeight: active ? 700 : 400,
                        fontFamily: "'Source Sans Pro',sans-serif",
                        letterSpacing: active ? "0.02em" : 0,
                        background: active ? PALETTE.skyBlue : PALETTE.surface,
                        color: active ? PALETTE.dukeNavy : PALETTE.textMuted,
                        border: `1px solid ${active ? PALETTE.dukeBlue : PALETTE.borderLight}`,
                        borderRadius: 4, cursor: "pointer",
                      }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <svg width={sankeyW} height={chartH} style={{ overflow: "visible" }}
                onClick={(e) => { if (e.target === e.currentTarget) { setLockedAgency(null); setLockedConcept(null); setLockedPosition(null); } }}>
                {layout.links.map((l, i) => {
                  const hl = (activeAgency && l.agencyId === activeAgency) || (activePosition !== null && l.posIndex === activePosition);
                  return <SankeyPath key={i} link={l} highlighted={hl} active={isActive} />;
                })}
                {layout.leftNodes.map(n => {
                  const hl = !isActive || activeAgency === n.id;
                  const isLocked = lockedAgency === n.id;
                  return (
                    <g key={n.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Agency: ${n.label}`}
                      className="rwe-focus-visible"
                      onMouseEnter={() => { if (!lockedAgency) setHoveredAgency(n.id); }}
                      onMouseLeave={() => { if (!lockedAgency) setHoveredAgency(null); }}
                      onClick={(e) => { e.stopPropagation(); handleLockAgency(n.id); }}
                      onKeyDown={handleKeyActivate((e) => { e.stopPropagation(); handleLockAgency(n.id); })}
                      style={{ cursor: "pointer" }}>
                      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill={REGION_COLORS[n.region]} opacity={hl ? 0.85 : 0.15} style={{ transition: "opacity 0.2s" }} />
                      {isLocked && <rect x={n.x - 2} y={n.y - 2} width={n.w + 4} height={n.h + 4} rx={3} fill="none" stroke={REGION_COLORS[n.region]} strokeWidth={2} opacity={0.6} />}
                      <text x={n.x - 8} y={n.y + n.h / 2} textAnchor="end" dominantBaseline="central" fill={hl ? PALETTE.textPrimary : PALETTE.textFaint} fontSize={13.5} fontWeight={hl ? 700 : 500} fontFamily="'Source Sans 3',sans-serif">{n.label}</text>
                    </g>
                  );
                })}
                {layout.rightNodes.map(n => {
                  const hl = !isActive || activePosition === n.posIndex || (activeAgency && dimension.positions[n.posIndex].agencies.includes(activeAgency));
                  const isPosLocked = lockedPosition === n.posIndex;
                  return (
                    <g key={n.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Position: ${n.label}`}
                      className="rwe-focus-visible"
                      onMouseEnter={() => { if (lockedPosition === null) setHoveredPosition(n.posIndex); }}
                      onMouseLeave={() => { if (lockedPosition === null) setHoveredPosition(null); }}
                      onClick={(e) => { e.stopPropagation(); handleLockPosition(n.posIndex); }}
                      onKeyDown={handleKeyActivate((e) => { e.stopPropagation(); handleLockPosition(n.posIndex); })}
                      style={{ cursor: "pointer" }}>
                      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={2} fill={MATURITY_COLORS[n.maturity]} opacity={hl ? 0.75 : 0.12} style={{ transition: "opacity 0.2s" }} />
                      {isPosLocked && <rect x={n.x - 2} y={n.y - 2} width={n.w + 4} height={n.h + 4} rx={3} fill="none" stroke={MATURITY_COLORS[n.maturity]} strokeWidth={2} opacity={0.7} />}
                      <foreignObject x={n.x + n.w + 10} y={n.y} width={200} height={Math.max(n.h, 30)}>
                        <div style={{ display: "flex", alignItems: "center", height: Math.max(n.h, 28), fontSize: 13.5, lineHeight: 1.3, color: hl ? PALETTE.textPrimary : PALETTE.textFaint, fontFamily: "'Source Sans 3',sans-serif", fontWeight: hl ? 600 : 400 }}>
                          {n.label}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
          </div>
        </div>

        {/* ── Right column: Map + info for definitions, Sidebar for stances ── */}
        {view === "definitions" ? (
          /* Definitions view: Map + info panel below it (no separate sidebar) */
          !isMobile && (
            <div style={{
              flex: isNarrow ? "1 1 100%" : "0 0 66%",
              minWidth: isNarrow ? undefined : 320,
              maxWidth: isNarrow ? undefined : 800,
              paddingTop: 20,
              paddingLeft: isNarrow ? 24 : 8,
              paddingRight: isNarrow ? 24 : 0,
              overflowY: isNarrow ? "visible" : "auto",
              maxHeight: isNarrow ? undefined : "calc(100vh - 140px)",
            }}
              aria-live="polite">
              <div style={isNarrow ? { display: "flex", gap: 24, alignItems: "flex-start" } : undefined}>
              <div style={isNarrow ? { flex: "0 0 50%", maxWidth: "50%" } : undefined}>
              <WorldMap
                agencies={agencies}
                regionColors={REGION_COLORS}
                hoveredAgency={hoveredAgency}
                lockedAgency={lockedAgency}
                onHoverAgency={setHoveredAgency}
                onLockAgency={handleLockAgency}
                palette={PALETTE}
              />
              </div>

              {/* ── Info panel ── */}
              <div style={isNarrow ? { flex: 1, minWidth: 0, padding: 0 } : { marginTop: 16, padding: "0 4px" }}>
                {activeAgency ? (
                  <div>
                    {lockedAgency && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 10px", background: PALETTE.skyBlueLight, borderRadius: 4, border: `1px solid ${PALETTE.dukeBlue}` }}>
                        <span style={{ fontSize: 10, color: PALETTE.dukeBlue, fontWeight: 600 }}>Pinned — click agency or background to unpin</span>
                      </div>
                    )}
                    <AgencyCrosscut agencyId={activeAgency} />
                  </div>
                ) : activeConcept ? (
                  <div>
                    {lockedConcept && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 10px", background: PALETTE.skyBlueLight, borderRadius: 4, border: `1px solid ${PALETTE.dukeBlue}` }}>
                        <span style={{ fontSize: 10, color: PALETTE.dukeBlue, fontWeight: 600 }}>Pinned — click column header to unpin</span>
                      </div>
                    )}
                    <ConceptCrosscut conceptId={activeConcept} />
                  </div>
                ) : (
                  <div>
                    <div style={{ background: PALETTE.skyBlue, border: `1px solid ${PALETTE.dukeBlue}`, borderLeft: `4px solid ${PALETTE.dukeBlue}`, borderRadius: 4, padding: "10px 14px", marginBottom: 16 }}>
                      <div style={{ fontSize: 11.5, color: PALETTE.textPrimary, lineHeight: 1.6, fontWeight: 400 }}>
                        <strong>Click</strong> an agency row to pin its profile, or <strong>click</strong> a column header to see cross-agency convergence for that concept.
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ background: PALETTE.dukeNavy, padding: "6px 10px", borderRadius: "4px 4px 0 0" }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFFFFF" }}>Why This Matters</span>
                      </div>
                      <div style={{ padding: "12px 14px", background: PALETTE.surface, border: `1px solid ${PALETTE.borderLight}`, borderTop: "none", borderRadius: "0 0 4px 4px", lineHeight: 1.6 }}>
                        <div style={{ fontSize: 11.5, color: PALETTE.textSecondary, marginBottom: 10 }}>
                          Real-world evidence is increasingly central to regulatory decision-making — from post-market safety surveillance to supporting label expansions and accelerating access to therapies. Yet the value of RWE depends on shared understanding of foundational concepts like data quality, relevance, and reliability.
                        </div>
                        <div style={{ fontSize: 11.5, color: PALETTE.textSecondary, marginBottom: 10 }}>
                          When regulators define these terms differently — or leave them undefined — it creates friction for sponsors designing multi-regional studies and for patients who stand to benefit from timely evidence generation.
                        </div>
                        <div style={{ fontSize: 11.5, color: PALETTE.textSecondary }}>
                          This dashboard maps those definitional gaps and alignments across 12 agencies, providing a starting point for identifying where harmonization efforts can have the greatest impact.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ padding: "10px 12px", background: PALETTE.skyBlue, border: `1px solid ${PALETTE.dukeBlue}`, borderRadius: 4, fontSize: 10.5, color: PALETTE.textPrimary, lineHeight: 1.55, marginTop: 12 }}>
                  <strong style={{ color: PALETTE.dukeNavy }}>Data source:</strong> Duke-Margolis Institute for Health Policy, International Harmonization of Real-World Evidence Standards Dashboard. Definitions coded from published regulatory guidance as of Oct 2025.
                </div>
              </div>
              </div>{/* close flex row / map wrapper */}
            </div>
          )
        ) : (
          /* Stances view: keep the traditional sidebar */
          <>
            {/* Mobile sidebar backdrop */}
            {isMobile && sidebarOpen && (
              <div
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,0.3)", zIndex: 999,
                }}
              />
            )}

            <div
              className={isMobile ? `rwe-sidebar-overlay ${sidebarOpen ? "rwe-sidebar-open" : "rwe-sidebar-closed"}` : ""}
              aria-live="polite"
              style={{
                flex: isMobile ? undefined : "0 0 280px",
                borderLeft: `1px solid ${PALETTE.border}`,
                padding: "20px 16px",
                background: PALETTE.surface,
                overflowY: "auto",
                maxHeight: isMobile ? "100vh" : "calc(100vh - 140px)",
                ...(isMobile && !sidebarOpen ? { pointerEvents: "none" } : {}),
              }}
            >
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close info panel"
                  style={{
                    position: "absolute", top: 10, right: 10,
                    background: PALETTE.surfaceMuted, border: `1px solid ${PALETTE.border}`,
                    borderRadius: 4, padding: "4px 10px", cursor: "pointer",
                    fontSize: 14, fontWeight: 700, color: PALETTE.textSecondary,
                  }}
                >
                  X
                </button>
              )}

              {activeAgency ? (
                <div>
                  {lockedAgency && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 10px", background: PALETTE.skyBlueLight, borderRadius: 4, border: `1px solid ${PALETTE.dukeBlue}` }}>
                      <span style={{ fontSize: 10, color: PALETTE.dukeBlue, fontWeight: 600 }}>Pinned — click agency or background to unpin</span>
                    </div>
                  )}
                  <AgencyCrosscut agencyId={activeAgency} />
                </div>
              ) : activePosition !== null ? (
                <div>
                  {lockedPosition !== null && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "4px 10px", background: PALETTE.skyBlueLight, borderRadius: 4, border: `1px solid ${PALETTE.dukeBlue}` }}>
                      <span style={{ fontSize: 10, color: PALETTE.dukeBlue, fontWeight: 600 }}>Pinned — click cluster or background to unpin</span>
                    </div>
                  )}
                  <PositionCrosscut dimension={dimension} positionIndex={activePosition} />
                </div>
              ) : (
                <div>
                  <div style={{ background: PALETTE.skyBlue, border: `1px solid ${PALETTE.dukeBlue}`, borderLeft: `4px solid ${PALETTE.dukeBlue}`, borderRadius: 4, padding: "10px 14px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11.5, color: PALETTE.textPrimary, lineHeight: 1.6, fontWeight: 400 }}>
                      <strong>Click</strong> an agency on the left to pin its profile, or <strong>click</strong> a cluster on the right to see convergence metrics and member agencies.
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ background: PALETTE.dukeNavy, padding: "6px 10px", borderRadius: "4px 4px 0 0" }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FFFFFF" }}>About This View</span>
                    </div>
                    <div style={{ padding: "12px 14px", background: PALETTE.surface, border: `1px solid ${PALETTE.borderLight}`, borderTop: "none", borderRadius: "0 0 4px 4px", lineHeight: 1.6 }}>
                      <div style={{ fontSize: 11.5, color: PALETTE.textSecondary, marginBottom: 10 }}>
                        Beyond definitions, regulators also differ in how they operationalize RWE — from requirements around external comparators and causal inference methods to expectations for study transparency and data quality frameworks.
                      </div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textSecondary, marginBottom: 10 }}>
                        This Sankey diagram visualizes how agencies cluster around regulatory positions for each dimension. Agencies on the left flow to their assessed position on the right, colored by maturity level.
                      </div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textSecondary, marginBottom: 10, padding: "8px 10px", background: PALETTE.amberLight, borderLeft: `3px solid ${PALETTE.amber}`, borderRadius: 3 }}>
                        <strong style={{ color: PALETTE.amber }}>Note:</strong> The five regulatory dimensions and agency-to-position mappings shown here are <strong>illustrative placeholders</strong> — directionally plausible but not rigorously coded from the Duke-Margolis tracker. They are intended to demonstrate the visualization framework and interaction model for future data integration.
                      </div>
                      <div style={{ fontSize: 11.5, color: PALETTE.textSecondary }}>
                        A production version would replace these with verified codings from the tracker or a custom taxonomy developed through domain expert consensus.
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: PALETTE.dukeNavy, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>Regions</div>
                {Object.entries(REGION_COLORS).map(([r, c]) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                    <span style={{ fontSize: 11.5, color: PALETTE.textSecondary }}>{r}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: PALETTE.dukeNavy, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, borderBottom: `2px solid ${PALETTE.dukeNavy}`, paddingBottom: 4 }}>Maturity Spectrum</div>
                {[{ l: "Most developed", c: MATURITY_COLORS[0] }, { l: "Intermediate", c: MATURITY_COLORS[1] }, { l: "Least developed", c: MATURITY_COLORS[2] }].map(x => (
                  <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: x.c }} />
                    <span style={{ fontSize: 11.5, color: PALETTE.textSecondary }}>{x.l}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", background: PALETTE.skyBlue, border: `1px solid ${PALETTE.dukeBlue}`, borderRadius: 4, fontSize: 10.5, color: PALETTE.textPrimary, lineHeight: 1.55 }}>
                <strong style={{ color: PALETTE.dukeNavy }}>Data source:</strong> Duke-Margolis Institute for Health Policy, International Harmonization of Real-World Evidence Standards Dashboard. Definitions coded from published regulatory guidance as of Oct 2025.
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Floating "Info" button on mobile ── */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open info panel"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 998,
            background: PALETTE.dukeNavy,
            color: "#fff",
            border: "none",
            borderRadius: 28,
            padding: "12px 20px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Source Sans Pro',sans-serif",
            boxShadow: "0 4px 14px rgba(0,51,102,0.3)",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Info
        </button>
      )}

      {/* ── Footer — three-zone per brand guidelines ── */}
      <div style={{
        background: PALETTE.dukeNavy,
        borderTop: `3px solid ${PALETTE.teal4}`,
        padding: "12px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        {/* Left zone: document title short form */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.70)", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "#FFFFFF" }}>RWE Harmonization Explorer</span>
          <span style={{ color: "rgba(255,255,255,0.45)", marginLeft: 10 }}>·</span>
          <span style={{ marginLeft: 10, fontStyle: "italic", color: "rgba(255,255,255,0.55)" }}>
            Created by John D. Diaz-Decaro, PhD, MS · Black Swan Causal Labs, LLC
          </span>
        </div>

        {/* Right zone: URL + teal page-number badge (brand spec) */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>
            healthpolicy.duke.edu
          </span>
          {/* Teal square page-number badge per brand guidelines */}
          <div style={{
            background: PALETTE.teal4,
            color: "#FFFFFF",
            fontSize: 10, fontWeight: 700,
            padding: "4px 9px",
            borderRadius: 3,
            letterSpacing: "0.06em",
          }}>
            Oct 2025
          </div>
        </div>
      </div>
    </div>
    </DataContext.Provider>
  );
}
