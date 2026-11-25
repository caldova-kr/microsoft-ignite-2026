/* GitHub device-flow relay — the only thing the static site cannot do itself.
 * GitHub's device endpoints send no CORS headers, so this forwards exactly two calls and adds them.
 * No secrets (device flow needs none), no storage, request/response bodies are never logged. */
"use strict";

const GITHUB = "https://github.com";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

function config(env) {
  return {
    clientId: (env.GITHUB_CLIENT_ID || "").trim(),
    scope: (env.GITHUB_SCOPE || "").trim(),
    origins: (env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean)
  };
}

function corsHeaders(origin, cfg) {
  if (!origin || cfg.origins.indexOf(origin) < 0) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  };
}

function reply(status, body, cors) {
  return {
    status,
    headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, cors || {}),
    body: body === null ? "" : JSON.stringify(body)
  };
}

// Only the fields GitHub needs, and only the fields the site needs back.
const ROUTES = {
  "device/code": {
    url: GITHUB + "/login/device/code",
    form: (cfg) => ({ client_id: cfg.clientId, scope: cfg.scope }),
    pick: ["device_code", "user_code", "verification_uri", "expires_in", "interval", "error", "error_description"]
  },
  token: {
    url: GITHUB + "/login/oauth/access_token",
    form: (cfg, input) => {
      if (input.device_code) return { client_id: cfg.clientId, device_code: String(input.device_code), grant_type: DEVICE_GRANT };
      // Device-flow tokens refresh without a client secret.
      if (input.refresh_token) return { client_id: cfg.clientId, refresh_token: String(input.refresh_token), grant_type: "refresh_token" };
      return null;
    },
    pick: ["access_token", "token_type", "scope", "expires_in", "refresh_token", "refresh_token_expires_in", "interval", "error", "error_description"]
  }
};

async function handle(req, env, fetchImpl) {
  const cfg = config(env);
  const cors = corsHeaders(req.origin, cfg);
  if (!cors) return reply(403, { error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return reply(204, null, cors);
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" }, cors);
  if (!cfg.clientId) return reply(503, { error: "relay_not_configured" }, cors);
  const route = ROUTES[req.route];
  if (!route) return reply(404, { error: "not_found" }, cors);

  const input = req.body && typeof req.body === "object" ? req.body : {};
  const form = route.form(cfg, input);
  if (!form) return reply(400, { error: "invalid_request" }, cors);
  Object.keys(form).forEach((k) => { if (!form[k]) delete form[k]; });

  let upstream;
  try {
    upstream = await fetchImpl(route.url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ignite-notes-auth-relay" },
      body: new URLSearchParams(form).toString()
    });
  } catch (e) {
    return reply(502, { error: "github_unreachable" }, cors);
  }
  let data = {};
  try { data = await upstream.json(); } catch (e) { data = { error: "bad_upstream_response" }; }
  const out = {};
  route.pick.forEach((k) => { if (data[k] !== undefined) out[k] = data[k]; });
  return reply(upstream.ok ? 200 : upstream.status, out, cors);
}

module.exports = { handle, config, corsHeaders };
