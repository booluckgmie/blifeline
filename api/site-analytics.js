// /api/site-analytics — reads this project's real Vercel Web Analytics data
// server-side and returns a shape the "Site analytics" tab renders directly.
//
// Two one-time setup steps happen outside this file, neither of which any
// API can do on this session's behalf:
//   1. Web Analytics must be enabled for this project (Vercel dashboard ->
//      Project -> Analytics -> Enable). There is no public REST endpoint
//      for this toggle, only a dashboard click or `vercel project
//      web-analytics enable` from an authenticated CLI.
//   2. A Vercel Personal Access Token must be created by the project owner
//      (Account Settings -> Tokens; read-only "Member" scope is enough)
//      and added as the VERCEL_TOKEN environment variable on this project.
//      Tokens are tied to the creating account and can't be minted by one
//      API call on behalf of another, so this is a manual step by design.
//
// Until both are done, this function returns { configured: false, reason }
// rather than fabricating numbers — the frontend shows that reason as-is.
//
// Response is cached at the edge for 5 minutes so opening this tab
// repeatedly doesn't re-query Vercel's Web Analytics API every time.

export const config = { maxDuration: 15 };

const PROJECT_ID = "prj_Sz5uA2BgBbdNEsT3dAGQtoSjsHFp"; // blifeline — not a secret
const TEAM_ID = "team_YWXoh9J5uvtJSnOIlBq2H8Rl";
const API_BASE = "https://api.vercel.com/v1/query/web-analytics";
const WINDOW_DAYS = 30;

function authHeaders(token) {
  return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
}

async function vercelGet(path, token, params, signal) {
  const qs = new URLSearchParams(Object.assign({ projectId: PROJECT_ID, teamId: TEAM_ID }, params));
  const res = await fetch(API_BASE + path + "?" + qs.toString(), { headers: authHeaders(token), signal: signal });
  const body = await res.json().catch(function () { return null; });
  if (!res.ok) {
    const msg = (body && (body.error && body.error.message || body.message)) || ("HTTP " + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body;
}

function topList(aggregateBody, dimKey) {
  // The aggregate endpoint returns { data: [{ [dimKey]: value, visits|events: n, ... }] }
  // for a single-dimension breakdown; normalize to a plain array.
  var rows = (aggregateBody && aggregateBody.data) || [];
  return rows.map(function (r) {
    var out = {};
    out[dimKey] = r[dimKey];
    out.visits = r.visits != null ? r.visits : r.value != null ? r.value : 0;
    return out;
  });
}

export default async function handler(req, res) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    res.status(200).json({
      configured: false,
      reason: "VERCEL_TOKEN isn't set on this project yet, so this page can't query Vercel's Web Analytics API on your behalf."
    });
    return;
  }

  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_DAYS * 86400000);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 12000);
    let trend, pages, referrers, countries, devices, visitCount, eventNames, eventCount;
    try {
      [trend, pages, referrers, countries, devices, visitCount, eventNames, eventCount] = await Promise.all([
        vercelGet("/visits/aggregate", token, { since: sinceIso, until: untilIso, by: "day" }, controller.signal),
        vercelGet("/visits/aggregate", token, { since: sinceIso, until: untilIso, by: "requestPath", limit: "8" }, controller.signal),
        vercelGet("/visits/aggregate", token, { since: sinceIso, until: untilIso, by: "referrerHostname", limit: "8" }, controller.signal),
        vercelGet("/visits/aggregate", token, { since: sinceIso, until: untilIso, by: "country", limit: "8" }, controller.signal),
        vercelGet("/visits/aggregate", token, { since: sinceIso, until: untilIso, by: "deviceType", limit: "6" }, controller.signal),
        vercelGet("/visits/count", token, { since: sinceIso, until: untilIso }, controller.signal),
        vercelGet("/events/aggregate", token, { since: sinceIso, until: untilIso, by: "eventName", limit: "20" }, controller.signal),
        vercelGet("/events/count", token, { since: sinceIso, until: untilIso }, controller.signal)
      ]);
    } finally {
      clearTimeout(timeout);
    }

    const trendRows = (trend && trend.data) || [];
    const payload = {
      configured: true,
      range: { since: sinceIso.slice(0, 10), until: untilIso.slice(0, 10) },
      totals: { visits: (visitCount && (visitCount.visits != null ? visitCount.visits : visitCount.total)) || 0 },
      trend: trendRows.map(function (r, i) {
        // Vercel's exact field name for the "by: day" bucket isn't fixed in
        // public docs, so try the plausible candidates and fall back to a
        // sequence label rather than an empty/broken axis tick.
        var raw = r.day || r.date || r.bucketStart || r.bucket || r.timestamp;
        return { date: raw ? String(raw).slice(0, 10) : "#" + (i + 1), visits: r.visits != null ? r.visits : 0 };
      }),
      topPages: topList(pages, "requestPath"),
      topReferrers: topList(referrers, "referrerHostname"),
      topCountries: topList(countries, "country"),
      devices: topList(devices, "deviceType"),
      events: {
        total: (eventCount && (eventCount.events != null ? eventCount.events : eventCount.total)) || 0,
        byName: ((eventNames && eventNames.data) || []).map(function (r) {
          return { eventName: r.eventName, count: r.events != null ? r.events : r.visits != null ? r.visits : 0 };
        })
      }
    };

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
    res.status(200).json(payload);
  } catch (err) {
    const status = err && err.status;
    if (status && status >= 400 && status < 500) {
      // Most common cause: Web Analytics isn't enabled for this project yet,
      // or the token doesn't have access to it. Either way, that's a setup
      // gap, not a server error, so the frontend treats it the same as a
      // missing token.
      res.status(200).json({
        configured: false,
        reason: "Vercel's Web Analytics API said: " + err.message + ". This usually means Web Analytics isn't enabled for this project yet (Project -> Analytics -> Enable), or the token can't see it."
      });
      return;
    }
    res.status(502).json({ error: String((err && err.message) || err) });
  }
}
