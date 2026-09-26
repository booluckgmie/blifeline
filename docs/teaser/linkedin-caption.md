# LinkedIn caption — BLifeline teaser

Attach in this order:
1. `01-dashboard-surge-simulator.jpg`
2. `02-icu-vulnerability-hospitals.jpg`
3. `03-architecture-inspector.jpg`

---

🩸 Weekend project: BLifeline, where will Malaysia's blood run short first, and which ICUs feel it?

Blood donation appeals are usually national and generic. But shortages hit locally, by state and by blood group, and they hurt most where ICUs are already full.

So I built a prototype that puts the two side by side:

🔹 Days of blood stock per state and group (A, B, O, AB), projected up to 21 days ahead
🔹 An ICU Vulnerability Index (0–100) that combines ICU occupancy, ventilator load and projected blood cover
🔹 A surge simulator: monsoon floods on the East Coast, a Klang Valley mass-casualty event, dengue, a pandemic wave. Drag the severity and watch the map and charts react
🔹 Recommended actions: targeted donor drives, inter-state transfers (with air freight flagged for Sabah and Sarawak), and ICU surge warnings
🔹 A "Donate blood" tab linking every critical zone to real PDN and hospital blood bank venues

One finding surprised me: opening extra ICU surge beds lowers occupancy but raises blood demand, because more patients get treated. Capacity planning and blood planning need to happen together.

🛠️ Under the hood: the prototype is a single HTML file (Tailwind, Chart.js, inline SVG map). The production design is Next.js on the frontend, a FastAPI microservice, and a Python/scikit-learn forecasting pipeline fed by data.gov.my.

📊 Data: blood donation figures are real (data.gov.my, rolling 7-day average by state and blood type). ICU occupancy is an illustrative baseline, and days of stock are modelled, because no public hospital-level ICU feed or blood-bank inventory feed exists yet. It's a prototype for exploring the idea, not an operational tool.

If you work in transfusion services, public health or health data in Malaysia, I'd love your feedback. What would make this useful in practice?

And if you can, go donate: pdn.gov.my 🩸

#Malaysia #HealthTech #DataScience #OpenData #BloodDonation #PublicHealth #DataVisualization #WeekendProject #FastAPI #NextJS

---

## Short version (for X / Threads)

Weekend build: BLifeline 🩸 maps Malaysia's blood stock (real data.gov.my donations) against ICU pressure, with a surge simulator for floods, trauma events and outbreaks. Prototype: ICU data is illustrative and stock is modelled. Feedback welcome. Donate at pdn.gov.my
