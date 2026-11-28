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
| **T4 공식 문서 · 제품 조회** | Microsoft Learn 등 제품 공식 문서, 실제 제품을 직접 조회한 결과(조회 조건 명시) — 상태·제약 확인용 | `!!! supplement` 블록 안에서만, **확인 일자 포함** | — |

규칙:

1. **본문의 모든 사실 주장은 T1 으로 추적 가능해야 한다.** T1 이 없으면 노트는 `status: draft` 에 머문다 (`review`/`done` 은 `source_basis` 에 `video`/`transcript`/`slides` 중 하나 이상 필요 — CI 강제).
2. **초록(abstract)은 "다룰 예정인 내용"이지 "말한 내용"이 아니다.** 초록만 보고 발표 내용·데모·발표 상태를 서술하지 않는다.
3. **카탈로그의 `aiDescription`(Microsoft AI 생성 요약)은 탐색용**이다. 어느 세션을 볼지 고르거나 transcript 에서 찾을 위치를 잡는 데만 쓰고, 인용하거나 근거로 삼지 않는다. `source_basis` 에 넣지 않는다.
4. **금지 출처**: Build 2026 노트·발표(자매 저장소 포함), Ignite 2025 이전 자료, 모델의 사전 지식·기억, 추정, 제3자 블로그/뉴스/SNS. 세션 내용을 "보완"하려고 이 출처를 끌어오지 않는다. 세션 화면에 제3자 게시물(SNS 글 등)이 소개되면 **세션에서 말한 내용과 영상 캡처로만** 다루고, 원문 링크나 원문에만 있는 내용은 넣지 않는다 — 맥락이 더 필요하면 그 주제의 Microsoft 공식 블로그를 `supplement` 로 연결한다.
5. **제품·기능 이름은 세션에서 부른 그대로** 쓴다. 이전 이벤트와 이름이 달라졌어도 바꾸거나 병기하지 않는다(필요하면 `supplement` 블록에서 출처와 함께).
6. **GA / Preview / Roadmap 상태와 날짜**는 세션 또는 T3 가 명시한 경우에만 쓴다. 명시되지 않았으면 `미언급` 으로 두고 `Caveats & open questions` 에 적는다. 추측 금지. 예외: T4 로 확인한 **현재** 제공 상태(GA / Preview, 배포 가능한 모델 · 변형 · 리전)는 `supplement` 블록 안에 확인 일자 · 조회 조건과 함께 적을 수 있다(7장 "세션 중계가 아니라 정리"). Roadmap 과 앞으로의 날짜는 세션 · T3 로만 쓴다.
7. **수치·벤치마크·고객 사례**는 세션에서 말한 수치 그대로, 조건(비교 대상·환경)과 함께 쓴다. 단위 변환·반올림·재계산 금지.
8. **확신이 없으면 단정하지 말고** `Caveats & open questions` 에 질문으로 남긴다.
9. 인용은 짧게, 영어 원문 + 발화자 표기 후 한국어로 설명한다. 트랜스크립트·슬라이드·영상 **원본 파일**은 커밋하지 않는다(`.cache/` 는 git-ignored). 슬라이드 · 영상 **캡처 이미지**와 공식 블로그 **이미지**는 2장 규칙에 따라 커밋한다.
10. 근거 표기: 근거를 문장마다 나열하지 않는다. 발표 항목의 설명 · 상태는 **세션 원문(T1)으로 확인한 것만** 쓰고(작성자가 원문 위치를 추적할 수 있어야 함), 항목 이름의 링크는 근거가 아니라 **더 알아보기용 참고 자료**다. 세션 원문은 노트의 영상 · 슬라이드 링크(`Resources`)와 슬라이드 캡션으로 독자가 확인할 수 있다. 본문에는 수치·인용처럼 꼭 필요한 곳에만 짧게 두고, bullet 마다 `(transcript: …)`·`(영상 MM:SS)` 를 붙이지 않는다 — 읽는 흐름이 우선이다. 발표 항목 표에는 `슬라이드 #N` 같은 근거 열 대신 **`설명` 열**(무엇인지 → 어떻게 쓰는지, 합니다체 1~3문장)을 두고, 항목 이름에는 링크를 건다 — ① 그 항목을 소개한 Ignite 2026 공식 발표 글, ② 없으면 Microsoft Learn 문서, ③ 둘 다 없으면 참고 링크 대신 **설명 끝에 세션 원문 위치를 짧게** 남긴다(예: `(영상 23:40)` · `(슬라이드 #12)`). URL 은 추측하지 않고, 실제로 열리는지 확인한다. 여러 기능을 한 글에서 함께 소개해 항목별 글이 없으면 Learn 문서로 연결하고, 공통 발표 글은 `Resources` 에 둔다. Keynote 처럼 발화자의 말이 상태의 근거로 의미가 있을 때만 `Satya Nadella "…"` 같은 근거 열을 둘 수 있다.

