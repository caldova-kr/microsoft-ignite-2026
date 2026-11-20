---
title: 세션 카탈로그
description: Microsoft Ignite 2026 전체 세션 — 타입·토픽·레벨·태그·미디어·정리 상태로 필터
hide:
  - toc
  - navigation
---

<div class="dg-catalog-page" markdown="1">

<div class="dg-page-heading" markdown="1">

<p class="dg-eyebrow">SESSION CATALOG · OFFICIAL SNAPSHOT</p>

# 세션 카탈로그

Microsoft Ignite 2026 공식 세션 카탈로그입니다. 기본으로 **온라인으로 볼 수 있는 세션**(온라인 송출 · 온디맨드 영상 · 녹화 예정)만 보여 주고, 현장 전용·녹화 없는 세션은 `시청 가능` 필터로 볼 수 있습니다. 코드를 누르면 공식 세션 페이지로, 제목을 누르면 초록과 링크가 펼쳐집니다.
필터 상태는 URL에 저장되어 그대로 공유할 수 있습니다.
공유할 만한 세션은 펼친 행의 **＋ 이슈로 공유 제안**으로 등록하고, 직접 정리하려면 이슈에서 본인을 assignee로 지정하세요 — [기여 가이드](../contributing.md).

</div>

<div class="dg-catalog" data-src="sessions.json" data-repo="https://github.com/caldova-kr/microsoft-ignite-2026" markdown="0">
  <form class="dg-cat-controls" onsubmit="return false">
    <label class="dg-cat-search">
      <span>검색</span>
      <input type="search" name="q" placeholder="코드 · 제목 · 발표자 · 태그 · 초록 · @담당자" autocomplete="off">
    </label>
    <div class="dg-cat-selects">
      <label><span>시청 가능</span><select name="scope">
        <option value="">온라인으로 볼 수 있음</option>
        <option value="offline">오프라인 전용</option>
        <option value="all">전체</option>
      </select></label>
      <label><span>Type</span><select name="type"><option value="">전체</option></select></label>
      <label><span>Topic</span><select name="topic"><option value="">전체</option></select></label>
      <label><span>Level</span><select name="level"><option value="">전체</option></select></label>
      <label><span>Tag</span><select name="tag"><option value="">전체</option></select></label>
      <label><span>정리 상태</span><select name="progress"><option value="">전체</option></select></label>
      <label><span>미디어</span><select name="media">
        <option value="">전체</option>
        <option value="video">▶ 영상 있음</option>
        <option value="transcript">📝 트랜스크립트 있음</option>
        <option value="slides">🖼 슬라이드 있음</option>
        <option value="none">영상 없음</option>
      </select></label>
      <button type="button" class="dg-cat-reset">초기화</button>
    </div>
  </form>
  <div class="dg-cat-summary" aria-live="polite"></div>
  <div class="dg-cat-table-wrap">
    <table class="dg-cat-table">
      <thead><tr>
        <th data-sort="c">Code</th><th data-sort="t">Title</th><th data-sort="y">Type</th>
        <th>Topic</th><th data-sort="l">Lvl</th><th data-sort="at">Day</th><th>Media</th><th data-sort="pr">상태</th>
      </tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <button type="button" class="dg-cat-more" hidden>더 보기</button>
  <noscript><p>이 페이지는 JavaScript가 필요합니다. 정적 목록은 저장소의 <code>catalog/SESSIONS.md</code>를 보세요.</p></noscript>
</div>

</div>
