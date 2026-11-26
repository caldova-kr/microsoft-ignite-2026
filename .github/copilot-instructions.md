# GitHub Copilot Instructions — Microsoft Ignite 2026 Session Notes

이 저장소에서 Copilot / 에이전트가 따라야 하는 규약입니다. **가장 중요한 원칙은 "이번 Ignite 2026 세션에서 실제로 나온 내용만, 근거와 함께"** 입니다.

## Repository purpose

- Microsoft Ignite 2026 (2026-11-17 ~ 20, San Francisco) 세션을 **고객·아키텍트 관점**에서 한국어로 정리하는 비공식 노트.
- `catalog/` 에 공식 카탈로그 전체 세션(1,366개)을 스냅샷으로 두고 — **정리 대상은 `online: true` 세션(온라인 송출 · 온디맨드 영상 · 녹화 예정, 873개)뿐**이다. 현장 전용·녹화 없는 세션은 원문이 없어 다루지 않는다 — 공유할 세션은 **이슈**로 제안·점유해서 노트(`docs/sessions/`)로 만든다.
- MkDocs Material 사이트 → GitHub Pages (`https://caldova-kr.github.io/microsoft-ignite-2026/`).
- 자매 저장소 `caldova-kr/microsoft-build-2026` 과 구조는 같지만 **내용은 절대 섞지 않는다.**

## 1. Source of truth — 근거 등급 (반드시 준수)

