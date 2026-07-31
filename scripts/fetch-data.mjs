// Build-time Airtable snapshot.
//
// Runs in CI (and can be run locally) to pull the current Airtable data and
// write it to src/data.json, which the app imports as its primary data source.
// The token is read from process.env — it is NEVER given the VITE_ prefix, so
// Vite cannot inline it into the browser bundle. Only the resulting data ships.
//
// If no credentials are present (forks, PRs, or a misconfigured secret), the
// script logs a notice and exits 0, leaving the committed data.json in place so
// the build still succeeds.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildDashboardData } from "../src/transformDashboardData.js";

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/data.json");

if (!TOKEN || !BASE_ID) {
  console.warn(
    "[fetch-data] AIRTABLE_TOKEN / AIRTABLE_BASE_ID not set — keeping the committed src/data.json snapshot."
  );
  process.exit(0);
}

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
    if (!res.ok) {
      throw new Error(`Airtable fetch failed for "${tableName}": ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function main() {
  console.log("[fetch-data] Fetching latest data from Airtable…");
  const [agencyRows, conceptRows, matrixRows, dimensionRows, positionRows] =
    await Promise.all([
      fetchTable("Agencies"),
      fetchTable("Concepts"),
      fetchTable("Definition Matrix"),
      fetchTable("Stance Dimensions"),
      fetchTable("Agency Positions"),
    ]);

  const data = buildDashboardData({
    agencyRows,
    conceptRows,
    matrixRows,
    dimensionRows,
    positionRows,
  });

  await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(
    `[fetch-data] Wrote src/data.json — ${data.AGENCIES.length} agencies, ${data.DEFINITION_CONCEPTS.length} concepts, ${data.STANCE_DIMENSIONS.length} dimensions.`
  );
}

main().catch((err) => {
  console.error("[fetch-data]", err.message);
  process.exit(1);
});
