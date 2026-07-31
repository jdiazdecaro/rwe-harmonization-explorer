import { buildDashboardData } from "./transformDashboardData";

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
  // call and let the caller fall back to the bundled snapshot / static data.
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

  return buildDashboardData({ agencyRows, conceptRows, matrixRows, dimensionRows, positionRows });
}