## 2. 이미지 — 슬라이드 · 영상 캡처 + 공식 블로그 이미지

이미지는 글을 대신하는 핵심 장면(키 슬라이드·발표 수치·데모 화면)에만 쓴다. 모든 항목에 넣을 필요는 없고, **이미지를 글로 설명하지 않는다**("위 화면은…", "화면 요약:" 금지). 더 궁금한 사람을 위해서는 이미지보다 **공식 소개 블로그 링크**를 건다.

### 왜 가능한가

이 저장소의 기여자는 **모두 Microsoft 직원**이다. 세션 영상·슬라이드·공식 발표 블로그는 Microsoft 가 공개한 자료이므로,
출처를 밝히는 조건으로 슬라이드 · 영상 캡처와 공식 블로그 이미지를 노트에 넣어 재사용한다. (외부 기여자는 이 규칙을 적용하지 않고 링크만 단다.)

### 무엇을 넣나

| 이미지 | 언제 | 만드는 법 | 캡션(필수) |
|---|---|---|---|
| **영상 캡처** (T1) | 키 슬라이드, 아키텍처, 데모 화면, 발표 표·수치 | `python tools/capture_frame.py <CODE> MM:SS <name> [--crop w:h:x:y]` | `▶ 영상 MM:SS — 한 줄 설명` |
| **슬라이드 내보내기** (T1) | 공식 슬라이드(.pptx)가 공개된 세션 — 영상 프레임보다 선명하므로 먼저 쓴다 | `python tools/capture_slide.py <CODE> <N> <name> [--crop w:h:x:y]` · 영상이 삽입된 슬라이드는 `--at <초>` 로 그 영상의 한 장면(영상이 여러 개면 `--video N`) | `슬라이드 #N — 슬라이드 제목` |
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

