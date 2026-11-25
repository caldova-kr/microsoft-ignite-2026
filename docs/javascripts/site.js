/* Site-wide enhancements — vanilla JS, no dependencies.
 * Session notes: catalog meta card, Key announcements as status cards, image lightbox.
 * Everywhere: ⌘K / Ctrl+K opens search (catalog page: focuses the catalog search box). */
(function () {
  "use strict";

  var PROGRESS = { done: "✅ 완료", review: "🔍 검토 중", draft: "✍️ 작성 중" };
  var BASIS = { transcript: "📝 transcript", video: "▶ video", slides: "🖼 slides", resources: "🔗 resources", catalog: "🗂 catalog" };
  var notesReq = null;

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

  function siteRoot() {
    return (typeof __md_scope !== "undefined") ? __md_scope : new URL("../../", location.href);
  }

  /* ── note meta card ─────────────────────────────────────────────── */
  function metaCard(article) {
    var sheet = article.querySelector(".dg-factsheet");
    var h1 = article.querySelector("h1");
    var m = h1 && h1.textContent.match(/^\s*\[([^\]]+)\]/);
    if (!sheet || !m || sheet.dataset.enhanced) return;
    sheet.dataset.enhanced = "1";
    var code = m[1];
    notesReq = notesReq || fetch(new URL("sessions/notes.json", siteRoot())).then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; });
    notesReq.then(function (notes) {
      var n = notes[code];
      if (!n) return;
      var chars = article.textContent.replace(/\s+/g, "").length;
      var readMin = Math.max(1, Math.round(chars / 500));
      var facts = el("div", { class: "dg-meta-facts" }, [
        el("span", { class: "dg-meta-type", text: n.y }),
        n.l ? el("span", { text: "Level " + n.l }) : null,
        n.d ? el("span", { text: "⏱ 세션 " + n.d + "분" }) : null,
        el("span", { text: "📖 읽기 약 " + readMin + "분" }),
        el("span", { class: "dg-meta-status dg-meta-status--" + n.pr, text: PROGRESS[n.pr] || n.pr })
      ]);
      var actions = el("div", { class: "dg-meta-actions" }, [
        n.v ? el("a", { class: "dg-meta-btn dg-meta-btn--primary", href: n.v, target: "_blank", rel: "noopener", text: "▶ 영상 보기" }) : null,
        el("a", { class: "dg-meta-btn", href: n.u, target: "_blank", rel: "noopener", text: "세션 페이지 ↗" }),
        n.k ? el("a", { class: "dg-meta-btn", href: n.k, target: "_blank", rel: "noopener", text: "🖼 슬라이드 ↗" }) : null
      ]);
      var card = el("aside", { class: "dg-meta-card", "aria-label": "세션 정보" }, [
        el("div", { class: "dg-meta-main" }, [
          facts,
          n.s.length ? el("p", { class: "dg-meta-speakers" }, [el("strong", { text: "Speakers " }), n.s.join(", ")]) : null,
          n.p.length ? el("p", { class: "dg-meta-topics" }, n.p.map(function (t) { return el("span", { class: "dg-chip", text: t }); })) : null,
          el("p", { class: "dg-meta-basis" }, [
            el("strong", { text: "근거 " }),
            n.sb.map(function (b) { return BASIS[b] || b; }).join(" · ") || "—",
            n.up ? "  ·  업데이트 " + n.up : ""
          ])
        ]),
        actions
      ]);
      sheet.after(card);
      sheet.classList.add("dg-factsheet--replaced");
    });
  }

  /* ── Key announcements → status cards ───────────────────────────── */
  function statusClass(text) {
    var t = text.toLowerCase();
    if (/\bga\b|generally available/.test(t)) return "ga";
    if (t.indexOf("private") >= 0) return "preview-private";
    if (t.indexOf("preview") >= 0) return "preview";
    if (t.indexOf("limited") >= 0) return "limited";
    if (t.indexOf("roadmap") >= 0) return "roadmap";
    return "other";
  }

  function announcementCards(article) {
    var h2 = article.querySelector("h2#key-announcements");
    if (!h2 || h2.dataset.enhanced) return;
    h2.dataset.enhanced = "1";
    var group = "";
    for (var node = h2.nextElementSibling; node && node.tagName !== "H2"; node = node.nextElementSibling) {
      if (node.tagName === "H3") { group = node.textContent.replace(/¶$/, "").trim(); continue; }
      // Material may already have wrapped the table in .md-typeset__scrollwrap.
      var table = node.tagName === "TABLE" ? node : node.classList.contains("md-typeset__scrollwrap") ? node.querySelector("table") : null;
      if (!table) continue;
      var heads = Array.prototype.map.call(table.querySelectorAll("thead th"), function (th) { return th.textContent.trim(); });
      var col = function (name) { return heads.indexOf(name); };
      if (col("항목") < 0) continue;
      var grid = el("div", { class: "dg-announce-grid" });
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        var cells = tr.children;
        var status = col("상태") >= 0 ? cells[col("상태")].textContent.trim() : group;
        var title = el("strong", { class: "dg-announce-title" });
        title.innerHTML = cells[col("항목")].innerHTML;
        var note = col("비고") >= 0 ? cells[col("비고")] : null;
        var basis = col("근거") >= 0 ? cells[col("근거")] : null;
        var noteP = null, basisP = null;
        if (note && note.textContent.trim() && note.textContent.trim() !== "—") {
          noteP = el("p", { class: "dg-announce-note" }); noteP.innerHTML = note.innerHTML;
        }
        if (basis && basis.textContent.trim()) {
          basisP = el("p", { class: "dg-announce-basis" }); basisP.innerHTML = basis.innerHTML;
        }
        grid.appendChild(el("div", { class: "dg-announce dg-announce--" + statusClass(status) }, [
          el("span", { class: "dg-announce-badge", text: status || "—" }), title, noteP, basisP
        ]));
      });
      node.replaceWith(grid);
      node = grid;
    }
  }

  /* ── image lightbox (<dialog>) ──────────────────────────────────── */
  var dialog = null, figures = [], current = 0;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = el("dialog", { class: "dg-lightbox", "aria-label": "이미지 크게 보기" }, [
      el("button", { type: "button", class: "dg-lb-close", "aria-label": "닫기", text: "✕" }),
      el("button", { type: "button", class: "dg-lb-prev", "aria-label": "이전 이미지", text: "‹" }),
      el("figure", {}, [el("img", { alt: "" }), el("figcaption")]),
      el("button", { type: "button", class: "dg-lb-next", "aria-label": "다음 이미지", text: "›" }),
      el("span", { class: "dg-lb-count" })
    ]);
    document.body.appendChild(dialog);
    dialog.querySelector(".dg-lb-close").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector(".dg-lb-prev").addEventListener("click", function () { show(current - 1); });
    dialog.querySelector(".dg-lb-next").addEventListener("click", function () { show(current + 1); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    // Capture phase: Material's global keyboard handler would otherwise swallow Escape / arrows.
    document.addEventListener("keydown", function (e) {
      if (!dialog.open) return;
      if (e.key === "Escape") { e.preventDefault(); dialog.close(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
      else return;
      e.stopPropagation();
    }, true);
    return dialog;
  }

  function show(i) {
    if (!figures.length) return;
    current = (i + figures.length) % figures.length;
    var img = figures[current].querySelector("img");
    var cap = figures[current].querySelector("figcaption");
    var d = ensureDialog();
    d.querySelector("img").src = img.currentSrc || img.src;
    d.querySelector("img").alt = img.alt;
    d.querySelector("figcaption").innerHTML = cap ? cap.innerHTML : "";
    d.querySelector(".dg-lb-count").textContent = (current + 1) + " / " + figures.length;
    var multi = figures.length > 1;
    d.querySelector(".dg-lb-prev").hidden = !multi;
    d.querySelector(".dg-lb-next").hidden = !multi;
    if (!d.open) d.showModal();
  }

  function lightbox(article) {
    figures = Array.prototype.filter.call(article.querySelectorAll("figure"), function (f) {
      return f.querySelector("img") && !f.closest(".dg-lightbox");
    });
    figures.forEach(function (f, i) {
      var img = f.querySelector("img");
      if (img.dataset.zoom) return;
      img.dataset.zoom = "1";
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "크게 보기: " + img.alt);
      img.addEventListener("click", function () { show(i); });
      img.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(i); } });
    });
  }

  /* ── ⌘K / Ctrl+K ────────────────────────────────────────────────── */
  document.addEventListener("keydown", function (e) {
    if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
    e.preventDefault();
    var catalogSearch = document.querySelector(".dg-catalog input[name=q]");
    if (catalogSearch) { catalogSearch.focus(); catalogSearch.select(); return; }
    var toggle = document.querySelector('[data-md-toggle="search"]');
    var input = document.querySelector(".md-search__input");
    if (toggle && input) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change"));
      setTimeout(function () { input.focus(); input.select(); }, 50);
    }
  });

  function boot() {
    var article = document.querySelector(".md-content__inner");
    if (!article) return;
    if (article.querySelector(".dg-factsheet")) {
      metaCard(article);
      announcementCards(article);
    }
    lightbox(article);
  }
  if (typeof document$ !== "undefined") document$.subscribe(boot); else document.addEventListener("DOMContentLoaded", boot);
})();
