---
# ── 카탈로그 유래 필드: tools/new_session.py 가 catalog/sessions.json 에서 채움. 손으로 고치지 말 것 ──
session_code: BRK000        # 카탈로그 sessionCode
title: ""                   # 카탈로그 title 원문 그대로
session_type: ""            # Keynote | Breakout | Theater | Lightning Talk | Table Talk | Lab | Pre-recorded | ...
topics: []                  # 카탈로그 topic 원문
catalog_tags: []            # 카탈로그 tags 원문
level:                      # 100 | 200 | 300 | 400 (카탈로그에 없으면 빈 값)
speakers: []                # 카탈로그 speakerNames
session_url: ""             # https://ignite.microsoft.com/en-US/sessions/<CODE>
video_url: ""               # 카탈로그 onDemand (없으면 빈 값)
# ── 작성자 필드 ──
source_basis: []            # 실제로 확인한 근거만: catalog | video | transcript | slides | resources
description: ""             # 한 문장 요약(160자 이내, 본문 근거만) — 검색 결과·meta description·llms.txt·Agent 개요에 쓰임. review/done 필수
tags: []                    # (선택) 우리 분류용, 소문자·하이픈
status: draft               # draft | review | done
last_updated: 2026-11-20
---

# [BRK000] <Session Title>

<!--
  원칙
  - 이 노트는 "이 세션에서 나온 내용"의 정리다. 모든 주장은 이 세션의 영상 / 트랜스크립트 / 슬라이드로 추적 가능해야 한다.
  - 글보다 이미지. 핵심 장면은 영상 캡처로 보여 주고, 글은 이미지 아래 bullet 2~4개로 짧게.
      python tools/capture_frame.py BRK000 18:40 <name> [--crop w:h:x:y]   → 영상 프레임 + figure 스니펫
      python tools/fetch_image.py BRK000 --page <공식 블로그 URL> --image <이미지 URL> --name <name>
  - 이미지는 반드시 아래 형식(출처 캡션 필수). 캡처 전 화면의 테넌트·구독 ID·이메일·토큰은 --crop 으로 잘라낸다.
      <figure markdown="span">
        ![무엇을 보여 주는지](BRK000-slug/agent-architecture.jpg)
        <figcaption>▶ 영상 18:40 — 한 줄 설명</figcaption>
      </figure>
      <figcaption>📰 공식 블로그 · [포스트 제목](https://azure.microsoft.com/en-us/blog/...) (2026-11-18)</figcaption>
  - 세션 밖 "글" 정보는 `!!! supplement "세션 외 보충 · <출처>"` 블록 안에만. 공식 블로그 "이미지"는 캡션에 출처를 달면 본문 어디든 가능.
  - 카탈로그 AI 요약(aiDescription)과 초록은 근거가 아니다.
  섹션 표시: [필수] 항상 / [권장] 내용 있으면 / [해당 시] 성격에 맞을 때만 (아니면 섹션 통째 삭제).
  session_type별 조합은 .github/copilot-instructions.md 참고. 헤딩 이름·순서 변경 금지.
-->

<!-- ════════ 1. Summary ════════ -->

## TL;DR  <!-- [필수] 핵심 메시지 1~2문장 + 세션을 대표하는 이미지 1장 (키 슬라이드 또는 데모 화면) -->

>

<!-- 대표 이미지 figure -->

## Top highlights  <!-- [해당 시] 하이라이트마다: 이미지 1장 + bullet 2~3개 -->

### 1.

<!-- figure -->

-

<!-- ════════ 2. Context ════════ -->

## Why it matters  <!-- [필수, Keynote 는 선택] 고객·아키텍트 관점 의미 2~4줄. 해석임을 드러내되 세션 내용에 근거 -->

-

## Customer scenarios  <!-- [권장] 세션이 제시한 시나리오 우선. 우리 해석이면 "적용 아이디어"로 표기 -->

-

<!-- ════════ 3. Announcements ════════ -->

## Key announcements  <!-- [해당 시] 세션에서 발표·언급된 것만. 표 + 주요 발표마다 공식 블로그 이미지 또는 발표 슬라이드 캡처 -->

| 항목 | 상태 | 근거 | 비고 |
|------|------|------|------|
|      | GA / Public Preview / Private Preview / Limited / Roadmap / 미언급 | 영상 MM:SS · 슬라이드 #N · transcript "…" |  |

<!-- figure: 📰 공식 블로그 이미지 또는 ▶ 발표 슬라이드 캡처 -->

<!-- ════════ 4. Deep dive ════════ -->

## Session summary  <!-- [권장] 발표 흐름 순서대로. 단계마다 영상 캡처 1장 + bullet 2~4개. 긴 문단 금지 -->

### 1.

<!-- figure -->

-

## Architecture  <!-- [해당 시] 세션이 보여준 구조. 아키텍처 슬라이드 캡처를 우선 사용, 필요하면 --crop 으로 확대 -->

<!-- figure -->

-

## Demo highlights  <!-- [해당 시] 데모 장면마다 캡처 + 무엇을 했는지 한 줄 -->

<!-- figure -->

- ⏱️ MM:SS —

## Code & samples  <!-- [해당 시] 세션에 등장한 코드/공식 샘플. 코드가 화면에만 있으면 캡처 -->

```text
```

<!-- ════════ 5. Assessment ════════ -->

## Caveats & open questions  <!-- [권장] 세션에서 확정되지 않은 것, 확인이 필요한 것 -->

-

<!-- ════════ 6. References ════════ -->

## Resources  <!-- [필수] 최소 Session 링크. 카탈로그 링크 + 노트에 쓴 공식 블로그 포스트 -->

- 🎥 Session: https://ignite.microsoft.com/en-US/sessions/BRK000

## Related sessions  <!-- [권장] 카탈로그에 실재하는 Ignite 2026 세션만. 노트가 있으면 노트, 없으면 세션 페이지 링크 -->

<!-- - [BRKxxx — Title](BRKxxx-slug.md) · - [BRKxxx — Title](https://ignite.microsoft.com/en-US/sessions/BRKxxx) -->

-