- **autopilot(자율) 모드로 시작했다면 먼저 interactive 모드로 바꾸자고 제안한다.** 자율 모드에서는 의도 질문에 답을 받지 못하고 가정으로 초안을 쓰게 된다. 그렇게 쓴 초안이 있으면 **커밋 · PR 전에 의도를 다시 묻고** 답에 맞춰 고친다.

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
python tools/fetch_sources.py BRK220          # .cache/sources/BRK220/ 에 catalog.md · transcript.txt · slides.pptx · slides.md
python tools/new_session.py BRK220            # docs/sessions/BRK220-<slug>.md 생성 (카탈로그 필드 자동 입력)
python tools/capture_slide.py BRK220 12 agent-architecture      # 슬라이드 #12 를 이미지로 (덱이 공개된 세션은 이쪽을 먼저)
python tools/capture_frame.py BRK220 18:40 agent-architecture   # 영상 프레임 캡처 (덱이 없거나 데모 화면일 때)
python tools/fetch_image.py BRK220 --page <공식 블로그 URL> --image <이미지 URL> --name <name>
# … 노트 작성 (T1 근거로, 이미지 우선) …
python tools/build_pages.py                   # 인덱스·카탈로그·nav 재생성
python tools/validate.py                      # 카탈로그 일치·근거·섹션 검증
mkdocs build --strict
```

- `slides.md` 는 덱의 텍스트를 슬라이드 번호 순으로 뽑은 것이다(제목 · 본문 · 발표자 노트 · 링크 · 삽입 영상 여부). 덱을 읽을 때는 이 파일을 보고, 번호를 `capture_slide.py` 에 그대로 쓴다.
- 공식 트랜스크립트가 없거나 권한 보호로 열리지 않으면 `fetch_sources.py` 가 on-demand 플레이어의 공개 영어 자막을 `[MM:SS]` 표시와 함께 `transcript.txt` 로 받는다. 이 경우 `source_basis` 는 `transcript` 가 아니라 `video` 로 적는다. 보호된 파일을 풀려고 하지 않는다.
- 카탈로그 스냅샷에 영상 · 슬라이드 · 트랜스크립트 링크가 아직 없으면 `--refresh` 로 최신 카탈로그의 링크를 쓴다.
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
tools/                   # fetch_catalog · fetch_sources · new_session · capture_slide · capture_frame · fetch_image · build_pages · validate · fetch_issues(배포 시 이슈→사이트) · project_board(이슈·PR 상태→프로젝트 보드)
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
| `Breakout`, `Pre-recorded` | TL;DR · Why it matters · Customer scenarios · Key announcements · **Session summary** · Architecture · Demo highlights · Code & samples · Caveats · Resources (기능 흐름 중심이면 Key announcements 를 Session summary 에 합친다 — 아래 "Breakout · 기능 흐름 중심 노트의 구성") |
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

### Breakout · 기능 흐름 중심 노트의 구성

플랫폼 기능 여러 개가 하나의 흐름(예: Build → Production → Scale, 개선 루프)으로 엮여 발표되는 Breakout 은 **흐름 그림 하나와 표 하나**로 정리한다 (예: `docs/sessions/BRK251-*.md`).

1. **`Why it matters` = 문제 제기 슬라이드로 흐름 잇기** — 세션이 앞부분에서 보여 준 업계 현황 · 문제 정의 슬라이드(예: "Is it up?" → "Is it right?")를 이미지와 한두 문장으로 이어 붙여, 왜 이 기능들이 필요한지 보여 준다. 인용한 조사의 출처 · 시점은 세션이 밝힌 그대로 적는다.
2. **`Key announcements` 를 따로 두지 않고 `Session summary` 에 합친다** — 발표 항목과 요약이 같은 기능을 두 번 설명하게 되기 때문이다. `Session summary` 는 맨 위에 **흐름 SVG**(7장 다이어그램 규칙), 그 아래 **표 하나**로 구성한다.
   - 표: `항목 | 상태 | 설명`. 항목 이름의 링크는 규칙 10 순서를 따르고, 상태는 GA / Preview, 설명은 "어떤 수고를 덜어 주는지 → 어떻게 동작하는지 → 설정 포인트" 를 합니다체로 이어 쓴다.
   - 순서는 그림의 흐름을 따른다. 한 제품의 새 기능 여러 개는 한 행으로 묶는다(예: Agent Optimizer 의 세 기능).
   - `Demo highlights` 의 패턴(예: custom category, 여러 문제를 한 번에 고치기)은 표에 다시 쓰지 않는다.
3. **`Customer scenarios` = 고객을 모르는 사람도 따라갈 수 있게** — **누구인지**(세션이 소개한 조직명과, 세션이 밝힌 Microsoft 와의 관계 — 7장 공개 범위 규칙. 사례의 솔루션이 Microsoft 제품이 아니면 분명히 밝힌다) → **무엇을 만들었나**(솔루션, 동작 방식) → **대상 · 문제** → **Foundry 등을 어떻게 적용했나** → **결과** 순서로 쓴다. 고객 사례 슬라이드가 있으면 이미지로 보여 주고, 글에는 슬라이드에 없는 것(발표자가 말로 덧붙인 조건 · 주기 · 판단)만 남긴다. 우리 해석은 *적용 아이디어* 로 표시한다.
4. 세션이 짧게 언급한 기능(예: decision model 을 judge 로)은 기여자가 강조를 원하지 않으면 세션 비중대로 표의 한 행으로만 둔다.

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
- 외부 공개 사이트다: 내부 정보·NDA 내용·발표자 연락처를 넣지 않는다. 고객은 **세션이 공개적으로 소개한 조직명만** 쓴다(예: 무대에서 사례를 발표한 회사). 세션에 나오지 않은 고객명, 개인 고객의 이름, 세션이 밝히지 않은 계약 · 관계 정보는 넣지 않는다.
- 구조 설명은 직접 그리기보다 **세션 슬라이드 캡처**를 먼저 쓴다. 직접 그린 다이어그램은 세션이 보여준 구조만, 캡션에 근거(`영상 MM:SS` 또는 `슬라이드 #7 · #17 을 바탕으로 다시 그린 흐름`)를 단다.
  - 노트의 SVG 는 노트 폴더에 두고 `![…](…svg)` 로 넣는다. `<img>` 로 들어가 사이트 CSS 가 적용되지 않으므로, 색 · 글꼴을 SVG 안에 직접 쓰고 흰 배경 rect 를 둔다. 색은 사이트 다이어그램(`ar-*`) 팔레트를 쓴다: 글자 `#182230`, 보조 `#566578`, 강조 `#1759c0`, 영역 `#eef2f7`, 테두리 `#c9d3df`.
  - 노드에는 제품 이름과 GA / Preview 표시만 두고 글자를 최소로 한다. `rsvg-convert -w 1600 -o /tmp/x.png <svg>` 로 렌더해 화살표가 글자 · 상자를 가리지 않는지 확인한다(예: `docs/sessions/BRK251-*/foundry-improvement-flow.svg`).

