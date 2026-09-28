// /api/blood-stock — fetches the real data.gov.my blood_donations_state
// parquet server-side, computes each state's rolling 7-day average daily
// donations per blood group (ending on the most recent date present in the
// data), and returns it in the exact shape the frontend's LIVE_BLOOD.states
// object expects. Perlis, W.P. Putrajaya and W.P. Labuan aren't reported
// separately in the source dataset, so they're derived as a fixed scaled
// proxy of their nearest tracked state — the same ratios the app's original
// baked-in snapshot used (recovered by comparing that snapshot against this
// same source file).
//
// Response is cached at the edge (see Cache-Control below) so this function
// re-parses the ~600KB parquet file at most a few times an hour, not once
// per visitor.

import { parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";

export const config = { maxDuration: 15 };

const SOURCE_URL = "https://storage.data.gov.my/healthcare/blood_donations_state.parquet";
const GROUPS = ["a", "b", "ab", "o"];
const GROUP_KEY = { a: "A", b: "B", ab: "AB", o: "O" };
const WINDOW_DAYS = 7;

// Ratio applied to the parent state's same-day figures. Recovered from the
// app's original hand-fetched snapshot (2026-09-23), which was consistent
// to ~0.1pp across every blood group — so a single scalar per proxy state.
const PROXIES = {
  Perlis: { of: "Kedah", ratio: 0.15 },
  "W.P. Putrajaya": { of: "Selangor", ratio: 0.05 },
  "W.P. Labuan": { of: "Sabah", ratio: 0.03 }
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

export default async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 12000);
    let resp;
    try {
      resp = await fetch(SOURCE_URL, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!resp.ok) {
      res.status(502).json({ error: "source fetch failed", status: resp.status });
      return;
    }
    const buf = await resp.arrayBuffer();

    const rows = await parquetReadObjects({ file: buf, compressors: compressors });

    var maxDate = "";
    for (var i = 0; i < rows.length; i++) {
      var d = toDateStr(rows[i].date);
      if (d > maxDate) maxDate = d;
    }
    if (!maxDate) {
      res.status(502).json({ error: "no rows in source" });
      return;
    }

    var end = new Date(maxDate + "T00:00:00Z");
    var start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));
    var startStr = start.toISOString().slice(0, 10);

    var sums = {}, counts = {};
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      var bt = r.blood_type;
      if (GROUPS.indexOf(bt) === -1) continue; // skip the "all" rollup row
      var ds = toDateStr(r.date);
      if (ds < startStr || ds > maxDate) continue;
      var key = r.state + "|" + bt;
      sums[key] = (sums[key] || 0) + Number(r.donations);
      counts[key] = (counts[key] || 0) + 1;
    }

    var states = {};
    var seenStates = {};
    for (var k in sums) { seenStates[k.split("|")[0]] = true; }

    Object.keys(seenStates).forEach(function (state) {
      var entry = {};
      GROUPS.forEach(function (bt) {
        var key = state + "|" + bt;
        var n = counts[key] || 0;
        entry[GROUP_KEY[bt]] = n ? round2(sums[key] / n) : 0;
      });
      states[state] = entry;
    });

    Object.keys(PROXIES).forEach(function (proxyState) {
      var p = PROXIES[proxyState];
      var parent = states[p.of];
      if (!parent) return;
      var entry = { proxyOf: p.of };
      GROUPS.forEach(function (bt) {
        var gk = GROUP_KEY[bt];
        entry[gk] = round2(parent[gk] * p.ratio);
      });
      states[proxyState] = entry;
    });

    var payload = { asOf: maxDate, source: SOURCE_URL, generatedAt: new Date().toISOString(), states: states };

    // Fresh for 6h at the edge, then served stale for up to a day while a
    // background revalidation runs — the source updates roughly daily.
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
