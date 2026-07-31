# Regulatory Harmonization Explorer
### Interactive Visualization of International Regulatory Real-World Evidence Standards

> **Prototype** — An interactive dashboard mapping key RWE definitions, regulatory positions, and the geographic distribution of 12 national regulatory agencies. Data sourced from the [Duke-Margolis Institute for Health Policy's International Harmonization of Real-World Evidence Standards Dashboard](https://healthpolicy.duke.edu/projects/international-harmonization-real-world-evidence-standards).

🔗 **[Live Demo →](https://black-swan-causal-labs.github.io/rwe-harmonization-explorer/)**

---

## What This Is

Real-world evidence is increasingly central to regulatory decision-making worldwide — from post-market safety surveillance to label expansions and accelerating patient access to therapies. Yet the value of RWE depends on shared understanding of foundational concepts like data quality, relevance, and reliability.

This dashboard provides an interactive lens into how 12 national regulatory agencies define and operationalize RWE concepts, making it easier to identify where harmonization efforts can have the greatest impact.

### Key Definitions Heatmap

Maps the definitional status of 7 core RWE concepts across all 12 agencies. Each cell represents whether an agency has formally defined, informally addressed, cited another agency, or left a concept undefined. Click any **agency row** to see its full definition profile, or click a **column header** to see cross-agency convergence metrics for that concept.

### Agency Locations Map

An interactive world map plots all 12 agencies by country, color-coded by region (Americas, Europe, Asia-Pacific, MENA). Displayed alongside the heatmap, it gives geographic context to the definitional landscape and makes the international scope of the harmonization effort immediately legible. The map is rendered as inline SVG from bundled TopoJSON, so it works fully offline with no external tile service.

### Regulatory Positions

Visualizes how agencies cluster around regulatory positions on key operational dimensions using a Sankey flow diagram. Agencies on the left flow to their assessed position on the right, colored by maturity level.

> ⚠️ **Note on Data Scope:** The Key Definitions Heatmap is grounded in the Duke-Margolis RWE Guidance Tracker's definitional framework, with representative excerpts from published agency guidance. The Regulatory Positions tab contains **illustrative placeholder** dimensions and mappings — directionally plausible but not rigorously coded. A production version would require verified codings from the tracker or a custom taxonomy developed through domain expert consensus.

---

## Built With AI-Assisted Development

This prototype was developed through an iterative AI-assisted workflow, demonstrating how large language models can accelerate the translation of structured policy data into interactive analytical tools. The entire dashboard — from data modeling to visualization logic to UX interactions — was built collaboratively with [Claude](https://claude.ai) (Anthropic) in a single working session.

This approach suggests a broader opportunity: **AI-assisted tooling can significantly lower the barrier to creating interactive, public-facing policy dashboards from structured datasets** — enabling research institutes and regulatory science organizations to make their data more accessible and actionable.

---

## A Proposal for Collaboration

This project was built as a demonstration of what's possible when combining the Duke-Margolis Institute's rigorous regulatory science data with modern interactive visualization and AI-assisted development. It is shared in the spirit of open collaboration.

**Potential directions for a partnership:**

- **Production integration** — Replace placeholder data with verified codings from the full RWE Guidance Tracker, creating an authoritative interactive companion to the existing dashboard
- **Extended taxonomy** — Co-develop a structured taxonomy for regulatory positions beyond definitions (e.g., external comparator requirements, causal inference expectations, data quality frameworks)
- **AI-powered analysis** — Integrate LLM capabilities to allow users to query regulatory guidance in natural language (e.g., "Which agencies accept propensity score matching for confounding control?")
- **Living resource** — Build an automated pipeline that updates the visualization as new agency guidance is published

If this resonates, I would welcome the opportunity to discuss how this tool could complement the Institute's existing work on international RWE harmonization.

---

## Data Sources & Attribution

All definitional data is sourced from the **Duke-Margolis Institute for Health Policy's International Harmonization of Real-World Evidence Standards Dashboard**. Definition excerpts are representative of published regulatory agency guidance documents as coded by the tracker (as of October 2025).

The 12 agencies covered: FDA (US), EMA (EU), Health Canada, PMDA (Japan), MHRA (UK), NMPA (China), TGA (Australia), ANVISA (Brazil), MFDS (South Korea), SFDA (Saudi Arabia), Swissmedic (Switzerland), TFDA (Taiwan).

The dashboard ships with a bundled static snapshot of this data and can optionally load it live from an Airtable base during local development (see [Optional: live data from Airtable](#optional-live-data-from-airtable)). The public deployment always uses the bundled snapshot — no credentials are embedded in the published build.

---

## Running Locally

```bash
git clone https://github.com/Black-Swan-Causal-Labs/rwe-harmonization-explorer.git
cd rwe-harmonization-explorer
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. With no configuration, the app renders the bundled static data.

### Optional: live data from Airtable

To pull data live from Airtable during local development, copy the example env file and add your credentials:

```bash
cp .env.example .env
# edit .env and set VITE_AIRTABLE_TOKEN and VITE_AIRTABLE_BASE_ID
```

`.env` is gitignored and never committed. Without credentials, the app automatically falls back to the built-in static snapshot — so the token is never required to run or deploy the dashboard.

### Deployment

The site deploys automatically to **GitHub Pages** via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) on every push to `main`. The workflow builds with no Airtable credentials, so the published bundle contains only the static snapshot.

---

## Technology

- **React 19** — Component-based architecture
- **Interactive world map** — Rendered as inline SVG using [`topojson-client`](https://github.com/topojson/topojson-client) and [`world-atlas`](https://github.com/topojson/world-atlas) (110m TopoJSON); no tile service or map SDK
- **Custom Sankey engine** — Lightweight flow diagram renderer built from scratch
- **Optional Airtable integration** — Live data via the Airtable REST API, with a bundled static fallback
- **Vite** — Build tool for fast development and static deployment; auto-deployed to GitHub Pages via GitHub Actions
- **AI-assisted development** — Built collaboratively with Claude (Anthropic)

---

## Author

**John D. Diaz-Decaro, PhD, MS**
Black Swan Causal Labs, LLC

- Chair, ISPE Digital Technology & AI Special Interest Group
- Pharmacoepidemiologist
- [LinkedIn](https://www.linkedin.com/in/jdiazdecaro/) · [GitHub](https://github.com/jdiazdecaro)

---

*This is an independent prototype and is not affiliated with or endorsed by the Duke-Margolis Institute for Health Policy. It is shared as a demonstration of how their publicly available data can be extended into interactive analytical tools.*
