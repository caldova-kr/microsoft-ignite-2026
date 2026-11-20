/* Session catalog explorer — vanilla JS, no dependencies. Data: docs/catalog/sessions.json (generated). */
(function () {
  "use strict";

  var PROGRESS = {
    done: ["✅", "완료"], review: ["🔍", "검토 중"], draft: ["✍️", "작성 중"],
    pick: ["📌", "정리 대상"], hold: ["⏸️", "보류"], skip: ["➖", "제외"], todo: ["·", "미검토"]
  };
  var PROGRESS_ORDER = Object.keys(PROGRESS);
  var PAGE = 150;
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
    var siteRoot = (typeof __md_scope !== "undefined") ? __md_scope : new URL("../", location.href);
    var rows = [], shown = PAGE, sortKey = "c", sortDir = 1;

    function readState() {
      var p = new URLSearchParams(location.search);
      ["text", "type", "topic", "level", "tag", "progress", "media"].forEach(function (k) {
        var input = form.elements[k === "text" ? "q" : k];
        if (input && p.has(k)) input.value = p.get(k);
      });
      if (p.has("sort")) { var s = p.get("sort"); sortDir = s[0] === "-" ? -1 : 1; sortKey = s.replace(/^-/, ""); }
    }

    function writeState() {
      var p = new URLSearchParams(location.search);
      ["text", "type", "topic", "level", "tag", "progress", "media"].forEach(function (k) {
        var v = form.elements[k === "text" ? "q" : k].value;
        if (v) p.set(k, v); else p.delete(k);
      });
      if (sortKey !== "c" || sortDir !== 1) p.set("sort", (sortDir < 0 ? "-" : "") + sortKey); else p.delete("sort");
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }

    function fillSelect(name, values, label) {
      var sel = form.elements[name];
      values.forEach(function (v) { sel.appendChild(el("option", { value: v[0], text: (label ? label(v[0]) : v[0]) + "  (" + v[1] + ")" })); });
    }

    function counts(getter) {
      var m = {};
      rows.forEach(function (r) { [].concat(getter(r)).forEach(function (v) { if (v !== "" && v != null) m[v] = (m[v] || 0) + 1; }); });
      return Object.keys(m).map(function (k) { return [k, m[k]]; });
    }

    function matches(r) {
      var f = form.elements;
      var q = f.q.value.trim().toLowerCase();
      if (q) {
        var hay = (r.c + " " + r.t + " " + r.s.join(" ") + " " + r.g.join(" ") + " " + r.p.join(" ") + " " + r.x).toLowerCase();
        if (!q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
      }
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

    function detailRow(r) {
      var links = el("p", { class: "dg-cat-links" }, [link(r.u, "Session page ↗")]);
      if (r.v) links.appendChild(link(r.v, "▶ Video ↗"));
      if (r.k) links.appendChild(link(r.k, "🖼 Slides ↗"));
      if (r.n) links.appendChild(el("a", { href: new URL(r.n, siteRoot).href, text: "📝 노트 보기", class: "dg-cat-note" }));
      var meta = el("p", { class: "dg-cat-meta" }, [
        (r.s.length ? "Speakers: " + r.s.join(", ") : "Speakers: —") + (r.d ? "  ·  " + r.d + " min" : "") +
        (r.tr ? "  ·  transcript available" : "")
      ]);
      var tags = el("p", { class: "dg-cat-tags" }, r.g.map(function (g) { return el("span", { class: "dg-chip", text: g }); }));
      var desc = el("div", { class: "dg-cat-desc" }, (r.x || "(초록 없음)").split("\n").map(function (line) { return el("p", { text: line }); }));
      return el("tr", { class: "dg-cat-detail" }, [el("td", { colspan: "8" }, [meta, tags, desc, links])]);
    }

    function render() {
      var list = rows.filter(matches).sort(cmp);
      tbody.textContent = "";
      list.slice(0, shown).forEach(function (r) {
        var pr = PROGRESS[r.pr] || PROGRESS.todo;
        var media = el("span", { class: "dg-cat-media" }, [
          r.v ? link(r.v, "▶", "dg-media") : null, r.k ? link(r.k, "🖼", "dg-media") : null,
          r.tr ? el("span", { class: "dg-media", title: "transcript", text: "📝" }) : null
        ]);
        var toggle = el("button", { type: "button", class: "dg-cat-title", "aria-expanded": "false", text: r.t });
        var tr = el("tr", { class: "dg-cat-row dg-pr--" + r.pr }, [
          el("td", {}, [link(r.u, r.c, "dg-code")]),
          el("td", {}, [toggle, r.n ? el("a", { href: new URL(r.n, siteRoot).href, class: "dg-chip dg-chip--note", text: "note" }) : null]),
          el("td", { class: "dg-nowrap", text: r.y }),
          el("td", { class: "dg-cat-topics", text: r.p.join(", ") }),
          el("td", { class: "dg-num", text: r.l || "" }),
          el("td", { class: "dg-nowrap dg-num", text: r.at ? dayFmt.format(new Date(r.at)) : "" }),
          el("td", {}, [media]),
          el("td", { class: "dg-nowrap", title: pr[1], text: pr[0] + " " + pr[1] })
        ]);
        toggle.addEventListener("click", function () {
          var open = toggle.getAttribute("aria-expanded") === "true";
          if (open) { tr.nextSibling.remove(); } else { tr.after(detailRow(r)); }
          toggle.setAttribute("aria-expanded", String(!open));
        });
        tbody.appendChild(tr);
      });
      summary.textContent = list.length.toLocaleString() + " / " + rows.length.toLocaleString() + " sessions" +
        (list.length > shown ? " · " + shown + "개 표시" : "");
      more.hidden = list.length <= shown;
      root.querySelectorAll("th[data-sort]").forEach(function (th) {
        th.setAttribute("aria-sort", th.dataset.sort === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none");
      });
    }

    function update() { shown = PAGE; writeState(); render(); }

    fetch(new URL(root.dataset.src, location.href)).then(function (r) { return r.json(); }).then(function (data) {
      rows = data;
      fillSelect("type", counts(function (r) { return r.y; }).sort(function (a, b) { return b[1] - a[1]; }));
      fillSelect("topic", counts(function (r) { return r.p; }).sort(function (a, b) { return b[1] - a[1]; }));
      fillSelect("level", counts(function (r) { return r.l ? String(r.l) : ""; }).sort());
      fillSelect("tag", counts(function (r) { return r.g; }).sort(function (a, b) { return a[0].localeCompare(b[0]); }));
      fillSelect("progress", counts(function (r) { return r.pr; }).sort(function (a, b) {
        return PROGRESS_ORDER.indexOf(a[0]) - PROGRESS_ORDER.indexOf(b[0]);
      }), function (k) { return PROGRESS[k].join(" "); });
      readState();
      render();
    }).catch(function (e) { summary.textContent = "카탈로그를 불러오지 못했습니다: " + e; });

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    root.querySelector(".dg-cat-reset").addEventListener("click", function () { form.reset(); sortKey = "c"; sortDir = 1; update(); });
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
