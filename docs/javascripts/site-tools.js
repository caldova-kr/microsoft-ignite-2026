/* Site tools — page-aware tools shared by the chatbot and WebMCP (document.modelContext).
 * Knowledge tools come from chat-agent.js; page tools read and drive this site's own UI.
 * Navigation is the only side effect, and it never leaves this site. */
(function () {
  "use strict";

  var A = window.IgniteChatAgent;
  if (!A) return;

  var script = document.currentScript;
  var SITE_ROOT = new URL("..", script && script.src ? script.src : location.href).href;
  var FLASH_KEY = "icn-flash";
  var CATALOG_FIELDS = { text: "q", type: "type", topic: "topic", level: "level", tag: "tag", progress: "progress", media: "media" };

  var knowledge = null;
  function loadKnowledge() {
    if (!knowledge) {
      knowledge = Promise.all([
        fetch(SITE_ROOT + "search/search_index.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch(SITE_ROOT + "catalog/sessions.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      ]).then(function (d) { return A.buildKnowledge(d[0], d[1], SITE_ROOT); }, function (e) {
        knowledge = null;
        throw new A.ChatError("knowledge", "사이트 노트 데이터를 불러오지 못했습니다 (" + e.message + ").");
      });
    }
    return knowledge;
  }

  // Remember the last text the visitor selected on the page (focusing the chat input clears it).
  var lastSelection = "";
  document.addEventListener("selectionchange", function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (node && node.closest && node.closest(".icn-chat")) return;
    lastSelection = sel.toString().trim().slice(0, 600);
  });

  function sitePath(url) {
    var u = new URL(url, location.href);
    return u.href.indexOf(SITE_ROOT) === 0 ? u.href.slice(SITE_ROOT.length).split(/[?#]/)[0] : null;
  }

  function pageKind(path) {
    if (path === "") return "home";
    if (/^catalog\//.test(path)) return "catalog";
    if (/^(sessions|themes)\/[^/]+\/$/.test(path)) return "note";
    return "page";
  }

  function article() { return document.querySelector(".md-content article") || document.body; }

  function headings() {
    return [].map.call(article().querySelectorAll("h2[id], h3[id]"), function (h) {
      return { anchor: h.id, text: h.textContent.replace(/¶$/, "").trim(), level: Number(h.tagName[1]) };
    });
  }

  function visibleAnchor() {
    var current = "";
    [].some.call(article().querySelectorAll("h2[id], h3[id]"), function (h) {
      if (h.getBoundingClientRect().top > 120) return true;
      current = h.id;
      return false;
    });
    return current;
  }

  function flash(target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.remove("icn-flash");
    void target.offsetWidth;
    target.classList.add("icn-flash");
    setTimeout(function () { target.classList.remove("icn-flash"); }, 2600);
  }

  // Resolve "sessions/KEY01-…/", a full site URL or a session code to a URL on this site.
  function resolveTarget(k, path, anchor) {
    var p = String(path || "").trim();
    if (/^[A-Za-z]+\d+[A-Za-z]?$/.test(p)) {
      var s = k && k.byCode[p.toUpperCase()];
      if (!s) return { error: "카탈로그에 없는 세션 코드입니다." };
      if (!s.n) return { error: "이 세션은 아직 노트가 없습니다. 세션 페이지: " + s.u };
      p = s.n;
    }
    if (/^https?:\/\//.test(p) && p.indexOf(SITE_ROOT) !== 0) return { error: "이 사이트 밖으로는 이동하지 않습니다." };
    var u = /^\//.test(p) ? new URL(p, location.origin) : new URL(p, SITE_ROOT);
    // "/sessions/…" written without the site's base path still means a page on this site.
    if (u.href.indexOf(SITE_ROOT) !== 0 && /^\//.test(p)) u = new URL(p.slice(1), SITE_ROOT);
    if (anchor) u.hash = String(anchor).replace(/^#/, "");
    if (u.href.indexOf(SITE_ROOT) !== 0) return { error: "이 사이트 밖으로는 이동하지 않습니다." };
    return { url: u.href };
  }

  function samePage(url) {
    var u = new URL(url);
    return u.pathname === location.pathname && u.search === location.search;
  }

  // ---------- page tools ----------

  var SPECS = [
    {
      name: "get_current_page",
      description: "사용자가 지금 보고 있는 이 사이트 페이지의 제목·URL·종류(home/note/catalog)·목차(앵커)·현재 보이는 섹션·사용자가 선택한 텍스트를 읽습니다.",
      parameters: { type: "object", properties: {} },
      readOnly: true
    },
    {
      name: "open_page",
      description: "이 사이트 안의 페이지(노트·카탈로그·홈)로 이동합니다. 노트 경로, 사이트 URL 또는 노트가 있는 세션 코드를 받고, anchor 를 주면 그 섹션을 강조합니다. 채팅에서는 답을 마친 뒤 이동합니다.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "예: sessions/KEY01-…/, catalog/, KEY01" },
          anchor: { type: "string", description: "섹션 앵커 (예: tldr, ga)" }
        },
        required: ["path"]
      }
    },
    {
      name: "highlight_section",
      description: "현재 페이지의 섹션으로 스크롤하고 잠시 강조합니다. 앵커는 get_current_page 목차나 노트 섹션 URL 의 # 뒤 값입니다.",
      parameters: {
        type: "object",
        properties: { anchor: { type: "string", description: "섹션 앵커" } },
        required: ["anchor"]
      }
    },
    {
      name: "filter_catalog",
      description: "세션 카탈로그 탐색기의 필터를 적용해 화면에 보여 줍니다. 카탈로그 페이지가 아니면 필터가 걸린 카탈로그로 이동합니다.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "검색어 (코드·제목·발표자·태그)" },
          type: { type: "string", description: "세션 타입 (예: Breakout, Keynote, Lab)" },
          topic: { type: "string", description: "카탈로그 토픽 (예: Agent Platform)" },
          level: { type: "string", description: "레벨 (100·200·300·400)" },
          progress: { type: "string", enum: ["done", "review", "draft", "claimed", "proposed", "hold", "skip", "todo"], description: "정리 상태" },
          media: { type: "string", enum: ["video", "transcript", "slides", "none"], description: "미디어 조건" }
        }
      }
    }
  ];

  function getCurrentPage() {
    var path = sitePath(location.href);
    var out = {
      title: document.title,
      url: location.href.split("#")[0],
      path: path,
      kind: pageKind(path || ""),
      headings: headings().slice(0, 40),
      visible_section: visibleAnchor(),
      selected_text: lastSelection
    };
    if (out.kind === "catalog") {
      var summary = document.querySelector(".dg-cat-summary");
      out.catalog_summary = summary ? summary.textContent.trim() : "";
    }
    return out;
  }

  function highlightSection(args) {
    var id = String((args && args.anchor) || "").replace(/^#/, "");
    var target = id && document.getElementById(id);
    if (!target) return { error: "이 페이지에 그런 섹션이 없습니다.", anchors: headings().map(function (h) { return h.anchor; }) };
    flash(target);
    return { highlighted: id, heading: target.textContent.replace(/¶$/, "").trim() };
  }

  function catalogUrl(args) {
    var p = new URLSearchParams();
    Object.keys(CATALOG_FIELDS).forEach(function (k) { if (args[k]) p.set(k, String(args[k])); });
    var qs = p.toString();
    return SITE_ROOT + "catalog/" + (qs ? "?" + qs : "");
  }

  function applyCatalogFilters(form, args) {
    var applied = {};
    var rejected = {};
    form.reset();
    Object.keys(CATALOG_FIELDS).forEach(function (k) {
      if (!args[k]) return;
      var field = form.elements[CATALOG_FIELDS[k]];
      var v = String(args[k]);
      if (field.tagName === "SELECT" && ![].some.call(field.options, function (o) { return o.value === v; })) { rejected[k] = v; return; }
      field.value = v;
      applied[k] = v;
    });
    form.dispatchEvent(new Event("change", { bubbles: true }));
    var summary = document.querySelector(".dg-cat-summary");
    return { applied: applied, rejected: rejected, summary: summary ? summary.textContent.trim() : "" };
  }

  // ctx.navigate(url) decides when to leave the page (chat: after the answer; WebMCP: now).
  function runPageTool(name, args, ctx) {
    args = args || {};
    if (name === "get_current_page") return getCurrentPage();
    if (name === "highlight_section") return highlightSection(args);
    if (name === "filter_catalog") {
      var form = document.querySelector(".dg-cat-controls");
      if (form) return applyCatalogFilters(form, args);
      var url = catalogUrl(args);
      ctx.navigate(url);
      return { navigating: url };
    }
    if (name === "open_page") {
      return loadKnowledge().catch(function () { return null; }).then(function (k) {
        var t = resolveTarget(k, args.path, args.anchor);
        if (t.error) return t;
        if (samePage(t.url)) {
          var id = new URL(t.url).hash.slice(1);
          return id ? highlightSection({ anchor: id }) : { already_here: t.url };
        }
        ctx.navigate(t.url);
        return { navigating: t.url };
      });
    }
    return { error: "알 수 없는 도구: " + name };
  }

  // After navigation with an anchor, highlight it once the new page loads.
  function navigateNow(url) {
    var hash = new URL(url).hash.slice(1);
    if (hash) { try { sessionStorage.setItem(FLASH_KEY, hash); } catch (e) { /* ignore */ } }
    location.href = url;
  }

  try {
    var pendingFlash = sessionStorage.getItem(FLASH_KEY);
    if (pendingFlash) {
      sessionStorage.removeItem(FLASH_KEY);
      var t = document.getElementById(pendingFlash);
      if (t) setTimeout(function () { flash(t); }, 300);
    }
  } catch (e) { /* ignore */ }

  var PAGE_PROMPT = "9. 사이트 탐색: 사용자가 노트·섹션·카탈로그를 \"보여 줘·열어 줘·이동해 줘\" 라고 하면 내용을 본문에 옮겨 적지 말고 open_page(섹션은 anchor 포함) / highlight_section / filter_catalog 로 화면에서 직접 보여 주고, 본문에는 무엇을 보여 주는지와 핵심 한두 문장만 씁니다. \"이 페이지·이 부분·선택한 내용\" 은 get_current_page 로 먼저 읽습니다. 다른 페이지 이동은 답을 마친 뒤 실행됩니다.";

  window.IgniteSiteTools = {
    siteRoot: SITE_ROOT,
    loadKnowledge: loadKnowledge,
    navigateNow: navigateNow,
    // Shape consumed by IgniteChatAgent.runAgent({ extraTools })
    forChat: function (navigate) {
      return {
        prompt: PAGE_PROMPT,
        specs: SPECS.map(function (s) { return { type: "function", function: { name: s.name, description: s.description, parameters: s.parameters } }; }),
        has: function (name) { return SPECS.some(function (s) { return s.name === name; }); },
        run: function (name, args) { return Promise.resolve(runPageTool(name, args, { navigate: navigate })); }
      };
    }
  };

  // ---------- WebMCP: expose the same tools to the browser's own agent ----------

  var mc = document.modelContext || navigator.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;

  function asText(v) { return typeof v === "string" ? v : JSON.stringify(v); }

  // Early-preview API: a failed registration must never break the page.
  function register(def) {
    try {
      var p = mc.registerTool(def);
      if (p && typeof p.catch === "function") p.catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  A.TOOL_SPECS.forEach(function (t) {
    var f = t.function;
    register({
      name: f.name,
      description: "[Ignite 2026 Session Notes] " + f.description,
      inputSchema: f.parameters,
      annotations: { readOnlyHint: true },
      execute: function (args) {
        return loadKnowledge().then(function (k) { return asText(A.runTool(k, f.name, args || {})); });
      }
    });
  });
  SPECS.forEach(function (s) {
    register({
      name: s.name,
      description: "[Ignite 2026 Session Notes] " + s.description.replace(" 채팅에서는 답을 마친 뒤 이동합니다.", ""),
      inputSchema: s.parameters,
      annotations: { readOnlyHint: !!s.readOnly },
      execute: function (args) {
        return Promise.resolve(runPageTool(s.name, args, { navigate: navigateNow })).then(asText);
      }
    });
  });
})();
