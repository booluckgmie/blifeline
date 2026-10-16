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

## Site analytics

A **Site analytics** tab shows real Vercel Web Analytics traffic for this
site — visits per day, top pages/referrers/countries/devices — plus four
events the page reports itself, so the numbers connect back to what the
dashboard is actually for: `view_donate_tab`, `run_scenario`,
`open_hospital_detail`, `open_architecture`.

It's wired up end to end in code, but needs **two one-time steps outside
this repo** that no API can complete on its own behalf:

1. **Enable Web Analytics for this project.** There's no public REST
   endpoint for this toggle — only a dashboard click or an authenticated
   `vercel project web-analytics enable` from the CLI:
   **[vercel.com/my-ketapang/blifeline → Analytics → Enable](https://vercel.com/my-ketapang/blifeline/analytics)**
2. **Create a read-only Vercel token and add it as an environment
   variable.** Tokens are tied to the creating account, so nothing can mint
   one on your behalf:
   - Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens) — Member/read scope is enough, it only ever does `GET`s.
   - Add it to the project at **Project → Settings → Environment Variables**:
     key `VERCEL_TOKEN`, value the token, all environments.
   - Redeploy (or wait for the next deploy) so the function picks it up.

Until both are done, `/api/site-analytics` returns `{ configured: false,
reason }` and the tab shows that reason plainly instead of fabricating
numbers. The same pattern as `/api/blood-stock`: a real backend call with
an honest, visible fallback state, never a guess.

### Enabling Web Analytics on the rest of the account

Vercel Web Analytics is a **per-project** setting — there's no account-wide
switch, and (as above) no API to flip it from here. The account this was
deployed under (`my-ketapang`) has 11 projects; enabling it on all of them
is one click each from these links, then the same `Analytics` tab doubles
as that project's own dashboard (no code changes needed elsewhere — only
`blifeline` has a page built to display the data back):

- [blifeline](https://vercel.com/my-ketapang/blifeline/analytics) — has the Site analytics tab above
- [tanya-data](https://vercel.com/my-ketapang/tanya-data/analytics)
- [portfolio-cms](https://vercel.com/my-ketapang/portfolio-cms/analytics)
- [bursamy](https://vercel.com/my-ketapang/bursamy/analytics)
- [shutdown-radar](https://vercel.com/my-ketapang/shutdown-radar/analytics)
- [jagamrt](https://vercel.com/my-ketapang/jagamrt/analytics)
- [hazeshaman](https://vercel.com/my-ketapang/hazeshaman/analytics)
- [booluckgmie-myopentender](https://vercel.com/my-ketapang/booluckgmie-myopentender/analytics)
- [moomooiq](https://vercel.com/my-ketapang/moomooiq/analytics)
- [events-map](https://vercel.com/my-ketapang/events-map/analytics)
- [pksof](https://vercel.com/my-ketapang/pksof/analytics)
