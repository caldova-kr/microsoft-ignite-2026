/* Site tools — page-aware tools shared by the site agent and WebMCP (document.modelContext).
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

  var INSTANT = (function () {
    try { return JSON.parse(document.getElementById("__config").textContent).features.indexOf("navigation.instant") >= 0; } catch (e) { return false; }
  })();

  var knowledge = null;
  function loadKnowledge() {
    if (!knowledge) {
      knowledge = Promise.all([
        fetch(SITE_ROOT + "search/search_index.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch(SITE_ROOT + "catalog/sessions.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch(SITE_ROOT + "sessions/notes.json").then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; })
      ]).then(function (d) { return A.buildKnowledge(d[0], d[1], SITE_ROOT, d[2]); }, function (e) {
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
      description: "현재 페이지(제목·목차·선택한 텍스트)를 읽습니다.",
      parameters: { type: "object", properties: {} },
      readOnly: true
    },
    {
      name: "open_page",
      description: "사이트 안 페이지를 엽니다(anchor 를 주면 그 섹션을 강조).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "노트 경로·URL·세션 코드" },
          anchor: { type: "string", description: "섹션 앵커" }
        },
        required: ["path"]
      }
    },
    {
      name: "highlight_section",
      description: "현재 페이지의 섹션을 강조합니다.",
      parameters: {
        type: "object",
        properties: { anchor: { type: "string", description: "섹션 앵커" } },
        required: ["anchor"]
      }
    },
    {
      name: "filter_catalog",
      description: "카탈로그를 필터해 화면에 보여 줍니다.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "검색어" },
          type: { type: "string", description: "세션 타입" },
          topic: { type: "string", description: "토픽" },
          level: { type: "string", description: "레벨" },
          progress: { type: "string", enum: ["done", "review", "draft", "claimed", "proposed", "hold", "skip", "todo"], description: "정리 상태" },
          media: { type: "string", enum: ["video", "transcript", "slides", "none"], description: "미디어" }
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

  // With instant navigation the layout (and the chat) survives, so tools can move and keep going.
  function container() { return document.querySelector("[data-md-component=container]"); }

  function waitForPage(before, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        if (container() !== before || Date.now() - t0 > timeoutMs) return setTimeout(resolve, 60);
        setTimeout(poll, 50);
      })();
    });
  }

  function waitFor(test, timeoutMs) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() { if (test() || Date.now() - t0 > timeoutMs) return resolve(); setTimeout(poll, 80); })();
    });
  }

  // Click a temporary link the way Material does. If instant navigation did not take the click
  // (e.g. URL not in the sitemap), cancel it so a full reload cannot kill a running chat turn.
  function clickThrough(url) {
    var a = document.createElement("a");
    a.href = url;
    var handled = false;
    function probe(e) {
      if (e.target !== a) return;
      handled = e.defaultPrevented;
      if (!handled) e.preventDefault();
    }
    window.addEventListener("click", probe);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.removeEventListener("click", probe);
    return handled;
  }

  function openInstant(url, ctx) {
    var before = container();
    if (!clickThrough(url)) {
      ctx.navigate(url);
      return Promise.resolve({ navigating: url, note: "답을 마친 뒤 이동합니다." });
    }
    return waitForPage(before, 8000).then(function () {
      var id = new URL(url).hash.slice(1);
      var target = id && document.getElementById(id);
      if (target) flash(target);
      var cur = getCurrentPage();
      return { opened: cur.url + (id ? "#" + id : ""), title: cur.title, kind: cur.kind, headings: cur.headings.slice(0, 20) };
    });
  }

  function catalogSummaryReady() {
    var el = document.querySelector(".dg-cat-summary");
    return el && /sessions/.test(el.textContent);
  }

  // ctx.navigate(url): how to leave the page without instant navigation (chat: after the answer; WebMCP: now).
  function go(url, ctx) {
    if (INSTANT) return openInstant(url, ctx);
    ctx.navigate(url);
    return { navigating: url };
  }

  function runPageTool(name, args, ctx) {
    args = args || {};
    if (name === "get_current_page") return getCurrentPage();
    if (name === "highlight_section") return highlightSection(args);
    if (name === "filter_catalog") {
      var form = document.querySelector(".dg-cat-controls");
      if (form) return applyCatalogFilters(form, args);
      var url = catalogUrl(args);
      if (!INSTANT) { ctx.navigate(url); return { navigating: url }; }
      return openInstant(url, ctx).then(function (page) {
        if (page.navigating) return page;
        return waitFor(catalogSummaryReady, 5000).then(function () {
          var f = document.querySelector(".dg-cat-controls");
          var out = f ? applyCatalogFilters(f, args) : {};
          out.opened = page.opened;
          return out;
        });
      });
    }
    if (name === "open_page") {
      return loadKnowledge().catch(function () { return null; }).then(function (k) {
        var t = resolveTarget(k, args.path, args.anchor);
        if (t.error) return t;
        if (samePage(t.url)) {
          var id = new URL(t.url).hash.slice(1);
          return id ? highlightSection({ anchor: id }) : { already_here: t.url };
        }
        return go(t.url, ctx);
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

  var PAGE_PROMPT = "\"보여 줘·열어 줘\" 는 페이지 열기·섹션 강조·카탈로그 필터로 화면에서 보여 주고, \"이 페이지·선택한 부분\" 은 현재 페이지를 먼저 읽습니다.";

  window.IgniteSiteTools = {
    siteRoot: SITE_ROOT,
    instant: INSTANT,
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
      description: f.description,
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
      description: s.description,
      inputSchema: s.parameters,
      annotations: { readOnlyHint: !!s.readOnly },
      execute: function (args) {
        return Promise.resolve(runPageTool(s.name, args, { navigate: navigateNow })).then(asText);
      }
    });
  });
})();
