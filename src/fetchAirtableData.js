const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const API = `https://api.airtable.com/v0/${BASE_ID}`;

async function fetchTable(tableName) {
  const records = [];
  let offset;
  do {
    const url = new URL(`${API}/${encodeURIComponent(tableName)}`);
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

export async function fetchDashboardData() {
  // No credentials (e.g. the public GitHub Pages build) → skip the network
  // call and let the caller fall back to the bundled static data.
  if (!TOKEN || !BASE_ID) {
    throw new Error("Airtable credentials not configured; using static data");
  }

  const [agencyRows, conceptRows, matrixRows, dimensionRows, positionRows] =
    await Promise.all([
      fetchTable("Agencies"),
      fetchTable("Concepts"),
      fetchTable("Definition Matrix"),
      fetchTable("Stance Dimensions"),
      fetchTable("Agency Positions"),
    ]);

  // Build AGENCIES array
  const AGENCIES = agencyRows
    .map((r) => ({
      id: r.fields["Agency ID"],
      label: r.fields["Label"],
      full: r.fields["Full Name"],
      region: (typeof r.fields["Region"] === "object" && r.fields["Region"]?.name) ? r.fields["Region"].name : r.fields["Region"],
      country: r.fields["Country"],
      _recId: r.id,
    }))
    .sort((a, b) => {
      // Preserve original ordering: FDA, EMA, HC, PMDA, MHRA, NMPA, TGA, ANVISA, MFDS, SFDA, SWISS, TFDA
      const order = ["FDA","EMA","HC","PMDA","MHRA","NMPA","TGA","ANVISA","MFDS","SFDA","SWISS","TFDA"];
      return (order.indexOf(a.id) === -1 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) === -1 ? 99 : order.indexOf(b.id));
    });

  // Build CONCEPTS array
  const DEFINITION_CONCEPTS = conceptRows
    .map((r) => ({
      id: r.fields["Concept ID"],
      label: r.fields["Label"],
      _recId: r.id,
    }))
    .sort((a, b) => {
      const order = ["quality","reliability","relevance","fit_purpose","fit_use","rwd","rwe"];
      return (order.indexOf(a.id) === -1 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) === -1 ? 99 : order.indexOf(b.id));
    });

  // Build lookup maps: Airtable record ID → our ID
  const agencyRecIdToId = {};
  AGENCIES.forEach((a) => { agencyRecIdToId[a._recId] = a.id; });
  const conceptRecIdToId = {};
  DEFINITION_CONCEPTS.forEach((c) => { conceptRecIdToId[c._recId] = c.id; });

  // Build DEFINITION_MATRIX and DEFINITION_EXCERPTS
  const DEFINITION_MATRIX = {};
  const DEFINITION_EXCERPTS = {};
  for (const r of matrixRows) {
    const agencyLink = r.fields["Agency"];
    const conceptLink = r.fields["Concept"];
    if (!agencyLink?.length || !conceptLink?.length) continue;
    const aRef = agencyLink[0];
    const cRef = conceptLink[0];
    const agencyId = agencyRecIdToId[typeof aRef === "object" ? aRef.id : aRef];
    const conceptId = conceptRecIdToId[typeof cRef === "object" ? cRef.id : cRef];
    if (!agencyId || !conceptId) continue;

    const rawStatus = r.fields["Status"];
    const status = (typeof rawStatus === "object" && rawStatus?.name) ? rawStatus.name : (rawStatus || "undetermined");

    if (!DEFINITION_MATRIX[agencyId]) DEFINITION_MATRIX[agencyId] = {};
    DEFINITION_MATRIX[agencyId][conceptId] = status;

    const excerpt = r.fields["Excerpt"];
    if (excerpt) {
      if (!DEFINITION_EXCERPTS[agencyId]) DEFINITION_EXCERPTS[agencyId] = {};
      DEFINITION_EXCERPTS[agencyId][conceptId] = excerpt;
    }
  }

  // Build dimension lookup
  const dimRecIdToId = {};
  const dimRecIdToLabel = {};
  for (const r of dimensionRows) {
    dimRecIdToId[r.id] = r.fields["Dimension ID"];
    dimRecIdToLabel[r.id] = r.fields["Label"];
  }

  // Build STANCE_DIMENSIONS
  const dimMap = {};
  for (const r of positionRows) {
    const dimLink = r.fields["Dimension"];
    const agencyLink = r.fields["Agency"];
    if (!dimLink?.length || !agencyLink?.length) continue;

    const dRef = dimLink[0];
    const dimRecId = typeof dRef === "object" ? dRef.id : dRef;
    const dimId = dimRecIdToId[dimRecId];
    const dimLabel = dimRecIdToLabel[dimRecId];
    const aRef = agencyLink[0];
    const agencyId = agencyRecIdToId[typeof aRef === "object" ? aRef.id : aRef];
    if (!dimId || !agencyId) continue;

    const posIndex = r.fields["Position Index"] ?? 0;
    const posLabel = r.fields["Position Label"] || "";
    const rawMaturity = r.fields["Maturity"];
    const maturityStr = (typeof rawMaturity === "object" && rawMaturity?.name) ? rawMaturity.name : (rawMaturity || "");
    // Parse maturity from "0 - Most developed" etc.
    const maturity = parseInt(maturityStr, 10);

    if (!dimMap[dimId]) {
      dimMap[dimId] = { id: dimId, label: dimLabel, positions: {} };
    }
    if (!dimMap[dimId].positions[posIndex]) {
      dimMap[dimId].positions[posIndex] = {
        id: `${dimId}_${posIndex}`,
        label: posLabel,
        maturity: isNaN(maturity) ? posIndex : maturity,
        agencies: [],
      };
    }
    dimMap[dimId].positions[posIndex].agencies.push(agencyId);
  }

  const dimOrder = ["ext_controls","data_quality","transparency","causal_methods","ich_alignment"];
  const STANCE_DIMENSIONS = dimOrder
    .filter((id) => dimMap[id])
    .map((id) => {
      const d = dimMap[id];
      const positions = Object.keys(d.positions)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => d.positions[k]);
      return { id: d.id, label: d.label, positions };
    });

  return {
    AGENCIES,
    DEFINITION_CONCEPTS,
    DEFINITION_MATRIX,
    DEFINITION_EXCERPTS,
    STANCE_DIMENSIONS,
  };
}