### 세션 중계가 아니라 정리

노트의 목표는 세션을 옮겨 적는 것이 아니라, 기여자가 정한 관점에서 **필요한 정보만 바로 보이게** 정리하는 것이다 (예: `docs/sessions/BRK256-*.md`).

- **트랜스크립트를 순서대로 옮기지 않는다.** "이 세션이 왜 의미 있는가" 를 먼저 정하고(예: 종료된 모델의 빈자리를 채우는 선택지), 그 관점에 필요한 것만 남긴다.
- **중계 · 메타 서술 금지.** "발표자가 ~라고 했다" 를 문장마다 붙이지 않고, "세션은 ~를 언급하지 않았다" 처럼 세션이 하지 않은 것을 굳이 적지 않는다. 판매자 쪽 주장임을 밝혀야 할 때만 표 머리나 한 문장으로 표시한다.
- **중복 금지.** 표에 있는 내용을 bullet 로 다시 쓰지 않고, 한 사실은 한 곳에만 둔다. 초안을 쓴 뒤 섹션 간 중복을 한 번 점검한다.
- **`Demo highlights` 는 가져갈 패턴 중심.** 시간순 나열 대신 "패턴 / 모델 · 서비스 조합 / 쓸 곳" 처럼 재사용할 수 있는 형태로 묶는다.
- **소제목은 담백하게.** 질문형 제목이나 특정 대상을 내세운 제목 대신 "가용 리전 · 사용 조건" 같은 명사구를 쓰고, 강조할 대상(예: 한국)은 본문에서 굵게 짚는다.
- **평가 · 최상급 표현 금지.** "강력한", "가장 싼" 처럼 확인하지 않은 평가나, 표에서 읽히는 것을 굳이 짚는 문장은 쓰지 않는다.
- **현재 제공 상태를 확인해 가볍게 덧붙인다.** 발표가 말한 제공 모델 · 변형, 가격, 리전, 상태는 Microsoft Learn · 공식 블로그 · 실제 제품 조회로 확인한다. 다르면 `supplement` 블록에 "현재 Foundry · Microsoft Learn 에서 확인했을 때는 …" 정도로 확인 일자와 함께 적는다. 별도 번호 섹션이나 "발표 vs 실제" 대비 표로 부각하지 않는다.
- **확인하지 않은 것은 단정하지 않는다.** "다른 대안은 없다" 같은 주장은 쓰기 전에 확인하고, 직접 조회한 결과는 조회 조건(구독 · 리전 · 일자)과 함께 `supplement` 블록에 적는다.
- **출처끼리 다르면 고르지 않는다.** Learn 과 공식 블로그가 서로 다르게 말하면(예: 어떤 모델을 judge 로 쓸 수 있는지) 어느 한쪽으로 단정하지 않는다. 둘 다 확인되는 것만 남기거나 그 내용을 뺀다. 기여자가 제품에서 직접 확인한 상태는 `작성자 확인` 으로 표기한다.
- **이미지 · 다이어그램을 글로 다시 설명하지 않는다.** 그림 바로 아래에 그림의 흐름을 문장으로 옮기지 않는다. 그림과 함께 두는 표의 `항목` · `상태` 는 그림의 노드와 대응시키되, `설명` 칸에서 그림의 흐름(무엇이 무엇으로 이어지는지)을 다시 풀지 않는다. 그림에 없는 것(설정 포인트, 조건, 수치의 맥락)만 글로 남긴다.

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
- 트랜스크립트·슬라이드·영상 원본 파일 커밋 (슬라이드 · 영상에서 캡처한 이미지는 가능).
- 출처 캡션 없는 이미지, 외부 이미지 핫링크, 공식이 아닌 블로그·SNS·이전 이벤트 포스트의 이미지, ID·이메일이 보이는 캡처.
- 영어 본문 전환, 마케팅 톤 재작성.
- 다른 사람이 assignee 인 세션을 작성하거나, 이슈 없이 노트 PR 만들기.
