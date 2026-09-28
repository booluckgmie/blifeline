# BLifeline — Blood Supply × ICU Vulnerability (Malaysia)

A mostly-static interactive app (`index.html`) plus one small serverless function (`api/blood-stock.js`) that fetches live data. Opening `index.html` directly (no server) still works fully — it just stays on the baked-in snapshot since there's nowhere for the fetch to land.

## Live data

On load, the page shows a baked-in snapshot instantly, then calls `/api/blood-stock`, which fetches data.gov.my's real `blood_donations_state` parquet file server-side, re-aggregates it into each state's rolling 7-day average per blood group, and returns it. The page swaps the snapshot for that response and flips the header badge from "Cached snapshot" to "Live data". If the fetch fails (offline, function not deployed, upstream down), it stays on the labelled snapshot — the dashboard never breaks, it's just honest about which numbers it's showing.

Run locally with `vercel dev`, or deploy to Vercel directly; `api/blood-stock.js` is picked up as a zero-config Node serverless function. `npm install` pulls its two dependencies (`hyparquet`, `hyparquet-compressors` — pure-JS parquet parsing, no native deps).

- **Blood supply status**: modelled days of stock per state and blood group (A, B, O, AB), today and projected to the forecast horizon.
- **ICU vulnerability index**: 0–100 per state, calculated from ICU occupancy, ventilator load and projected blood cover.
- **Filters**: state and blood group update every chart, KPI, recommendation and the hospital table.
- **Predictive surge simulator**: disaster scenarios, a regional emergency spike, ICU surge capacity and the forecast horizon.
- **Donate blood tab**: fixed PDN and hospital blood-bank venues with directions, the most urgent state and group pairs from the model, and links to this week's mobile drives.
- **Methodology & data pipeline tab**: data sources, pipeline steps, every formula, the scenario parameters and the limitations.
- **Hospital panels**: Top 5 critical zones, localized donor alerts, a vulnerability matrix, a sortable table and a detail card for each hospital.
- **Architecture inspector**: the production design (Next.js frontend, FastAPI microservice, scikit-learn pipeline), plus sample API responses built from the current page state.

Stack in the page: Tailwind CSS (play CDN), Font Awesome, Chart.js, and inline SVG for the map.

Data: donation volumes come from data.gov.my `blood_donations_state` (rolling 7-day average), fetched live where the serverless function is available, otherwise a baked-in snapshot. ICU and ventilator occupancy is an illustrative baseline. Days of stock is a modelled estimate. See the page footer and Methodology tab for the full assumptions.

Teaser screenshots and a LinkedIn caption are in `docs/teaser/`.
