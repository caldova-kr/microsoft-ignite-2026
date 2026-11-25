import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { handle } = createRequire(import.meta.url)("../relay/src/relay.js");
const ORIGIN = "https://caldova-kr.github.io";
const ENV = { GITHUB_CLIENT_ID: "Iv1.test", ALLOWED_ORIGINS: ORIGIN + ", http://127.0.0.1:8000" };

function fakeGitHub(reply, seen) {
  return async (url, init) => {
    seen.push({ url, form: Object.fromEntries(new URLSearchParams(init.body)) });
    return { ok: true, status: 200, json: async () => reply };
  };
}

test("rejects other origins and answers preflight for allowed ones", async () => {
  const evil = await handle({ method: "POST", origin: "https://evil.example", route: "token", body: {} }, ENV, fakeGitHub({}, []));
  assert.equal(evil.status, 403);
  assert.equal(evil.headers["Access-Control-Allow-Origin"], undefined);
  const pre = await handle({ method: "OPTIONS", origin: ORIGIN, route: "token" }, ENV, null);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers["Access-Control-Allow-Origin"], ORIGIN);
});

test("device code uses the configured client id and returns only device fields", async () => {
  const seen = [];
  const r = await handle({ method: "POST", origin: ORIGIN, route: "device/code", body: { client_id: "attacker" } }, ENV,
    fakeGitHub({ device_code: "d", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 900, extra: "x" }, seen));
  assert.equal(r.status, 200);
  assert.deepEqual(seen[0], { url: "https://github.com/login/device/code", form: { client_id: "Iv1.test" } });
  assert.deepEqual(Object.keys(JSON.parse(r.body)).sort(), ["device_code", "expires_in", "interval", "user_code", "verification_uri"]);
});

test("token supports only device_code and refresh_token grants", async () => {
  const seen = [];
  const gh = fakeGitHub({ access_token: "ghu_x", refresh_token: "ghr_y", expires_in: 28800 }, seen);
  await handle({ method: "POST", origin: ORIGIN, route: "token", body: { device_code: "d" } }, ENV, gh);
  await handle({ method: "POST", origin: ORIGIN, route: "token", body: { refresh_token: "ghr_y" } }, ENV, gh);
  assert.deepEqual(seen.map((s) => s.form.grant_type), ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]);
  assert.ok(seen.every((s) => s.url === "https://github.com/login/oauth/access_token" && s.form.client_id === "Iv1.test" && !s.form.client_secret));
  const bad = await handle({ method: "POST", origin: ORIGIN, route: "token", body: { code: "web-flow-code" } }, ENV, gh);
  assert.equal(bad.status, 400);
});

test("unknown routes and a missing client id are refused", async () => {
  const nf = await handle({ method: "POST", origin: ORIGIN, route: "user", body: {} }, ENV, null);
  assert.equal(nf.status, 404);
  const off = await handle({ method: "POST", origin: ORIGIN, route: "token", body: { device_code: "d" } }, { ALLOWED_ORIGINS: ORIGIN }, null);
  assert.equal(off.status, 503);
});
