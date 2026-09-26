# BLifeline — Blood Supply × ICU Vulnerability (Malaysia)

A single-file interactive app: open `index.html` in a browser. There's no build step.

- **Blood supply status**: modelled days of stock per state and blood group (A, B, O, AB), today and projected to the forecast horizon.
- **ICU vulnerability index**: 0–100 per state, calculated from ICU occupancy, ventilator load and projected blood cover.
- **Filters**: state and blood group update every chart, KPI, recommendation and the hospital table.
- **Predictive surge simulator**: disaster scenarios, a regional emergency spike, ICU surge capacity and the forecast horizon.
- **Donate blood tab**: fixed PDN and hospital blood-bank venues with directions, the most urgent state and group pairs from the model, and links to this week's mobile drives.
- **Methodology & data pipeline tab**: data sources, pipeline steps, every formula, the scenario parameters and the limitations.
- **Hospital panels**: Top 5 critical zones, localized donor alerts, a vulnerability matrix, a sortable table and a detail card for each hospital.
- **Architecture inspector**: the production design (Next.js frontend, FastAPI microservice, scikit-learn pipeline), plus sample API responses built from the current page state.

Stack in the page: Tailwind CSS (play CDN), Font Awesome, Chart.js, and inline SVG for the map.

Data: donation volumes come from data.gov.my `blood_donations_state` (rolling 7-day average, as of 2026-09-23). ICU and ventilator occupancy is an illustrative baseline. Days of stock is a modelled estimate. See the page footer for the full assumptions.

Teaser screenshots and a LinkedIn caption are in `docs/teaser/`.
