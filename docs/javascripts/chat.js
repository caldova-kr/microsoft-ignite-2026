/* Site chatbot panel — vanilla JS, no dependencies. Logic: chat-agent.js (window.IgniteChatAgent). */
(function () {
  "use strict";

  var A = window.IgniteChatAgent;
  if (!A || !window.fetch || !window.ReadableStream || !window.TextDecoder) return;

  var script = document.currentScript;
  var SITE_ROOT = new URL("..", script && script.src ? script.src : location.href).href;
  var K = { token: "icn-chat-token", profile: "icn-chat-profile", history: "icn-chat-history", open: "icn-chat-open", model: "icn-chat-model" };
  var HISTORY_LIMIT = 12;
  var homeMount = document.getElementById("icn-chat-home");
  var SUGGESTIONS = homeMount
    ? ["키노트의 핵심 의제가 뭐야?", "노트가 정리된 세션은 어떤 게 있어?", "키노트에서 GA 로 발표된 건 뭐야?", "Agent Platform 토픽 세션 찾아 줘"]
    : ["이 페이지 내용을 요약해 줘", "노트가 정리된 세션은 어떤 게 있어?", "키노트에서 GA 로 발표된 건 뭐야?"];
  var inline = false;

  // ---------- storage (private mode / disabled storage must not break the page) ----------

  function get(area, key) { try { return window[area].getItem(key); } catch (e) { return null; } }
  function set(area, key, value) { try { window[area].setItem(key, value); } catch (e) { /* ignore */ } }
  function del(area, key) { try { window[area].removeItem(key); } catch (e) { /* ignore */ } }
  function getJson(area, key, fallback) { try { return JSON.parse(get(area, key)) || fallback; } catch (e) { return fallback; } }

  function token() { return get("sessionStorage", K.token) || get("localStorage", K.token) || ""; }

  function saveToken(t, remember) {
    del("sessionStorage", K.token);
    del("localStorage", K.token);
    set(remember ? "localStorage" : "sessionStorage", K.token, t);
  }

  function forget() {
    del("sessionStorage", K.token);
    del("localStorage", K.token);
    del("sessionStorage", K.profile);
  }

  var history = getJson("sessionStorage", K.history, []);
  function saveHistory() { set("sessionStorage", K.history, JSON.stringify(history.slice(-HISTORY_LIMIT * 2))); }

  // ---------- DOM ----------

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  var fab = el("button", { class: "icn-chat-fab", type: "button", "aria-expanded": "false", "aria-controls": "icn-chat", onclick: function () { toggle(); } }, [
    el("span", { "aria-hidden": "true", text: "💬" }), el("span", { text: "노트에 물어보기" })
  ]);
  var userBox = el("div", { class: "icn-chat__user" });
  var newBtn = el("button", { class: "icn-chat__icon", type: "button", title: "새 대화", "aria-label": "새 대화", text: "↺", onclick: function () { resetChat(); } });
  var closeBtn = el("button", { class: "icn-chat__icon", type: "button", title: "닫기", "aria-label": "닫기", text: "✕", onclick: function () { toggle(false); } });
  var body = el("div", { class: "icn-chat__body", "aria-live": "polite" });
  var modelSel = el("select", { class: "icn-chat__model", "aria-label": "모델 선택", onchange: function () { set("localStorage", K.model, modelSel.value); } });
  var input = el("textarea", { class: "icn-chat__input", rows: "2", placeholder: "이 사이트 노트에 대해 물어보세요 (Enter 전송 · Shift+Enter 줄바꿈)", "aria-label": "질문" });
  var sendBtn = el("button", { class: "icn-chat__send", type: "button", text: "보내기", onclick: function () { busy ? stop() : submit(); } });
  var foot = el("footer", { class: "icn-chat__foot" }, [
    el("div", { class: "icn-chat__row" }, [input, sendBtn]),
    el("div", { class: "icn-chat__meta" }, [
      modelSel,
      el("span", { text: "노트만 근거 · 본인 Copilot 사용량 차감" }),
      el("button", { class: "icn-chat__link", type: "button", text: "연결 해제", onclick: function () { disconnect(); } })
    ])
  ]);
  var panel = el("section", { class: "icn-chat", id: "icn-chat", role: "dialog", "aria-label": "노트 챗봇", hidden: "" }, [
    el("header", { class: "icn-chat__head" }, [
      el("div", { class: "icn-chat__title" }, [el("strong", { text: "노트 챗봇" }), el("span", { text: "Ignite 2026 Session Notes" })]),
      userBox, newBtn, closeBtn
    ]),
    body,
    foot
  ]);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
  });
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape" && !inline) toggle(false); });

  // ---------- state ----------

  var profile = getJson("sessionStorage", K.profile, null);
  var busy = false;
  var controller = null;
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

  function toggle(open) {
    if (inline) return;
    var show = open === undefined ? panel.hidden : open;
    panel.hidden = !show;
    fab.setAttribute("aria-expanded", String(show));
    fab.classList.toggle("icn-chat-fab--open", show);
    set("sessionStorage", K.open, show ? "1" : "");
    if (show) { render(); setTimeout(function () { (token() ? input : body.querySelector("input") || closeBtn).focus(); }, 0); }
  }

  function render() {
    var t = token();
    foot.hidden = !t;
    newBtn.hidden = !t;
    closeBtn.hidden = inline;
    userBox.textContent = "";
    panel.classList.toggle("icn-chat--empty", !t || !history.length);
    if (!t) return renderSetup();
    if (!profile) return connect(t, null);
    userBox.appendChild(el("img", { src: profile.avatar, alt: "", width: "20", height: "20" }));
    userBox.appendChild(el("span", { text: profile.login }));
    renderModels();
    renderHistory();
  }

  function renderModels() {
    var saved = get("localStorage", K.model);
    var ids = profile.models.map(function (m) { return m.id; });
    var pick = ids.indexOf(saved) >= 0 ? saved : (ids.filter(function (id) { return /haiku|flash|mini/i.test(id); })[0] || ids[0]);
    modelSel.textContent = "";
    profile.models.forEach(function (m) { modelSel.appendChild(el("option", { value: m.id, text: m.name })); });
    modelSel.value = pick;
  }

  function renderSetup(error) {
    body.textContent = "";
    var tokenInput = el("input", { class: "icn-chat__token", type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…", "aria-label": "GitHub 토큰" });
    var remember = el("input", { type: "checkbox", id: "icn-chat-remember" });
    var err = el("p", { class: "icn-chat__error", role: "alert", text: error || "" });
    var go = el("button", { class: "icn-chat__send", type: "button", text: "연결", onclick: function () {
      var t = tokenInput.value.trim();
      if (/^ghp_/.test(t)) { err.textContent = "Classic 토큰(ghp_)은 Copilot 이 지원하지 않습니다. 위 링크로 fine-grained 토큰을 만들어 주세요."; return; }
      if (!/^(github_pat_|gho_|ghu_)/.test(t)) { err.textContent = "github_pat_ 로 시작하는 fine-grained 토큰을 붙여 넣어 주세요."; return; }
      connect(t, remember.checked);
    } });
    tokenInput.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    panel.classList.add("icn-chat--empty");
    if (inline) body.appendChild(el("h2", { class: "icn-chat__hello", text: "Ignite 2026 노트에 무엇이든 물어보세요" }));
    body.appendChild(el("div", { class: "icn-chat__setup" }, [
      el("p", { text: "이 사이트에 정리된 노트·카탈로그만 근거로 답하는 챗봇입니다. 모델은 여러분의 GitHub Copilot 을 씁니다." }),
      el("ol", {}, [
        el("li", {}, [
          el("a", { href: A.TOKEN_CREATE_URL, target: "_blank", rel: "noopener", text: "GitHub 에서 토큰 만들기" }),
          el("span", { text: " — 권한은 Copilot requests 하나만 미리 선택됩니다 (리포지토리 접근 없음, 30일 만료). Generate token 을 누르고 토큰을 복사합니다." })
        ]),
        el("li", {}, [el("span", { text: "복사한 토큰을 붙여 넣고 연결합니다." })])
      ]),
      el("div", { class: "icn-chat__row" }, [tokenInput, go]),
      el("label", { class: "icn-chat__check", for: "icn-chat-remember" }, [remember, el("span", { text: " 이 브라우저에 기억 (끄면 탭을 닫을 때 지워집니다)" })]),
      err,
      el("p", { class: "icn-chat__fine", text: "토큰은 이 브라우저에서 GitHub(api.github.com · api.githubcopilot.com)로만 전송되며 사이트에는 서버가 없습니다. 대화마다 본인 Copilot premium requests 가 차감됩니다." })
    ]));
  }

  function connect(t, remember) {
    body.textContent = "";
    body.appendChild(el("p", { class: "icn-chat__status", text: "GitHub 계정을 확인하는 중…" }));
    Promise.all([A.getUser(fetch.bind(window), t), A.listModels(fetch.bind(window), t)]).then(function (r) {
      if (!r[1].length) throw new A.ChatError("forbidden", "이 계정에서 쓸 수 있는 Copilot 채팅 모델이 없습니다.");
      if (remember !== null) saveToken(t, remember);
      profile = { login: r[0].login, avatar: r[0].avatar, models: r[1] };
      set("sessionStorage", K.profile, JSON.stringify(profile));
      render();
      input.focus();
    }).catch(function (e) {
      var msg = (e && e.message) || String(e);
      if (remember === null && e && e.kind !== "auth" && e.kind !== "forbidden") {
        // Stored token, transient failure: keep the token and offer a retry.
        body.textContent = "";
        body.appendChild(el("p", { class: "icn-chat__error", role: "alert", text: msg }));
        body.appendChild(el("button", { class: "icn-chat__send", type: "button", text: "다시 시도", onclick: function () { connect(t, null); } }));
        return;
      }
      forget();
      profile = null;
      render();
      renderSetup(msg);
    });
  }

  function disconnect() {
    stop();
    forget();
    profile = null;
    render();
  }

  function resetChat() {
    stop();
    history = [];
    saveHistory();
    renderHistory();
    input.focus();
  }

  // ---------- conversation (CopilotKit-style generative UI) ----------
  // An assistant turn is an ordered list of parts: text, tool cards (tool rendering),
  // components (components as tools) and choices (human-in-the-loop). Parts are stored so
  // the turn can be redrawn after navigating to another page.

  function isExternal(url) { return String(url).indexOf(SITE_ROOT) !== 0; }

  function linkEl(href, text) {
    var a = el("a", { href: href, text: text });
    if (isExternal(href)) { a.target = "_blank"; a.rel = "noopener"; }
    return a;
  }

  var TOOL_LABEL = {
    search_notes: function (a) { return "🔎 노트 검색 · " + (a.query || ""); },
    get_note: function (a) { return "📄 노트 읽기 · " + (a.path || ""); },
    search_catalog: function (a) { return "🗂️ 카탈로그 검색 · " + [a.query, a.type, a.topic, a.has_note ? "노트 있음" : ""].filter(Boolean).join(" · "); },
    get_session: function (a) { return "🎫 세션 정보 · " + (a.code || ""); }
  };

  function toolSummary(name, r) {
    if (!r || r.error) return { status: (r && r.error) || "결과 없음", links: [] };
    if (name === "search_notes") {
      return { status: "섹션 " + r.results.length + "건", links: r.results.slice(0, 5).map(function (x) { return { text: x.note + " › " + x.section, url: x.url }; }) };
    }
    if (name === "get_note") return { status: r.title, links: [{ text: r.title, url: r.url }] };
    if (name === "search_catalog") {
      return {
        status: "세션 " + r.results.length + "건" + (r.total > r.results.length ? " / 전체 " + r.total : ""),
        links: r.results.slice(0, 5).map(function (s) { return { text: s.code + " · " + s.title, url: s.note_url || s.session_page }; })
      };
    }
    if (name === "get_session") return { status: r.code + " · " + r.title, links: [{ text: r.note_url ? "노트 보기" : "세션 페이지", url: r.note_url || r.session_page }] };
    return { status: "완료", links: [] };
  }

  // Tool rendering: one compact, expandable card per data tool call.
  function toolCard(p) {
    var label = (TOOL_LABEL[p.name] || function () { return p.name; })(p.args || {});
    var links = p.done ? p.summary.links : [];
    var card = el("details", { class: "icn-tool" + (p.done ? "" : " icn-tool--running") + (links.length ? "" : " icn-tool--flat") }, [
      el("summary", {}, [el("span", { class: "icn-tool__label", text: label }), el("span", { class: "icn-tool__status", text: p.done ? p.summary.status : "실행 중…" })])
    ]);
    if (links.length) card.appendChild(el("ul", {}, links.map(function (l) { return el("li", {}, [linkEl(l.url, l.text)]); })));
    return card;
  }

  // Components as tools: cards filled from the catalog, not from model text.
  function sessionCards(d) {
    var wrap = el("div", { class: "icn-gen" });
    if (d.title) wrap.appendChild(el("p", { class: "icn-gen__title", text: d.title }));
    wrap.appendChild(el("div", { class: "icn-cards" }, d.items.map(function (s) {
      return el("article", { class: "icn-card" + (s.note_url ? " icn-card--note" : "") }, [
        el("div", { class: "icn-card__meta" }, [el("code", { text: s.code }), el("span", { text: s.type || "" }), s.duration_min ? el("span", { text: s.duration_min + "분" }) : null]),
        el("strong", { class: "icn-card__title", text: s.title }),
        s.speakers.length ? el("span", { class: "icn-card__sub", text: s.speakers.join(", ") }) : null,
        s.topics.length ? el("span", { class: "icn-card__sub", text: s.topics.slice(0, 3).join(" · ") }) : null,
        el("div", { class: "icn-card__links" }, [
          s.note_url ? linkEl(s.note_url, "📝 노트 보기") : el("span", { class: "icn-card__nonote", text: "노트 없음" }),
          linkEl(s.session_page, "세션 페이지 ↗"),
          s.video ? linkEl(s.video, "▶ 영상 ↗") : null
        ])
      ]);
    })));
    if (d.missing.length) wrap.appendChild(el("p", { class: "icn-chat__fine", text: "카탈로그에 없는 코드: " + d.missing.join(", ") }));
    return wrap;
  }

  function sourceCards(d) {
    var wrap = el("div", { class: "icn-gen" }, [el("p", { class: "icn-gen__title", text: "📚 근거 노트" })]);
    if (!d.items.length) { wrap.appendChild(el("p", { class: "icn-chat__fine", text: "표시할 노트 섹션을 찾지 못했습니다." })); return wrap; }
    wrap.appendChild(el("div", { class: "icn-sources" }, d.items.map(function (s, i) {
      return el("a", { class: "icn-source", href: s.url }, [
        el("span", { class: "icn-source__n", text: String(i + 1) }),
        el("span", { class: "icn-source__body" }, [el("strong", { text: s.section || s.note }), el("span", { text: s.section ? s.note : s.excerpt })])
      ]);
    })));
    return wrap;
  }

  // Human-in-the-loop: buttons resolve the pending tool call with the user's pick.
  function choiceCard(p, onPick) {
    var row = el("div", { class: "icn-chat__chips" });
    p.args.options.forEach(function (o) {
      var b = el("button", { type: "button", class: "icn-chat__chip" + (p.chosen === o ? " icn-chat__chip--chosen" : ""), text: o });
      if (!onPick) b.disabled = true;
      else b.addEventListener("click", function () {
        [].forEach.call(row.children, function (x) { x.disabled = true; });
        b.classList.add("icn-chat__chip--chosen");
        onPick(o);
      });
      row.appendChild(b);
    });
    return el("div", { class: "icn-gen icn-gen--choice" }, [el("p", { class: "icn-gen__title", text: "🙋 " + p.args.question }), row]);
  }

  function renderPart(p, onPick) {
    if (p.t === "text") {
      var m = el("div", { class: "icn-chat__msg icn-chat__msg--assistant" });
      m.innerHTML = A.renderMarkdown(p.v, SITE_ROOT);
      return m;
    }
    if (p.kind === "tool") return toolCard(p);
    if (p.kind === "interactive") return choiceCard(p, onPick);
    if (!p.done) return el("div", { class: "icn-gen icn-gen--loading", text: "화면을 준비하는 중…" });
    return p.name === "show_sessions" ? sessionCards(p.data) : sourceCards(p.data);
  }

  function Turn(saved) {
    var root = el("div", { class: "icn-chat__turn" });
    var pending = el("div", { class: "icn-chat__pending", text: "답변을 준비하는 중…" });
    var parts = saved || [];
    var nodes = [];
    body.appendChild(root);
    function draw(i, onPick) {
      var node = renderPart(parts[i], onPick);
      if (nodes[i]) root.replaceChild(node, nodes[i]);
      else root.appendChild(node);
      nodes[i] = node;
      if (pending.parentNode) root.appendChild(pending);
    }
    function find(id) { for (var i = 0; i < parts.length; i++) if (parts[i].id === id) return i; return -1; }
    parts.forEach(function (_, i) { draw(i); });
    return {
      parts: parts,
      wait: function (on) { if (on) root.appendChild(pending); else if (pending.parentNode) root.removeChild(pending); },
      text: function (d) {
        var last = parts[parts.length - 1];
        if (!last || last.t !== "text") { parts.push({ t: "text", v: "" }); last = parts[parts.length - 1]; }
        last.v += d;
        var i = parts.length - 1;
        if (nodes[i]) nodes[i].innerHTML = A.renderMarkdown(last.v, SITE_ROOT);
        else draw(i);
      },
      start: function (ev) { parts.push({ t: "ui", id: ev.id, name: ev.name, args: ev.args, kind: ev.kind, done: false }); draw(parts.length - 1); },
      end: function (ev) {
        var i = find(ev.id);
        var p = parts[i];
        p.done = true;
        if (p.kind === "tool") p.summary = toolSummary(ev.name, ev.result);
        else if (p.kind === "render") p.data = ev.result;
        else p.chosen = ev.result && ev.result.chosen;
        draw(i);
      },
      ask: function (ev, resolve) { draw(find(ev.id), function (o) { resolve({ chosen: o }); }); },
      settle: function () {
        parts.forEach(function (p, i) {
          if (p.t !== "ui" || p.done) return;
          p.done = true;
          p.summary = { status: "중지됨", links: [] };
          p.data = { title: "", items: [], missing: [] };
          draw(i);
        });
      },
      note: function (cls, msg) { root.appendChild(el(cls === "error" ? "div" : "p", { class: cls === "error" ? "icn-chat__msg icn-chat__msg--error" : "icn-chat__fine", text: msg })); }
    };
  }

  function renderHistory() {
    body.textContent = "";
    panel.classList.toggle("icn-chat--empty", !history.length);
    if (!history.length) {
      if (inline) {
        body.appendChild(el("h2", { class: "icn-chat__hello", text: "Ignite 2026 노트에 무엇이든 물어보세요" }));
        body.appendChild(el("p", { class: "icn-chat__status", text: "이 사이트에 정리된 노트·카탈로그만 근거로 답합니다." }));
      } else {
        body.appendChild(el("p", { class: "icn-chat__status", text: "예를 들어 이렇게 물어보세요." }));
      }
      body.appendChild(el("div", { class: "icn-chat__chips" }, SUGGESTIONS.map(function (s) {
        return el("button", { type: "button", class: "icn-chat__chip", text: s, onclick: function () { input.value = s; submit(); } });
      })));
      return;
    }
    history.forEach(function (m) {
      if (m.role === "user") body.appendChild(el("div", { class: "icn-chat__msg icn-chat__msg--user", text: m.content }));
      else Turn(m.parts || [{ t: "text", v: m.content }]);
    });
    scroll();
  }

  function scroll() { body.scrollTop = body.scrollHeight; }

  function setBusy(on) {
    busy = on;
    sendBtn.textContent = on ? "중지" : "보내기";
    input.disabled = on;
    modelSel.disabled = on;
  }

  function stop() { if (controller) controller.abort(); }

  function recentHistory() {
    var h = history.slice(-HISTORY_LIMIT).map(function (m) { return { role: m.role, content: m.content }; });
    while (h.length && h[0].role !== "user") h.shift();
    return h;
  }

  function textOf(parts) {
    return parts.filter(function (p) { return p.t === "text"; }).map(function (p) { return p.v; }).join("\n\n");
  }

  function submit() {
    var text = input.value.trim();
    var t = token();
    if (!text || busy || !t || !profile) return;
    if (!history.length) body.textContent = "";
    panel.classList.remove("icn-chat--empty");
    input.value = "";
    history.push({ role: "user", content: text });
    saveHistory();
    body.appendChild(el("div", { class: "icn-chat__msg icn-chat__msg--user", text: text }));
    var turn = Turn([]);
    turn.wait(true);
    controller = new AbortController();
    setBusy(true);
    scroll();
    loadKnowledge().then(function (k) {
      return A.runAgent({
        fetchImpl: fetch.bind(window), token: t, model: modelSel.value, knowledge: k,
        history: recentHistory(), signal: controller.signal,
        page: { title: document.title, url: location.href.split("#")[0] },
        onText: function (d) { turn.text(d); scroll(); },
        onToolStart: function (ev) { turn.start(ev); scroll(); },
        onToolEnd: function (ev) { turn.end(ev); scroll(); },
        onInteract: function (ev) {
          return new Promise(function (resolve, reject) {
            if (ev.signal) ev.signal.addEventListener("abort", function () { reject(new DOMException("중지됨", "AbortError")); }, { once: true });
            turn.ask(ev, resolve);
            scroll();
          });
        }
      });
    }).then(function (r) {
      if (!turn.parts.length) turn.text("(빈 응답)");
      history.push({ role: "assistant", content: r.text || textOf(turn.parts) || "(빈 응답)", parts: turn.parts });
    }).catch(function (e) {
      turn.settle();
      if (e && e.name === "AbortError") {
        if (turn.parts.length) history.push({ role: "assistant", content: (textOf(turn.parts) || "(응답 없음)") + "\n\n(중지됨)", parts: turn.parts });
        else history.pop();
        turn.note("fine", "중지했습니다.");
        return;
      }
      history.pop();
      turn.note("error", (e && e.message) || String(e));
      if (e && e.kind === "auth") { forget(); profile = null; setTimeout(render, 2500); }
    }).then(function () {
      turn.wait(false);
      saveHistory();
      controller = null;
      setBusy(false);
      scroll();
      if (!panel.hidden && token()) input.focus();
    });
  }

  // ---------- home page: landing (floating panel) or ChatGPT-style chat view ----------

  var HOME_MODE = "icn-home-view";
  var modeButtons = {};

  function applyHomeMode(mode, stage, byUser) {
    inline = mode === "chat";
    set("localStorage", HOME_MODE, mode);
    document.body.classList.toggle("icn-home--chat", inline);
    panel.classList.toggle("icn-chat--inline", inline);
    Object.keys(modeButtons).forEach(function (m) { modeButtons[m].setAttribute("aria-pressed", String(m === mode)); });
    if (inline) {
      stage.appendChild(panel);
      panel.hidden = false;
      panel.setAttribute("role", "region");
      fab.hidden = true;
    } else {
      document.body.appendChild(panel);
      panel.setAttribute("role", "dialog");
      fab.hidden = false;
      // Switching views by hand starts with the floating panel closed.
      if (byUser) set("sessionStorage", K.open, "");
      panel.hidden = !get("sessionStorage", K.open);
      fab.setAttribute("aria-expanded", String(!panel.hidden));
      fab.classList.toggle("icn-chat-fab--open", !panel.hidden);
    }
    render();
  }

  function mountHome() {
    var stage = el("div", { class: "icn-home-stage" });
    var sw = el("div", { class: "icn-home-switch", role: "group", "aria-label": "메인 화면 보기 방식" }, [
      ["landing", "📰 소개 화면"], ["chat", "💬 대화 화면"]
    ].map(function (o) {
      return (modeButtons[o[0]] = el("button", { type: "button", "aria-pressed": "false", text: o[1], onclick: function () {
        applyHomeMode(o[0], stage, true);
        if (o[0] === "chat" && token()) input.focus();
      } }));
    }));
    homeMount.appendChild(sw);
    homeMount.appendChild(stage);
    var asked = new URLSearchParams(location.search).get("view");
    var mode = asked === "chat" || asked === "landing" ? asked : (get("localStorage", HOME_MODE) || "landing");
    applyHomeMode(mode, stage);
  }

  document.body.appendChild(fab);
  document.body.appendChild(panel);
  if (homeMount) mountHome();
  else if (get("sessionStorage", K.open)) toggle(true);
})();
