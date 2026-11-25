import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const A = createRequire(import.meta.url)("../docs/javascripts/chat-agent.js");
const ROOT = "https://caldova-kr.github.io/microsoft-ignite-2026/";

const INDEX = {
  docs: [
    { location: "", title: "Home", text: "<p>홈</p>" },
    { location: "sessions/", title: "세션 노트", text: "<p>목록 Foundry</p>" },
    { location: "sessions/KEY01-keynote/", title: "[KEY01] Opening keynote", text: "<p>Keynote</p>" },
    { location: "sessions/KEY01-keynote/#tldr", title: "TL;DR", text: "<p>Human Ambition · Intelligence · Trust</p>" },
    { location: "sessions/KEY01-keynote/#foundry", title: "Microsoft Foundry", text: "<p>에이전트 플랫폼 &amp; 평가 보안은 Perception</p>" },
    { location: "catalog/", title: "카탈로그", text: "<p>Foundry</p>" }
  ]
};
const CATALOG = [
  { c: "KEY01", t: "Microsoft Ignite opening keynote", y: "Keynote", p: ["Copilot"], s: ["Satya Nadella"], u: "https://ignite.microsoft.com/en-US/sessions/KEY01", o: true, n: "sessions/KEY01-keynote/", x: "abstract" },
  { c: "BRK220", t: "Build agents with Foundry", y: "Breakout", p: ["Agent Platform"], s: ["Jane Doe"], u: "https://ignite.microsoft.com/en-US/sessions/BRK220", o: true, n: "", x: "planned" }
];
const k = () => A.buildKnowledge(INDEX, CATALOG, ROOT);

test("search_notes only covers note pages and matches Korean words with particles", () => {
  const r = A.runTool(k(), "search_notes", JSON.stringify({ query: "보안을 Foundry" }));
  assert.equal(r.note_count, 1);
  assert.ok(r.results.length >= 1);
  assert.equal(r.results[0].url, ROOT + "sessions/KEY01-keynote/#foundry");
  assert.ok(r.results.every((x) => x.path === "sessions/KEY01-keynote/"));
});

test("get_note resolves code, URL and path to the same note with section links", () => {
  const kn = k();
  const byCode = A.runTool(kn, "get_note", { path: "key01" });
  const byUrl = A.runTool(kn, "get_note", { path: ROOT + "sessions/KEY01-keynote/#tldr" });
  assert.equal(byCode.url, ROOT + "sessions/KEY01-keynote/");
  assert.deepEqual(byUrl, byCode);
  assert.match(byCode.content, /## Microsoft Foundry \(https:\/\/caldova-kr\.github\.io\/microsoft-ignite-2026\/sessions\/KEY01-keynote\/#foundry\)/);
  assert.match(byCode.content, /에이전트 플랫폼 & 평가/);
  assert.ok(A.runTool(kn, "get_note", { path: "BRK220" }).error, "sessions without a note have no note");
});

test("search_catalog filters and exposes note links; get_session marks the abstract as planned", () => {
  const kn = k();
  assert.deepEqual(A.runTool(kn, "search_catalog", { has_note: true }).results.map((s) => s.code), ["KEY01"]);
  const r = A.runTool(kn, "search_catalog", { query: "foundry agents" });
  assert.equal(r.results[0].code, "BRK220");
  assert.equal(r.results[0].note_url, null);
  const s = A.runTool(kn, "get_session", { code: "brk220" });
  assert.equal(s.catalog_abstract_planned, "planned");
  assert.ok(A.runTool(kn, "unknown_tool", {}).error);
});

function sse(events) {
  const enc = new TextEncoder();
  // Split mid-line to exercise buffering across chunks.
  const text = events.map((e) => "data: " + JSON.stringify(e) + "\n\n").join("") + "data: [DONE]\n\n";
  const chunks = [text.slice(0, 17), text.slice(17)];
  return new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } });
}

function fakeFetch(responses, seen) {
  return async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, body: sse(responses.shift()) };
  };
}

test("runAgent executes streamed tool calls and returns the final answer", async () => {
  const seen = [];
  const fetchImpl = fakeFetch([
    [
      { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "search_notes", arguments: "{\"que" } }] } }] },
      { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: "ry\":\"Foundry\"}" } }] } }] }
    ],
    [{ choices: [{ index: 0, delta: { content: "답: " } }] }, { choices: [{ index: 0, delta: { content: "Foundry" } }] }]
  ], seen);
  const tools = [];
  let streamed = "";
  const r = await A.runAgent({
    fetchImpl, token: "t", model: "m", knowledge: k(), history: [{ role: "user", content: "Foundry?" }],
    page: { title: "KEY01", url: ROOT + "sessions/KEY01-keynote/" },
    onText: (d) => { streamed += d; },
    onToolStart: (e) => tools.push(["start", e.name, e.kind]), onToolEnd: (e) => tools.push(["end", e.name, e.result.results.length])
  });
  assert.equal(r.text, "답: Foundry");
  assert.equal(streamed, r.text);
  assert.deepEqual(tools, [["start", "search_notes", "tool"], ["end", "search_notes", 1]]);
  assert.equal(seen[0].url, "https://api.githubcopilot.com/chat/completions");
  assert.match(seen[0].body.messages[0].content, /사용자가 지금 보고 있는 페이지: KEY01/);
  const second = seen[1].body.messages;
  assert.equal(second.at(-2).tool_calls[0].function.name, "search_notes");
  assert.equal(second.at(-1).role, "tool");
  assert.equal(JSON.parse(second.at(-1).content).results[0].path, "sessions/KEY01-keynote/");
});

