/* Session catalog explorer — vanilla JS, no dependencies. Data: docs/catalog/sessions.json (generated). */
(function () {
  "use strict";

  var PROGRESS = {
    done: ["✅", "완료"], review: ["🔍", "검토 중"], draft: ["✍️", "작성 중"],
    claimed: ["🙋", "점유"], proposed: ["📌", "공유 제안"],
    hold: ["⏸️", "보류"], skip: ["➖", "제외"], todo: ["·", "미검토"]
  };
  var PROGRESS_ORDER = Object.keys(PROGRESS);
  var PAGE = 150;
  var FAV_KEY = "ig26.favorites";
  var FILTERS = ["text", "scope", "type", "topic", "level", "tag", "progress", "media"];
  var CHIPS = ["type", "topic", "level", "media", "progress"];
  var dayFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false
  });

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function link(href, text, cls) {
    var a = el("a", { href: href, text: text, target: "_blank", rel: "noopener" });
    if (cls) a.className = cls;
    return a;
  }

  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = "1";
    var form = root.querySelector(".dg-cat-controls");
    var tbody = root.querySelector("tbody");
    var summary = root.querySelector(".dg-cat-summary");
    var more = root.querySelector(".dg-cat-more");
    var tableWrap = root.querySelector(".dg-cat-table-wrap");
    var cards = root.querySelector(".dg-cat-cards");
    var favBtn = root.querySelector(".dg-cat-fav-only");
    var viewBtns = root.querySelectorAll("[data-view]");
    var view = "table", favOnly = false, favs = loadFavs();
    var siteRoot = (typeof __md_scope !== "undefined") ? __md_scope : new URL("../", location.href);
    var rows = [], shown = PAGE, sortKey = "c", sortDir = 1;
    var repo = (root.dataset.repo || "").replace(/\/$/, "");

    function readState() {
      var p = new URLSearchParams(location.search);
      FILTERS.forEach(function (k) {
        var input = form.elements[k === "text" ? "q" : k];
        if (input && p.has(k)) input.value = p.get(k);
      });
      view = p.get("view") === "cards" ? "cards" : "table";
      favOnly = p.get("fav") === "1";
      if (p.has("sort")) { var s = p.get("sort"); sortDir = s[0] === "-" ? -1 : 1; sortKey = s.replace(/^-/, ""); }
    }

    function writeState() {
      var p = new URLSearchParams(location.search);
      FILTERS.forEach(function (k) {
        var v = form.elements[k === "text" ? "q" : k].value;
        if (v) p.set(k, v); else p.delete(k);
      });
      if (view === "cards") p.set("view", "cards"); else p.delete("view");
      if (favOnly) p.set("fav", "1"); else p.delete("fav");
      if (sortKey !== "c" || sortDir !== 1) p.set("sort", (sortDir < 0 ? "-" : "") + sortKey); else p.delete("sort");
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }

    function fillSelect(name, values, label) {
      var sel = form.elements[name];
      values.forEach(function (v) {
        sel.appendChild(el("option", { value: v[0], "data-label": label ? label(v[0]) : v[0], "data-count": v[1],
          text: (label ? label(v[0]) : v[0]) + "  (" + v[1] + ")" }));
      });
    }

    function loadFavs() {
      try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch (e) { return new Set(); }
    }

    function setFavState(b, code) {
      var on = favs.has(code);
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", code + " 즐겨찾기");
      b.title = on ? "즐겨찾기 해제" : "즐겨찾기";
      b.textContent = on ? "★" : "☆";
    }

    function favButton(r) {
      var b = el("button", { type: "button", class: "dg-fav" });
      setFavState(b, r.c);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (favs.has(r.c)) favs.delete(r.c); else favs.add(r.c);
        try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs))); } catch (err) { /* private mode */ }
        if (!favOnly) {
          // Update in place: keeps keyboard focus and any expanded detail rows.
          setFavState(b, r.c);
          syncControls();
          return;
        }
        // Favorites-only view drops the item: move focus to the next result (or the toggle when none are left).
        var before = Array.prototype.indexOf.call(root.querySelectorAll(".dg-fav"), b);
        render();
        var after = root.querySelectorAll(".dg-fav");
        (after[before] || after[before - 1] || favBtn).focus();
      });
      return b;
    }

    // Chips mirror the hidden <select>s, so URL state and filtering logic stay in one place.
    function buildChips() {
      CHIPS.forEach(function (name) {
        var box = root.querySelector('[data-chips="' + name + '"]');
        if (!box) return;
        Array.prototype.forEach.call(form.elements[name].options, function (o) {
          var chip = el("button", { type: "button", class: "dg-filter-chip", "data-value": o.value }, [
            o.value ? (o.dataset.label || o.textContent) : "전체",
            o.dataset.count ? el("small", { text: Number(o.dataset.count).toLocaleString() }) : null
          ]);
          chip.addEventListener("click", function () {
            var sel = form.elements[name];
            sel.value = sel.value === o.value ? "" : o.value;
            update();
          });
          box.appendChild(chip);
        });
      });
    }

    function syncControls() {
      CHIPS.forEach(function (name) {
        var v = form.elements[name].value;
        root.querySelectorAll('[data-chips="' + name + '"] .dg-filter-chip').forEach(function (c) {
          c.setAttribute("aria-pressed", String(c.dataset.value === v));
        });
      });
      favBtn.setAttribute("aria-pressed", String(favOnly));
      favBtn.textContent = (favOnly ? "★" : "☆") + " 즐겨찾기만" + (favs.size ? " (" + favs.size + ")" : "");
      viewBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.view === view)); });
      tableWrap.hidden = view !== "table";
      cards.hidden = view !== "cards";
    }

    function counts(getter) {
      var m = {};
      rows.forEach(function (r) { if (!r.o) return; [].concat(getter(r)).forEach(function (v) { if (v !== "" && v != null) m[v] = (m[v] || 0) + 1; }); });
      return Object.keys(m).map(function (k) { return [k, m[k]]; });
    }

    function matches(r) {
      var f = form.elements;
      if (favOnly && !favs.has(r.c)) return false;
      var q = f.q.value.trim().toLowerCase();
      if (q) {
        var hay = (r.c + " " + r.t + " " + r.s.join(" ") + " " + r.g.join(" ") + " " + r.p.join(" ") + " " + r.x +
          (r.iss ? " @" + r.iss.a.join(" @") : "")).toLowerCase();
        if (!q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
      }
      if (!f.scope.value && !r.o) return false;
      if (f.scope.value === "offline" && r.o) return false;
      if (f.type.value && r.y !== f.type.value) return false;
      if (f.topic.value && r.p.indexOf(f.topic.value) < 0) return false;
      if (f.level.value && String(r.l) !== f.level.value) return false;
      if (f.tag.value && r.g.indexOf(f.tag.value) < 0) return false;
      if (f.progress.value && r.pr !== f.progress.value) return false;
      var m = f.media.value;
      if (m === "video" && !r.v) return false;
      if (m === "transcript" && !r.tr) return false;
      if (m === "slides" && !r.k) return false;
      if (m === "none" && r.v) return false;
      return true;
    }

    function cmp(a, b) {
      var x = a[sortKey], y = b[sortKey];
      if (sortKey === "pr") { x = PROGRESS_ORDER.indexOf(x); y = PROGRESS_ORDER.indexOf(y); }
      if (x == null || x === "") return 1;
      if (y == null || y === "") return -1;
      return (x > y ? 1 : x < y ? -1 : 0) * sortDir || (a.c > b.c ? 1 : -1);
    }

    function detailContent(r) {
      var links = el("p", { class: "dg-cat-links" }, [link(r.u, "Session page ↗")]);
      if (r.v) links.appendChild(link(r.v, "▶ Video ↗"));
      if (r.k) links.appendChild(link(r.k, "🖼 Slides ↗"));
      if (r.n) links.appendChild(el("a", { href: new URL(r.n, siteRoot).href, text: "📝 노트 보기", class: "dg-cat-note" }));
      if (r.iss) {
        links.appendChild(link(r.iss.u, "이슈 #" + r.iss.n + (r.iss.a.length ? " · @" + r.iss.a.join(", @") : " · 담당자 없음") + " ↗"));
      } else if (repo && !r.n) {
        var q = new URLSearchParams({ template: "session.yml", title: "[" + r.c + "] " + r.t, code: r.c });
        links.appendChild(link(repo + "/issues/new?" + q.toString(), "＋ 이슈로 공유 제안 ↗", "dg-cat-propose"));
      }
      var meta = el("p", { class: "dg-cat-meta" }, [
        (r.s.length ? "Speakers: " + r.s.join(", ") : "Speakers: —") + (r.d ? "  ·  " + r.d + " min" : "") +
        (r.tr ? "  ·  transcript available" : "")
      ]);
      var tags = el("p", { class: "dg-cat-tags" }, r.g.map(function (g) { return el("span", { class: "dg-chip", text: g }); }));
      var desc = el("div", { class: "dg-cat-desc" }, (r.x || "(초록 없음)").split("\n").map(function (line) { return el("p", { text: line }); }));
      return [meta, tags, desc, links];
    }

    function detailRow(r) {
      return el("tr", { class: "dg-cat-detail" }, [el("td", { colspan: "9" }, detailContent(r))]);
    }

    function mediaIcons(r) {
      return el("span", { class: "dg-cat-media" }, [
        r.v ? link(r.v, "▶", "dg-media") : null, r.k ? link(r.k, "🖼", "dg-media") : null,
        r.tr ? el("span", { class: "dg-media", title: "transcript", text: "📝" }) : null
      ]);
    }

    function statusCell(r) {
      var pr = PROGRESS[r.pr] || PROGRESS.todo;
      return [
        r.iss ? link(r.iss.u, pr[0] + " " + pr[1]) : pr[0] + " " + pr[1],
        r.iss && r.iss.a.length ? el("span", { class: "dg-cat-assignee", text: " @" + r.iss.a.join(", @") }) : null
      ];
    }

    function card(r) {
      var toggle = el("button", { type: "button", class: "dg-cat-title", "aria-expanded": "false", text: r.t });
      var body = el("div", { class: "dg-cat-card-detail", hidden: "" }, detailContent(r));
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        body.hidden = open;
        toggle.setAttribute("aria-expanded", String(!open));
      });
      return el("article", { class: "dg-cat-card dg-pr--" + r.pr }, [
        el("header", {}, [
          link(r.u, r.c, "dg-code"), el("span", { text: r.y }), r.l ? el("span", { class: "dg-num", text: "L" + r.l }) : null,
          r.n ? el("a", { href: new URL(r.n, siteRoot).href, class: "dg-chip dg-chip--note", text: "note" }) : null,
          favButton(r)
        ]),
        toggle,
        el("p", { class: "dg-cat-card-topics", text: r.p.join(" · ") }),
        el("footer", {}, [
          el("span", { class: "dg-num", text: r.at ? dayFmt.format(new Date(r.at)) : "" }),
          mediaIcons(r),
          el("span", { class: "dg-cat-card-status" }, statusCell(r))
        ]),
        body
      ]);
    }

    function render() {
      var list = rows.filter(matches).sort(cmp);
      syncControls();
      tbody.textContent = "";
      cards.textContent = "";
      list.slice(0, shown).forEach(function (r) {
        if (view === "cards") { cards.appendChild(card(r)); return; }
        var pr = PROGRESS[r.pr] || PROGRESS.todo;
        var toggle = el("button", { type: "button", class: "dg-cat-title", "aria-expanded": "false", text: r.t });
        var tr = el("tr", { class: "dg-cat-row dg-pr--" + r.pr }, [
          el("td", { class: "dg-cat-fav-cell" }, [favButton(r)]),
          el("td", {}, [link(r.u, r.c, "dg-code")]),
          el("td", {}, [toggle, r.n ? el("a", { href: new URL(r.n, siteRoot).href, class: "dg-chip dg-chip--note", text: "note" }) : null]),
          el("td", { class: "dg-nowrap", text: r.y }),
          el("td", { class: "dg-cat-topics", text: r.p.join(", ") }),
          el("td", { class: "dg-num", text: r.l || "" }),
          el("td", { class: "dg-nowrap dg-num", text: r.at ? dayFmt.format(new Date(r.at)) : "" }),
          el("td", {}, [mediaIcons(r)]),
          el("td", { class: "dg-nowrap", title: pr[1] }, statusCell(r))
        ]);
        toggle.addEventListener("click", function () {
          var open = toggle.getAttribute("aria-expanded") === "true";
          if (open) { tr.nextSibling.remove(); } else { tr.after(detailRow(r)); }
          toggle.setAttribute("aria-expanded", String(!open));
        });
        tbody.appendChild(tr);
      });
      if (!list.length) {
        (view === "cards" ? cards : tbody).appendChild(view === "cards"
          ? el("p", { class: "dg-empty", text: favOnly ? "즐겨찾기한 세션이 없습니다 — ☆ 를 눌러 추가하세요." : "조건에 맞는 세션이 없습니다." })
          : el("tr", {}, [el("td", { colspan: "9", class: "dg-empty", text: favOnly ? "즐겨찾기한 세션이 없습니다 — ☆ 를 눌러 추가하세요." : "조건에 맞는 세션이 없습니다." })]));
      }
      var online = rows.filter(function (r) { return r.o; }).length;
      summary.textContent = list.length.toLocaleString() + " sessions  ·  온라인 " + online.toLocaleString() +
        " / 전체 " + rows.length.toLocaleString() +
        (list.length > shown ? " · " + shown + "개 표시" : "");
      more.hidden = list.length <= shown;
      root.querySelectorAll("th[data-sort]").forEach(function (th) {
        th.setAttribute("aria-sort", th.dataset.sort === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none");
      });
    }

    function update() { shown = PAGE; writeState(); render(); }

    // issues.json is produced at deploy time from open `session` issues; absent locally — that's fine.
    var issuesReq = fetch(new URL("issues.json", new URL(root.dataset.src, location.href)))
      .then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    Promise.all([fetch(new URL(root.dataset.src, location.href)).then(function (r) { return r.json(); }), issuesReq]).then(function (res) {
      var data = res[0], issues = res[1] || {};
      data.forEach(function (r) {
        r.iss = issues[r.c] || null;
        if (r.iss && ["todo", "hold", "skip"].indexOf(r.pr) >= 0) r.pr = r.iss.a.length ? "claimed" : "proposed";
      });
      rows = data;
      fillSelect("type", counts(function (r) { return r.y; }).sort(function (a, b) { return b[1] - a[1]; }));
      fillSelect("topic", counts(function (r) { return r.p; }).sort(function (a, b) { return b[1] - a[1]; }));
      fillSelect("level", counts(function (r) { return r.l ? String(r.l) : ""; }).sort());
      fillSelect("tag", counts(function (r) { return r.g; }).sort(function (a, b) { return a[0].localeCompare(b[0]); }));
      fillSelect("progress", counts(function (r) { return r.pr; }).sort(function (a, b) {
        return PROGRESS_ORDER.indexOf(a[0]) - PROGRESS_ORDER.indexOf(b[0]);
      }), function (k) { return PROGRESS[k].join(" "); });
      buildChips();
      readState();
      render();
    }).catch(function (e) { summary.textContent = "카탈로그를 불러오지 못했습니다: " + e; });

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    root.querySelector(".dg-cat-reset").addEventListener("click", function () { form.reset(); sortKey = "c"; sortDir = 1; favOnly = false; update(); });
    favBtn.addEventListener("click", function () { favOnly = !favOnly; update(); });
    viewBtns.forEach(function (b) { b.addEventListener("click", function () { view = b.dataset.view; writeState(); render(); }); });
    more.addEventListener("click", function () { shown += PAGE * 2; render(); });
    root.querySelectorAll("th[data-sort]").forEach(function (th) {
      th.tabIndex = 0;
      th.addEventListener("click", function () {
        if (sortKey === th.dataset.sort) sortDir = -sortDir; else { sortKey = th.dataset.sort; sortDir = 1; }
        update();
      });
    });
  }

  function boot() { document.querySelectorAll(".dg-catalog").forEach(init); }
  if (typeof document$ !== "undefined") document$.subscribe(boot); else document.addEventListener("DOMContentLoaded", boot);
})();