| 등급 | 출처 | 쓰는 곳 | `source_basis` 값 |
|---|---|---|---|
| **T1 세션 원문** | 해당 세션의 on-demand 영상, 공식 트랜스크립트(.docx), 공식 슬라이드(.pptx) | 본문 전체 | `video` · `transcript` · `slides` |
| **T2 카탈로그** | `catalog/sessions.json` 의 제목·타입·토픽·태그·레벨·발표자·초록·`resources` | frontmatter, 세션 소개, Resources | `catalog` · `resources` |
| **T3 Ignite 2026 공식 발표** | [Book of News 2026](https://news.microsoft.com/events/ignite/2026/book-of-news/), 카탈로그 `resources` 또는 Book of News가 링크한 Microsoft 공식 블로그 | 글: `!!! supplement "세션 외 보충 · <출처>"` 블록 안에서만 · 이미지: 출처 캡션과 함께 본문 어디든 | — |
| **T4 공식 문서** | Microsoft Learn 등 제품 공식 문서 (상태·제약 확인용) | `!!! supplement` 블록 안에서만, **확인 일자 포함** | — |

규칙:

1. **본문의 모든 사실 주장은 T1 으로 추적 가능해야 한다.** T1 이 없으면 노트는 `status: draft` 에 머문다 (`review`/`done` 은 `source_basis` 에 `video`/`transcript`/`slides` 중 하나 이상 필요 — CI 강제).
2. **초록(abstract)은 "다룰 예정인 내용"이지 "말한 내용"이 아니다.** 초록만 보고 발표 내용·데모·발표 상태를 서술하지 않는다.
3. **카탈로그의 `aiDescription`(Microsoft AI 생성 요약)은 탐색용**이다. 어느 세션을 볼지 고르거나 transcript 에서 찾을 위치를 잡는 데만 쓰고, 인용하거나 근거로 삼지 않는다. `source_basis` 에 넣지 않는다.
4. **금지 출처**: Build 2026 노트·발표(자매 저장소 포함), Ignite 2025 이전 자료, 모델의 사전 지식·기억, 추정, 제3자 블로그/뉴스/SNS. 세션 내용을 "보완"하려고 이 출처를 끌어오지 않는다. 세션 화면에 제3자 게시물(SNS 글 등)이 소개되면 **세션에서 말한 내용과 영상 캡처로만** 다루고, 원문 링크나 원문에만 있는 내용은 넣지 않는다 — 맥락이 더 필요하면 그 주제의 Microsoft 공식 블로그를 `supplement` 로 연결한다.
5. **제품·기능 이름은 세션에서 부른 그대로** 쓴다. 이전 이벤트와 이름이 달라졌어도 바꾸거나 병기하지 않는다(필요하면 `supplement` 블록에서 출처와 함께).
6. **GA / Preview / Roadmap 상태와 날짜**는 세션 또는 T3 가 명시한 경우에만 쓴다. 명시되지 않았으면 `미언급` 으로 두고 `Caveats & open questions` 에 적는다. 추측 금지.
7. **수치·벤치마크·고객 사례**는 세션에서 말한 수치 그대로, 조건(비교 대상·환경)과 함께 쓴다. 단위 변환·반올림·재계산 금지.
8. **확신이 없으면 단정하지 말고** `Caveats & open questions` 에 질문으로 남긴다.
9. 인용은 짧게, 영어 원문 + 발화자 표기 후 한국어로 설명한다. 트랜스크립트·슬라이드·영상 **원본 파일**은 커밋하지 않는다(`.cache/` 는 git-ignored). 영상 **프레임 캡처**와 공식 블로그 **이미지**는 2장 규칙에 따라 커밋한다.
10. 근거 표기: `Key announcements` 표의 `근거` 열에 발화자(`Satya Nadella "…"`)·`키노트 슬라이드` 처럼 남긴다. 본문에는 수치·인용처럼 꼭 필요한 곳에만 짧게 두고, bullet 마다 `(transcript: …)`·`(영상 MM:SS)` 를 붙이지 않는다 — 읽는 흐름이 우선이다(근거 파일·시점은 작성자가 추적 가능하면 충분).

## 2. 이미지 — 영상 캡처 + 공식 블로그 이미지

이미지는 글을 대신하는 핵심 장면(키 슬라이드·발표 수치·데모 화면)에만 쓴다. 모든 항목에 넣을 필요는 없고, **이미지를 글로 설명하지 않는다**("위 화면은…", "화면 요약:" 금지). 더 궁금한 사람을 위해서는 이미지보다 **공식 소개 블로그 링크**를 건다.

### 왜 가능한가

이 저장소의 기여자는 **모두 Microsoft 직원**이다. 세션 영상·슬라이드·공식 발표 블로그는 Microsoft 가 공개한 자료이므로,
출처를 밝히는 조건으로 영상 캡처와 공식 블로그 이미지를 노트에 넣어 재사용한다. (외부 기여자는 이 규칙을 적용하지 않고 링크만 단다.)

### 무엇을 넣나

| 이미지 | 언제 | 만드는 법 | 캡션(필수) |
|---|---|---|---|
| **영상 캡처** (T1) | 키 슬라이드, 아키텍처, 데모 화면, 발표 표·수치 | `python tools/capture_frame.py <CODE> MM:SS <name> [--crop w:h:x:y]` | `▶ 영상 MM:SS — 한 줄 설명` |
| **공식 블로그 이미지** (T3) | 발표(announcement)를 설명하는 공식 다이어그램·스크린샷 | `python tools/fetch_image.py <CODE> --page <포스트 URL> --image <이미지 URL> --name <name>` | `📰 공식 블로그 · [포스트 제목](URL) (YYYY-MM-DD)` |

- 공식 블로그 = `news.microsoft.com`(Book of News 포함) · `blogs.microsoft.com` · `azure.microsoft.com/…/blog` · `techcommunity.microsoft.com` · `devblogs.microsoft.com` · `github.blog` · `www.microsoft.com/…/blog` (`tools/catalog_lib.py: OFFICIAL_DOMAINS`).
  **Ignite 2026 발표 포스트(2026-11 게시)** 또는 이 세션의 카탈로그 리소스·Book of News 가 링크한 포스트만. 이전 이벤트(Build 2026 등) 포스트의 이미지는 쓰지 않는다.
- 블로그 **이미지**는 캡션에 출처를 달면 본문 어디든 둘 수 있다. 블로그에서만 나온 **글(사실·수치·상태)**은 여전히 `supplement` 블록 안에만.

### 어떻게 배치하나

- `TL;DR` 아래 대표 이미지 1장. `Top highlights`·`Session summary`·`Demo highlights` 는 그 항목을 가장 잘 보여 주는 장면이 있을 때만 1장. `Architecture` 는 아키텍처 슬라이드 캡처를 우선한다.
- 긴 문단 금지. bullet 한 줄은 두 줄을 넘기지 않는다. 이미지가 말하는 것을 글로 반복하지 않는다.
- 캡션은 출처만 짧게(`▶ 영상 MM:SS — 슬라이드 제목`). 본문에서 영상 시점을 다시 언급하지 않는다.
- 형식 (검증기가 강제):

  ```markdown
  <figure markdown="span">
    ![Foundry 에이전트 플레이그라운드에서 음성 세션 시작](BRK243-choose-agent-architecture/voice-playground.jpg)
    <figcaption>▶ 영상 12:00 — Voice agent 를 플레이그라운드에서 바로 시험</figcaption>
  </figure>
  ```

- 파일은 노트 폴더 `docs/sessions/<CODE>-<slug>/` 에 소문자-하이픈 이름으로. 이미지는 내려받아 커밋한다(외부 이미지 핫링크 금지). 1 MB 이하(`--width` · `--crop`).
- alt 텍스트는 "무엇을 보여 주는지" 를 문장으로.

### 캡처 전 확인 (외부 공개 사이트)

- 데모 화면의 **테넌트·구독·리소스 ID, 이메일, 토큰, 내부 URL** 이 보이면 `--crop` 으로 잘라내거나 다른 시점을 쓴다.
- 발표자 얼굴만 나오는 장면보다 **슬라이드·데모 화면**을 고른다.
- 공개되지 않은 내부 자료(사내 덱, NDA, 비공개 프리뷰 화면)는 직원이라도 넣지 않는다 — 공개 세션·공개 블로그에 나온 것만.

## 3. 세션 노트 작업 절차

기여 흐름은 [`CONTRIBUTING.md`](../CONTRIBUTING.md) 가 기준이다:

1. **공유할 만한 세션 → 이슈** (`[CODE] 카탈로그 제목`, label `session`, 한 세션 = 한 이슈). 이미 있으면 그 이슈에 댓글.
2. **정리할 세션 → assignee 를 자신으로 지정해 점유**한 뒤에만 작업. assignee 가 다른 사람이면 작업하지 않는다.
3. **PR 본문 `Closes #<이슈>`**, 노트 1개 = PR 1개.

에이전트로 작업할 때도 같다: 이슈가 없으면 먼저 만들고, 점유되지 않은 이슈만 맡는다(코딩 에이전트는 이슈에 할당된 경우에만 작업).

### 작성 전 의도 확인 (에이전트 필수)

같은 세션도 누가·누구에게 공유하느냐에 따라 정리할 내용이 다르다. 에이전트는 원문을 받은 뒤 **본문을 쓰기 전에 기여자에게 정리 의도를 먼저 묻고**, 답을 기준으로 범위와 구성을 정한다.

- 물어볼 것 (한 번에 묶어서, 선택지 + 자유 입력으로):
  1. **관점·독자** — 예: Azure AI & Apps, 보안, 데이터, 개발자 생산성 / 고객 공유용, 팀 내부 공유용
  2. **중점 항목** — 꼭 다룰 발표·제품·데모·고객 사례 (트랜스크립트에서 뽑은 후보를 선택지로 제시)
  3. **제외 범위** — 예: M365 Copilot 발표 제외, 특정 제품군 제외
  4. **형식·깊이** — 참관 후기(핵심 발표 중심) / 기술 deep dive(아키텍처·데모 중심) / 짧은 요약
  5. **추가 자료** — 기여자가 가진 캡처, 참고할 공식 블로그 링크
- 기여자가 답하지 않거나 대화형이 아닌 경우(이슈에 할당된 코딩 에이전트 등)에는 이슈의 **"공유 포인트"** 를 의도로 쓰고, 그것도 없으면 session_type 별 권장 조합으로 쓰되 **가정한 의도를 PR 본문에 밝힌다.**
- 정한 의도는 노트 본문 맨 위 HTML 주석(`<!-- 범위: … / 제외: … / 구성: … -->`)과 PR 본문에 남겨, 리뷰어가 같은 기준으로 볼 수 있게 한다.
- 초안을 보여 준 뒤 기여자 피드백(구성·문체·강조점)을 반영해 다시 쓰는 것을 기본 흐름으로 한다.

```bash
pip install -r requirements.txt
python tools/fetch_sources.py BRK220          # .cache/sources/BRK220/ 에 catalog.md · transcript.txt · slides.pptx
python tools/new_session.py BRK220            # docs/sessions/BRK220-<slug>.md 생성 (카탈로그 필드 자동 입력)
python tools/capture_frame.py BRK220 18:40 agent-architecture   # 핵심 장면 캡처 (반복)
python tools/fetch_image.py BRK220 --page <공식 블로그 URL> --image <이미지 URL> --name <name>
# … 노트 작성 (T1 근거로, 이미지 우선) …
python tools/build_pages.py                   # 인덱스·카탈로그·nav 재생성
python tools/validate.py                      # 카탈로그 일치·근거·섹션 검증
mkdocs build --strict
```

- 영상만 있고 트랜스크립트가 없으면 영상을 보며 타임스탬프(`MM:SS`)로 근거를 남긴다. 영상이 없으면(`video` 빈 값) `triage.yml` 에 `hold` 로 둔다.
- `catalog/triage.yml` 은 일괄 `hold`/`skip` 표시용일 뿐이다. 제안·점유는 이슈로만 한다.

## 4. File layout

```
catalog/                 # 공식 카탈로그 스냅샷 — sessions.json/csv/meta.json/SESSIONS.md 는 생성물, triage.yml(hold/skip)만 수동
docs/
├── index.md             # 홈 (<!-- gen:* --> 블록은 생성물)
├── catalog/index.md     # 세션 탐색기 (sessions.json 은 생성물)
├── sessions/
│   ├── _TEMPLATE.md     # 노트 템플릿 (사이트 빌드 제외, 직접 복사하지 말고 new_session.py 사용)
│   ├── index.md         # 생성물
│   ├── notes.json       # 생성물 — 노트 상단 메타 카드용 (javascripts/site.js)
│   ├── <CODE>-<slug>.md # 세션 1개 = 파일 1개
│   └── <CODE>-<slug>/   # 그 노트의 이미지·다이어그램
├── themes/              # 여러 노트를 묶는 주제 페이지 (작성된 노트만 근거)
└── contributing.md
tools/                   # fetch_catalog · fetch_sources · new_session · build_pages · validate · fetch_issues(배포 시 이슈→사이트) · project_board(이슈·PR 상태→프로젝트 보드)
```

- 파일명: `<CODE>-<slug>.md`. CODE 는 카탈로그 `sessionCode` 그대로(`KEY01`, `BRK220`, `THRSP312`, `LTG401` …), slug 는 소문자·하이픈.
- **생성물은 손으로 고치지 않는다**: `catalog/SESSIONS.md`, `catalog/sessions.*`, `catalog/meta.json`, `docs/catalog/sessions.json`, `docs/sessions/index.md`, `docs/sessions/notes.json`, `docs/index.md` 의 `gen:` 블록, `mkdocs.yml` 의 `gen:nav` 블록, `docs/llms.txt`·`docs/llms-full.txt`(GEO — 노트의 `## TL;DR` 인용문이 요약으로 쓰인다). CI 가 `build_pages.py --check` 로 확인한다.

## 5. Frontmatter schema

```yaml
session_code: BRK220      # 카탈로그 sessionCode
title: ""                 # ┐
session_type: ""          # │
topics: []                # │ 카탈로그 값과 정확히 일치해야 함 (validate.py 강제)
catalog_tags: []          # │ new_session.py 가 채움 — 수동 수정 금지
level: 300                # │
speakers: []              # │
session_url: ""           # │
video_url: ""             # ┘
source_basis: []          # 실제로 확인한 근거: catalog | video | transcript | slides | resources
description: ""           # 한 문장 요약, 160자 이내, 본문(T1) 근거만 — meta description·llms.txt·Agent 개요. review/done 필수
tags: []                  # (선택) 우리 분류, 소문자-하이픈
status: draft             # draft | review | done
last_updated: YYYY-MM-DD
```

카탈로그가 갱신되어 값이 바뀌면(예: 영상 URL 추가) 노트의 해당 필드를 카탈로그 값으로 맞춘다.

## 6. Session note structure

섹션 헤딩 이름과 순서는 고정이다(`tools/catalog_lib.py: SECTION_ORDER`). 해당 없는 섹션은 통째로 삭제하고, 빈 채로 두지 않는다.

| # | 카테고리 | 섹션 | 조건 |
|---|---|---|---|
| 1 | Summary | `## TL;DR` | **필수** |
|   |   | `## Top highlights` | 해당 시 |
| 2 | Context | `## Why it matters` | **필수** (`Keynote` 는 선택 — 제품 소개 안에 의미를 함께 담는다) |
|   |   | `## Customer scenarios` | 권장 — 세션이 제시한 시나리오 우선, 우리 아이디어면 "적용 아이디어"로 표기 |
| 3 | Announcements | `## Key announcements` | 해당 시 — 세션에서 발표·언급된 것만 |
| 4 | Deep dive | `## Session summary` · `## Architecture` · `## Demo highlights` · `## Code & samples` | 권장 / 해당 시 |
| 5 | Assessment | `## Caveats & open questions` | 권장 |
| 6 | References | `## Resources` | **필수** — 세션 페이지 링크 필수 |
|   |   | `## Related sessions` | 권장 — Ignite 2026 카탈로그에 실재하는 세션만 |

### Ignite session_type 별 권장 조합

| session_type (카탈로그) | 핵심 섹션 |
|---|---|
| `Keynote` | TL;DR(이벤트 핵심 의제) · **Top highlights**(제품 소개 + 의미) · Customer scenarios(사례) · **Key announcements**(GA / Preview 구분) · Resources |
| `Breakout`, `Pre-recorded` | TL;DR · Why it matters · Customer scenarios · Key announcements · **Session summary** · Architecture · Demo highlights · Code & samples · Caveats · Resources |
| `Theater`, `Lightning Talk`, `Broadcast Stage` | TL;DR · **Top highlights** · Why it matters · Demo highlights · Resources |
| `Table Talk`, `Innovation Session` | TL;DR · **Top highlights**(논의 포인트) · Why it matters · Caveats · Resources |
| `Lab`, `Digital Lab` | TL;DR · Why it matters · Session summary · **Code & samples** · Caveats · Resources |

### Keynote · 발표 중심 노트의 구성

Keynote 처럼 여러 제품이 발표되는 세션은 시간순 요약이 아니라 **핵심 발표 중심의 참관 후기**로 쓴다 (예: `docs/sessions/KEY01-*.md`).

1. **`TL;DR` = 이벤트가 전달하려는 핵심 의제** — 키노트가 내세운 프레임(예: Human Ambition · Intelligence · Trust)을 먼저 소개하고, 각 의제에 어떤 제품이 놓이는지 연결한다. 끝에 **키노트 on-demand 영상**과 **주요 발표 모음(Book of News)** 링크를 둬서 바로 찾아볼 수 있게 한다. "이 노트에서 다루는 N가지" 같은 목차형 문장은 쓰지 않는다.
2. **`Top highlights` = 제품 소개만** — 의제 순서대로 `### <의제> ① <제품> — <한 줄 의미>`. 각 항목은 무엇인지 → 핵심 수치·기능 → **의미**(아키텍트·고객 관점)를 자연스럽게 이어서 쓴다. 의미는 따로 `Why it matters` 로 빼지 않고 소개 안에 담는다(Keynote 는 `Why it matters` 생략 가능).
3. **`Customer scenarios` = 고객·현장 사례만** — 무대에서 보여 준 고객 데모·외부 사례는 제품 소개와 섞지 않고 여기 모은다. 제품 소개에서는 `[사례 이름](#anchor)` 로 링크만 건다. 사례의 근거는 **키노트 영상 + 관련 Microsoft 공식 블로그**로 한정한다(화면에 나온 SNS 글 원문은 링크하지 않음). 우리 해석은 *적용 아이디어* 로 표시한다.
4. **상태는 눈에 띄게, 섞지 않게** — 제품마다 `!!! ga` / `!!! preview` 콜아웃을 두고, 세션에서 상태를 말하지 않은 것은 제품 소개 안에 "상태 미언급: …" 한 줄로만 적는다. `Key announcements` 는 상태가 확인된 것만 `### GA` · `### Preview` 표로 나누고(상태 미언급 표는 두지 않음), **한 제품은 한 행만** 둔다. 블로그에만 나온 상태는 `supplement` 블록에. Keynote 노트는 `Caveats & open questions` 를 두지 않아도 된다 — 데모 수치의 조건 같은 주의점은 해당 사례 안에 한 줄로 적는다.
5. **제품마다 공식 소개 글 링크** — 세션 화면의 aka.ms 링크를 따라가거나 Ignite 2026 공식 포스트를 찾아 `supplement` 블록과 `Resources` 의 "제품별 공식 소개 글" 목록에 건다. 세부 스펙·가격·리전은 본문에 늘어놓지 말고 링크로 넘긴다.
6. 후속 세션은 각자의 노트에서 다루므로 Keynote 노트에는 `Related sessions` 를 넣지 않아도 된다.

### Callouts

```markdown
!!! ga "GA"                       # 세션/T3 가 GA 라고 말한 경우만
!!! preview "Public Preview"
!!! preview-private "Private Preview"
!!! limited "Limited Availability"
!!! roadmap "Roadmap"
!!! supplement "세션 외 보충 · Book of News 2026"   # T3/T4 정보는 반드시 이 블록 안에, 링크와 함께
```

## 7. Writing rules

- 본문은 한국어. 제품·기능·SDK 이름 등 고유명사는 영어 원문 유지.
- 문체는 **주변에 공유하는 참관 후기**: 합니다체, 결론을 먼저, 보고서처럼 근거 표기를 나열하지 않는다. 발표 내용을 전하되 "그래서 무엇이 달라지나" 를 한두 문장으로 덧붙인다.
- 제목·소제목은 명사구. 결론을 각 절 첫 문장에 둔다.
- 마케팅 형용사 금지 (revolutionary, game-changing, seamless, cutting-edge 등 — validate.py 경고).
- 링크는 실재하는 URL 만: 세션 페이지 `https://ignite.microsoft.com/en-US/sessions/<CODE>`, 카탈로그의 `video`/`slides`/`resources`, Book of News, 세션 화면에 나온 aka.ms 링크가 가리키는 공식 포스트, Ignite 2026 공식 블로그, Microsoft Learn. URL·포스트 제목을 추측해 만들지 않는다.
- 외부 공개 사이트다: 고객명·내부 정보·NDA 내용·발표자 연락처를 넣지 않는다.
- 구조 설명은 직접 그리기보다 **세션 슬라이드 캡처**를 먼저 쓴다. 직접 그린 다이어그램은 세션이 보여준 구조만, 캡션에 근거 시점(`영상 MM:SS`)을 단다.

## 8. Validation (CI: `.github/workflows/deploy-site.yml`)

워크플로 액션은 Node 24 런타임 버전을 쓴다 (`actions/checkout@v7`, `actions/setup-python@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`). Node 20 기반 버전으로 내리지 않는다.

`tools/validate.py` 가 막는 것:

- 파일명 코드가 카탈로그에 없음 / slug 형식 위반
- 카탈로그 유래 frontmatter 값이 카탈로그와 다름 (제목 오타, 토픽 임의 변경 등)
- `review`/`done` 인데 T1 근거(`video`/`transcript`/`slides`)가 없음
- 필수 섹션 누락, 알 수 없는 섹션 헤딩, 섹션 순서 위반, 세션 페이지 링크 누락
- 카탈로그에 없는 세션 코드 링크
- `supplement` 블록 밖에서 다른 이벤트 참조 (`build.microsoft.com`, `Build 20xx`, `Ignite 2025` 등)
- 이미지: `<figure>` 밖 이미지, 핫링크(외부 URL) 이미지, 노트 폴더 밖·없는 파일, alt 텍스트 없음, 캡션 없음, 캡션이 `영상 MM:SS`/`슬라이드 #N` 도 공식 블로그 링크도 아닌 경우 (1 MB 초과·`review`/`done` 인데 이미지 0장은 경고)
- `triage.yml` 의 잘못된 코드·상태

## 9. Things Copilot should NOT do

- 초록·`aiDescription`·사전 지식으로 세션 내용을 "그럴듯하게" 채우기.
- 다른 이벤트(특히 Build 2026) 노트의 문장·표·다이어그램 재사용.
- 카탈로그 유래 필드를 손으로 수정하거나 섹션 이름·순서 변경.
- 생성물 직접 편집, `mkdocs.yml` 의 theme/plugins/markdown_extensions 임의 변경, hooks·서드파티 플러그인 추가(→ Zensical 이전 호환성 유지).
- 트랜스크립트·슬라이드·영상 원본 파일 커밋 (프레임 캡처는 가능).
- 출처 캡션 없는 이미지, 외부 이미지 핫링크, 공식이 아닌 블로그·SNS·이전 이벤트 포스트의 이미지, ID·이메일이 보이는 캡처.
- 영어 본문 전환, 마케팅 톤 재작성.
- 다른 사람이 assignee 인 세션을 작성하거나, 이슈 없이 노트 PR 만들기.
