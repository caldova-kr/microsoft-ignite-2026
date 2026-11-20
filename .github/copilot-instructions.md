# GitHub Copilot Instructions — Microsoft Ignite 2026 Session Notes

이 저장소에서 Copilot / 에이전트가 따라야 하는 규약입니다. **가장 중요한 원칙은 "이번 Ignite 2026 세션에서 실제로 나온 내용만, 근거와 함께"** 입니다.

## Repository purpose

- Microsoft Ignite 2026 (2026-11-17 ~ 20, San Francisco) 세션을 **고객·아키텍트 관점**에서 한국어로 정리하는 비공식 노트.
- `catalog/` 에 공식 카탈로그 전체 세션(1,365개)을 스냅샷으로 두고, 정리할 세션을 골라(`triage.yml`) 노트(`docs/sessions/`)로 만든다.
- MkDocs Material 사이트 → GitHub Pages (`https://caldova-kr.github.io/microsoft-ignite-2026/`).
- 자매 저장소 `caldova-kr/microsoft-build-2026` 과 구조는 같지만 **내용은 절대 섞지 않는다.**

## 1. Source of truth — 근거 등급 (반드시 준수)

| 등급 | 출처 | 쓰는 곳 | `source_basis` 값 |
|---|---|---|---|
| **T1 세션 원문** | 해당 세션의 on-demand 영상, 공식 트랜스크립트(.docx), 공식 슬라이드(.pptx) | 본문 전체 | `video` · `transcript` · `slides` |
| **T2 카탈로그** | `catalog/sessions.json` 의 제목·타입·토픽·태그·레벨·발표자·초록·`resources` | frontmatter, 세션 소개, Resources | `catalog` · `resources` |
| **T3 Ignite 2026 공식 발표** | [Book of News 2026](https://news.microsoft.com/events/ignite/2026/book-of-news/), 카탈로그 `resources` 또는 Book of News가 링크한 Microsoft 공식 블로그 | `!!! supplement "세션 외 보충 · <출처>"` 블록 안에서만 | — |
| **T4 공식 문서** | Microsoft Learn 등 제품 공식 문서 (상태·제약 확인용) | `!!! supplement` 블록 안에서만, **확인 일자 포함** | — |

규칙:

1. **본문의 모든 사실 주장은 T1 으로 추적 가능해야 한다.** T1 이 없으면 노트는 `status: draft` 에 머문다 (`review`/`done` 은 `source_basis` 에 `video`/`transcript`/`slides` 중 하나 이상 필요 — CI 강제).
2. **초록(abstract)은 "다룰 예정인 내용"이지 "말한 내용"이 아니다.** 초록만 보고 발표 내용·데모·발표 상태를 서술하지 않는다.
3. **카탈로그의 `aiDescription`(Microsoft AI 생성 요약)은 탐색용**이다. 어느 세션을 볼지 고르거나 transcript 에서 찾을 위치를 잡는 데만 쓰고, 인용하거나 근거로 삼지 않는다. `source_basis` 에 넣지 않는다.
4. **금지 출처**: Build 2026 노트·발표(자매 저장소 포함), Ignite 2025 이전 자료, 모델의 사전 지식·기억, 추정, 제3자 블로그/뉴스/SNS. 세션 내용을 "보완"하려고 이 출처를 끌어오지 않는다.
5. **제품·기능 이름은 세션에서 부른 그대로** 쓴다. 이전 이벤트와 이름이 달라졌어도 바꾸거나 병기하지 않는다(필요하면 `supplement` 블록에서 출처와 함께).
6. **GA / Preview / Roadmap 상태와 날짜**는 세션 또는 T3 가 명시한 경우에만 쓴다. 명시되지 않았으면 `미언급` 으로 두고 `Caveats & open questions` 에 적는다. 추측 금지.
7. **수치·벤치마크·고객 사례**는 세션에서 말한 수치 그대로, 조건(비교 대상·환경)과 함께 쓴다. 단위 변환·반올림·재계산 금지.
8. **확신이 없으면 단정하지 말고** `Caveats & open questions` 에 질문으로 남긴다.
9. 인용은 짧게, 영어 원문 + 발화자 표기 후 한국어로 설명한다. 트랜스크립트·슬라이드 파일을 저장소에 커밋하지 않는다(`.cache/` 는 git-ignored).
10. 근거 표기: `Key announcements` 표의 `근거` 열과 본문 필요한 곳에 `transcript: Satya Nadella "…"`, `영상 12:34`, `슬라이드 #7` 처럼 위치를 남긴다.

## 2. 세션 노트 작업 절차

```bash
pip install -r requirements.txt
python tools/fetch_sources.py BRK220          # .cache/sources/BRK220/ 에 catalog.md · transcript.txt · slides.pptx
python tools/new_session.py BRK220            # docs/sessions/BRK220-<slug>.md 생성 (카탈로그 필드 자동 입력)
# … 노트 작성 (T1 근거로) …
python tools/build_pages.py                   # 인덱스·카탈로그·nav 재생성
python tools/validate.py                      # 카탈로그 일치·근거·섹션 검증
mkdocs build --strict
```

- 영상만 있고 트랜스크립트가 없으면 영상을 보며 타임스탬프(`MM:SS`)로 근거를 남긴다. 영상이 없으면(`video` 빈 값) `triage.yml` 에 `hold` 로 둔다.
- 노트를 만든 뒤 `triage.yml` 항목은 그대로 둬도 된다 — 진행 상태는 노트의 `status` 가 우선한다.

## 3. File layout

```
catalog/                 # 공식 카탈로그 스냅샷 — sessions.json/csv/meta.json/SESSIONS.md 는 생성물, triage.yml 만 수동
docs/
├── index.md             # 홈 (<!-- gen:* --> 블록은 생성물)
├── catalog/index.md     # 세션 탐색기 (sessions.json 은 생성물)
├── sessions/
│   ├── _TEMPLATE.md     # 노트 템플릿 (사이트 빌드 제외, 직접 복사하지 말고 new_session.py 사용)
│   ├── index.md         # 생성물
│   ├── <CODE>-<slug>.md # 세션 1개 = 파일 1개
│   └── <CODE>-<slug>/   # 그 노트의 이미지·다이어그램
├── themes/              # 여러 노트를 묶는 주제 페이지 (작성된 노트만 근거)
└── contributing.md
tools/                   # fetch_catalog · fetch_sources · new_session · build_pages · validate
```

- 파일명: `<CODE>-<slug>.md`. CODE 는 카탈로그 `sessionCode` 그대로(`KEY01`, `BRK220`, `THRSP312`, `LTG401` …), slug 는 소문자·하이픈.
- **생성물은 손으로 고치지 않는다**: `catalog/SESSIONS.md`, `catalog/sessions.*`, `catalog/meta.json`, `docs/catalog/sessions.json`, `docs/sessions/index.md`, `docs/index.md` 의 `gen:` 블록, `mkdocs.yml` 의 `gen:nav` 블록. CI 가 `build_pages.py --check` 로 확인한다.

## 4. Frontmatter schema

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
tags: []                  # (선택) 우리 분류, 소문자-하이픈
status: draft             # draft | review | done
last_updated: YYYY-MM-DD
```

카탈로그가 갱신되어 값이 바뀌면(예: 영상 URL 추가) 노트의 해당 필드를 카탈로그 값으로 맞춘다.

## 5. Session note structure

섹션 헤딩 이름과 순서는 고정이다(`tools/catalog_lib.py: SECTION_ORDER`). 해당 없는 섹션은 통째로 삭제하고, 빈 채로 두지 않는다.

| # | 카테고리 | 섹션 | 조건 |
|---|---|---|---|
| 1 | Summary | `## TL;DR` | **필수** |
|   |   | `## Top highlights` | 해당 시 |
| 2 | Context | `## Why it matters` | **필수** |
|   |   | `## Customer scenarios` | 권장 — 세션이 제시한 시나리오 우선, 우리 아이디어면 "적용 아이디어"로 표기 |
| 3 | Announcements | `## Key announcements` | 해당 시 — 세션에서 발표·언급된 것만 |
| 4 | Deep dive | `## Session summary` · `## Architecture` · `## Demo highlights` · `## Code & samples` | 권장 / 해당 시 |
| 5 | Assessment | `## Caveats & open questions` | 권장 |
| 6 | References | `## Resources` | **필수** — 세션 페이지 링크 필수 |
|   |   | `## Related sessions` | 권장 — Ignite 2026 카탈로그에 실재하는 세션만 |

### Ignite session_type 별 권장 조합

| session_type (카탈로그) | 핵심 섹션 |
|---|---|
| `Keynote` | TL;DR · **Top highlights** · Why it matters · **Key announcements** · Resources |
| `Breakout`, `Pre-recorded` | TL;DR · Why it matters · Customer scenarios · Key announcements · **Session summary** · Architecture · Demo highlights · Code & samples · Caveats · Resources |
| `Theater`, `Lightning Talk`, `Broadcast Stage` | TL;DR · **Top highlights** · Why it matters · Demo highlights · Resources |
| `Table Talk`, `Innovation Session` | TL;DR · **Top highlights**(논의 포인트) · Why it matters · Caveats · Resources |
| `Lab`, `Digital Lab` | TL;DR · Why it matters · Session summary · **Code & samples** · Caveats · Resources |

### Callouts

```markdown
!!! ga "GA"                       # 세션/T3 가 GA 라고 말한 경우만
!!! preview "Public Preview"
!!! preview-private "Private Preview"
!!! limited "Limited Availability"
!!! roadmap "Roadmap"
!!! supplement "세션 외 보충 · Book of News 2026"   # T3/T4 정보는 반드시 이 블록 안에, 링크와 함께
```

## 6. Writing rules

- 본문은 한국어. 제품·기능·SDK 이름 등 고유명사는 영어 원문 유지.
- 제목·소제목은 명사구. 결론을 각 절 첫 문장에 둔다.
- 마케팅 형용사 금지 (revolutionary, game-changing, seamless, cutting-edge 등 — validate.py 경고).
- 링크는 실재하는 URL 만: 세션 페이지 `https://ignite.microsoft.com/en-US/sessions/<CODE>`, 카탈로그의 `video`/`slides`/`resources`, Book of News, Microsoft Learn. URL 을 추측해 만들지 않는다.
- 외부 공개 사이트다: 고객명·내부 정보·NDA 내용·발표자 연락처를 넣지 않는다.
- 다이어그램은 세션이 보여준 구조만 그린다. `docs/sessions/<CODE>-<slug>/` 에 PNG/SVG 로 두고 상대경로로 참조. 텍스트 흐름이면 표나 목록을 우선한다.

## 7. Validation (CI: `.github/workflows/deploy-site.yml`)

`tools/validate.py` 가 막는 것:

- 파일명 코드가 카탈로그에 없음 / slug 형식 위반
- 카탈로그 유래 frontmatter 값이 카탈로그와 다름 (제목 오타, 토픽 임의 변경 등)
- `review`/`done` 인데 T1 근거(`video`/`transcript`/`slides`)가 없음
- 필수 섹션 누락, 알 수 없는 섹션 헤딩, 섹션 순서 위반, 세션 페이지 링크 누락
- 카탈로그에 없는 세션 코드 링크
- `supplement` 블록 밖에서 다른 이벤트 참조 (`build.microsoft.com`, `Build 20xx`, `Ignite 2025` 등)
- `triage.yml` 의 잘못된 코드·상태

## 8. Things Copilot should NOT do

- 초록·`aiDescription`·사전 지식으로 세션 내용을 "그럴듯하게" 채우기.
- 다른 이벤트(특히 Build 2026) 노트의 문장·표·다이어그램 재사용.
- 카탈로그 유래 필드를 손으로 수정하거나 섹션 이름·순서 변경.
- 생성물 직접 편집, `mkdocs.yml` 의 theme/plugins/markdown_extensions 임의 변경, hooks·서드파티 플러그인 추가(→ Zensical 이전 호환성 유지).
- 트랜스크립트·슬라이드·영상 원본 파일 커밋.
- 영어 본문 전환, 마케팅 톤 재작성.
