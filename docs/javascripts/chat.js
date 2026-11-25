/* Site chatbot panel — vanilla JS, no dependencies. Logic: chat-agent.js (window.IgniteChatAgent). */
(function () {
  "use strict";

  var A = window.IgniteChatAgent;
  if (!A || !window.fetch || !window.ReadableStream || !window.TextDecoder) return;

  var script = document.currentScript;
  var SITE_ROOT = new URL("..", script && script.src ? script.src : location.href).href;
  var K = { token: "icn-chat-token", profile: "icn-chat-profile", history: "icn-chat-history", open: "icn-chat-open", model: "icn-chat-model" };
  var HISTORY_LIMIT = 12;
  var SUGGESTIONS = ["이 페이지 내용을 요약해 줘", "노트가 정리된 세션은 어떤 게 있어?", "키노트에서 GA 로 발표된 건 뭐야?"];

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
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });

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
    userBox.textContent = "";
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

  // ---------- conversation ----------

  function bubble(role, text) {
    var b = el("div", { class: "icn-chat__msg icn-chat__msg--" + role });
    if (role === "user") b.textContent = text;
    else b.innerHTML = A.renderMarkdown(text, SITE_ROOT);
    body.appendChild(b);
    return b;
  }

  function renderHistory() {
    body.textContent = "";
    if (!history.length) {
      body.appendChild(el("p", { class: "icn-chat__status", text: "예를 들어 이렇게 물어보세요." }));
      body.appendChild(el("div", { class: "icn-chat__chips" }, SUGGESTIONS.map(function (s) {
        return el("button", { type: "button", class: "icn-chat__chip", text: s, onclick: function () { input.value = s; submit(); } });
      })));
      return;
    }
    history.forEach(function (m) { bubble(m.role, m.content); });
    scroll();
  }

  function scroll() { body.scrollTop = body.scrollHeight; }

  var TOOL_LABEL = {
    search_notes: function (a) { return "🔎 노트 검색 · " + (a.query || ""); },
    get_note: function (a) { return "📄 노트 읽기 · " + (a.path || ""); },
    search_catalog: function (a) { return "🗂️ 카탈로그 검색 · " + [a.query, a.type, a.topic, a.has_note ? "노트 있음" : ""].filter(Boolean).join(" · "); },
    get_session: function (a) { return "🎫 세션 정보 · " + (a.code || ""); }
  };

  function setBusy(on) {
    busy = on;
    sendBtn.textContent = on ? "중지" : "보내기";
    input.disabled = on;
    modelSel.disabled = on;
  }

  function stop() { if (controller) controller.abort(); }

  function recentHistory() {
    var h = history.slice(-HISTORY_LIMIT);
    while (h.length && h[0].role !== "user") h.shift();
    return h;
  }

  function submit() {
    var text = input.value.trim();
    var t = token();
    if (!text || busy || !t || !profile) return;
    if (!history.length) body.textContent = "";
    input.value = "";
    history.push({ role: "user", content: text });
    saveHistory();
    bubble("user", text);
    var steps = el("ul", { class: "icn-chat__steps" });
    body.appendChild(steps);
    var out = bubble("assistant", "");
    out.classList.add("icn-chat__msg--pending");
    var acc = "";
    controller = new AbortController();
    setBusy(true);
    scroll();
    loadKnowledge().then(function (k) {
      return A.runAgent({
        fetchImpl: fetch.bind(window), token: t, model: modelSel.value, knowledge: k,
        history: recentHistory(), signal: controller.signal,
        page: { title: document.title, url: location.href.split("#")[0] },
        onText: function (d) { acc += d; out.classList.remove("icn-chat__msg--pending"); out.innerHTML = A.renderMarkdown(acc, SITE_ROOT); scroll(); },
        onTool: function (name, args) { steps.appendChild(el("li", { text: (TOOL_LABEL[name] || function () { return name; })(args || {}) })); scroll(); }
      });
    }).then(function (r) {
      history.push({ role: "assistant", content: r.text || "(빈 응답)" });
      if (!r.text) out.innerHTML = A.renderMarkdown("(빈 응답)", SITE_ROOT);
    }).catch(function (e) {
      out.classList.remove("icn-chat__msg--pending");
      if (e && e.name === "AbortError") {
        if (acc) history.push({ role: "assistant", content: acc + "\n\n(중지됨)" });
        else history.pop();
        out.appendChild(el("p", { class: "icn-chat__fine", text: "중지했습니다." }));
        return;
      }
      history.pop();
      out.classList.add("icn-chat__msg--error");
      out.textContent = (e && e.message) || String(e);
      if (e && e.kind === "auth") { forget(); profile = null; setTimeout(render, 2500); }
    }).then(function () {
      saveHistory();
      controller = null;
      setBusy(false);
      steps.hidden = !steps.children.length;
      scroll();
      if (!panel.hidden && token()) input.focus();
    });
  }

  document.body.appendChild(fab);
  document.body.appendChild(panel);
  if (get("sessionStorage", K.open)) toggle(true);
})();