test("runAgent stops offering tools after the round limit", async () => {
  const seen = [];
  const loop = () => [{ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "x", function: { name: "get_session", arguments: "{\"code\":\"KEY01\"}" } }] } }] }];
  const fetchImpl = fakeFetch([loop(), loop(), loop(), loop(), loop(), [{ choices: [{ index: 0, delta: { content: "끝" } }] }]], seen);
  const r = await A.runAgent({ fetchImpl, token: "t", model: "m", knowledge: k(), history: [{ role: "user", content: "?" }] });
  assert.equal(r.text, "끝");
  assert.equal(seen.length, 6);
  assert.equal(seen.at(-1).body.tools, undefined);
});

test("API errors map to user-facing kinds", async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, text: async () => "bad" });
  await assert.rejects(A.listModels(fetchImpl, "t"), (e) => e.kind === "auth");
});

test("listModels keeps only picker-enabled chat models with tool calls on /chat/completions", async () => {
  const data = [
    { id: "a", name: "A", model_picker_enabled: true, supported_endpoints: ["/chat/completions"], capabilities: { type: "chat", supports: { tool_calls: true } } },
    { id: "b", model_picker_enabled: true, supported_endpoints: ["/responses"], capabilities: { type: "chat", supports: { tool_calls: true } } },
    { id: "c", model_picker_enabled: false, capabilities: { type: "chat", supports: { tool_calls: true } } },
    { id: "d", model_picker_enabled: true, capabilities: { type: "embeddings", supports: {} } }
  ];
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ data }) });
  assert.deepEqual((await A.listModels(fetchImpl, "t")).map((m) => m.id), ["a"]);
});

test("renderMarkdown escapes HTML and only allows safe links", () => {
  const html = A.renderMarkdown("<img src=x onerror=alert(1)> **굵게** `code`\n- [노트](sessions/KEY01-keynote/)\n- [x](javascript:alert(1))\n- https://ignite.microsoft.com/a?b=1&c=2", ROOT);
  assert.ok(!html.includes("<img"));
  assert.match(html, /&lt;img/);
  assert.match(html, /<strong>굵게<\/strong> <code>code<\/code>/);
  assert.match(html, new RegExp('<a href="' + ROOT + 'sessions/KEY01-keynote/">노트</a>'));
  assert.ok(!/href="javascript/i.test(html));
  assert.match(html, /<a href="https:\/\/ignite\.microsoft\.com\/a\?b=1&amp;c=2" target="_blank" rel="noopener">/);
});

test("token template asks for the Copilot requests permission only", () => {
  const u = new URL(A.TOKEN_CREATE_URL);
  assert.equal(u.searchParams.get("copilot_requests"), "write");
  assert.deepEqual([...u.searchParams.keys()].sort(), ["copilot_requests", "description", "expires_in", "name"]);
});

const call = (id, name, args) => ({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id, function: { name, arguments: JSON.stringify(args) } }] } }] });
const say = (text) => ({ choices: [{ index: 0, delta: { content: text } }] });

test("component tools render from site data and end the turn once text was written", async () => {
  const seen = [];
  const fetchImpl = fakeFetch([[say("두 세션입니다."), call("u1", "show_sessions", { codes: ["key01", "BRK220", "NOPE1", "KEY01"] })]], seen);
  const ends = [];
  const r = await A.runAgent({ fetchImpl, token: "t", model: "m", knowledge: k(), history: [{ role: "user", content: "?" }], onToolEnd: (e) => ends.push(e) });
  assert.equal(seen.length, 1, "no extra model round after a display-only component");
  assert.equal(r.text, "두 세션입니다.");
  const d = ends[0].result;
  assert.deepEqual(d.items.map((s) => [s.code, s.note_url]), [["KEY01", ROOT + "sessions/KEY01-keynote/"], ["BRK220", null]]);
  assert.deepEqual(d.missing, ["NOPE1"]);
  assert.equal(ends[0].kind, "render");
});

test("show_sources keeps only real note sections and tells the model what was shown", async () => {
  const seen = [];
  const fetchImpl = fakeFetch([
    [call("s1", "show_sources", { urls: [ROOT + "sessions/KEY01-keynote/#foundry", "sessions/KEY01-keynote/#foundry", "https://example.com/x"] })],
    [say("끝")]
  ], seen);
  const ends = [];
  await A.runAgent({ fetchImpl, token: "t", model: "m", knowledge: k(), history: [{ role: "user", content: "?" }], onToolEnd: (e) => ends.push(e) });
  assert.deepEqual(ends[0].result.items.map((s) => [s.section, s.url]), [["Microsoft Foundry", ROOT + "sessions/KEY01-keynote/#foundry"]]);
  assert.deepEqual(JSON.parse(seen[1].body.messages.at(-1).content), { shown: 1, missing: ["https://example.com/x"] });
});

test("ask_user_choice waits for the user and returns the pick to the model", async () => {
  const seen = [];
  const fetchImpl = fakeFetch([[call("q1", "ask_user_choice", { question: "어느 토픽?", options: ["Security", "Data", "", "Copilot"] })], [say("Security 기준으로 답합니다.")]], seen);
  let asked;
  const r = await A.runAgent({
    fetchImpl, token: "t", model: "m", knowledge: k(), history: [{ role: "user", content: "?" }],
    onInteract: async (e) => { asked = e.args; return { chosen: e.args.options[0] }; }
  });
  assert.deepEqual(asked, { question: "어느 토픽?", options: ["Security", "Data", "Copilot"] });
  assert.deepEqual(JSON.parse(seen[1].body.messages.at(-1).content), { chosen: "Security" });
  assert.equal(r.text, "Security 기준으로 답합니다.");
  assert.ok(seen[0].body.tools.some((t) => t.function.name === "ask_user_choice"));
});
