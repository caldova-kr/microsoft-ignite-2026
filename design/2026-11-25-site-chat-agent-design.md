# 설계 메모 — 사이트 내장 챗봇 (서버 없음 · 사용자 Copilot 크레딧) (2026-11-25)

## 목표

- 이 사이트가 제공하는 챗봇: 모든 페이지 우하단에서 열리는 패널로, **이 사이트에 정리된 노트·카탈로그만 근거로** 답한다.
- **서버 없음.** 정적 GitHub Pages 그대로, 로직은 전부 브라우저에서 돈다.
- 모델 호출은 **사용자 본인의 GitHub Copilot** 으로 — 사용량은 그 사용자의 premium request 한도에서 차감되고, 사이트 운영자는 키·비용을 갖지 않는다.

## 사전 조사 (2026-11-25, `Origin: https://caldova-kr.github.io` 로 직접 확인)

| 엔드포인트 | 브라우저 호출 | 판단 |
|---|---|---|
| `github.com/login/oauth/access_token`, `github.com/login/device/code` | ❌ 정상 응답(200)은 오지만 `Access-Control-Allow-Origin` 이 없어 브라우저가 응답을 읽지 못함 (유효한 client_id 로 재확인) | OAuth 버튼·**VS Code 식 device flow** 모두 서버(최소 CORS 중계) 없이는 불가 |
| `api.githubcopilot.com/models`, `/chat/completions` | ✅ `Access-Control-Allow-Origin: *`, preflight 허용, SSE 스트리밍 동작, 별도 integration 헤더 불필요 | **모델 호출 경로** |
| `api.github.com/user` | ✅ CORS `*` | 토큰 확인 · 로그인 사용자 표시 |
| `models.github.ai` (GitHub Models) | ❌ CORS 헤더 없음 | 사용 안 함 |

- GitHub 문서(Managing your personal access tokens)가 fine-grained PAT 계정 권한 **`copilot_requests` (Copilot requests)** 를 "Copilot requests for the given user … count towards the user's premium request allowance" 로 정의하고, 같은 문서가 **URL 파라미터로 토큰 생성 화면을 미리 채우는 방법**을 제공한다. Copilot SDK 인증 문서도 `github_pat_` 를 지원 토큰으로 명시.
- 따라서 "GitHub 로그인" = **사이트가 미리 채운 링크로 사용자가 직접 만든 fine-grained PAT(권한: Copilot requests 하나, 리포 접근 없음)를 붙여 넣는 것.** 토큰은 사용자 브라우저에서 GitHub 로만 전송된다.
- VS Code 식 device flow(코드 표시 → `github.com/login/device` 입력)는 VS Code 가 데스크톱 앱이라 CORS 제약이 없어서 가능한 방식이다. 웹 페이지에서 쓰려면 위 두 엔드포인트를 중계하는 무상태 함수가 필요하고(device flow 는 `client_secret` 불필요), 그 중계가 발급된 토큰을 거쳐 전달하게 된다 → "서버 없음" 원칙과 충돌해 1차에서는 채택하지 않는다.

### CopilotKit (생성형 UI) 판단

- 채팅 UX 는 CopilotKit 의 Generative UI 개념을 따른다: **Tool rendering**(도구 실행을 카드로), **Components as tools**(`useComponent` — 모델이 컴포넌트를 도구처럼 호출), **Human-in-the-loop**(사용자 선택을 기다리는 컴포넌트).
- 실제 SDK 는 쓰지 않는다. CopilotKit 은 기본적으로 `CopilotRuntime` 서버를 거치고, 런타임 없이 브라우저 에이전트를 붙이는 `selfManagedAgents` 는 문서상 **CopilotKit Intelligence Enterprise plan** 기능이며, 무료 대안 `agents__unsafe_dev_only` 는 "Don't ship it to production" 으로 명시돼 있다(docs.copilotkit.ai/backend/self-managed-agents, 2026-11-25 확인). React 번들·빌드 단계도 새로 생긴다.
- 대신 같은 개념을 vanilla JS 로 구현하고, 이름·형태를 CopilotKit 과 1:1 로 맞춰 둔다(데이터 도구 + render ≈ `useFrontendTool`, `show_*` ≈ `useComponent`, `ask_user_choice` ≈ `useHumanInTheLoop`). 나중에 SDK 로 옮길 때 컴포넌트 단위로 이식할 수 있다.

### WebAssembly 판단

- 모델은 GitHub 쪽에서 돌기 때문에 WASM 이 할 일은 **검색(retrieval)** 뿐이다. 지금 노트 규모(검색 인덱스 36 섹션 + 카탈로그 1.4k 행)는 순수 JS 로 즉시 처리된다.
- 1차는 **WASM 없이** 순수 JS. 노트가 수백 개로 늘어 한국어 검색 품질이 문제가 되면 Pagefind(WASM, 정적 인덱스, CI 에서 `_site` 후처리 — MkDocs 플러그인 아님)로 `search_notes` 내부만 바꾼다. 도구 계약은 그대로.
- Copilot SDK 런타임을 WASM/WebContainer 로 브라우저에 올리는 안은 런타임이 Node 프로세스·파일시스템을 전제해 과하다 → 에이전트 루프를 직접 구현(수백 줄).

## 아키텍처

```
브라우저 (GitHub Pages 정적 페이지)
 ├─ chat.js          패널 UI · 토큰/모델 선택 · 대화 상태(sessionStorage, 페이지 이동해도 유지)
 ├─ site-tools.js    페이지 도구(읽기·이동·강조·카탈로그 필터) + WebMCP 등록 · 지식 로더 공유
 └─ chat-agent.js    DOM 없는 순수 로직 (Node 테스트 가능)
      ├─ Knowledge   ← <site>/search/search_index.json (MkDocs 가 이미 생성) + <site>/catalog/sessions.json (기존 생성물)
      ├─ tools       search_notes · get_note · search_catalog · get_session
      ├─ components  show_sessions · show_sources (표시) · ask_user_choice (사용자 선택 대기)
      ├─ runAgent    OpenAI 형식 tool calling 루프 (최대 5 라운드, 스트리밍, onToolStart/onToolEnd/onInteract 이벤트)
      └─ Copilot API  GET /models · POST /chat/completions   (Authorization: Bearer <사용자 PAT>)
```

### 도구 (지식 범위를 이 사이트로 한정)

| 도구 | 데이터 | 반환 |
|---|---|---|
| `get_site_overview()` | 노트 목록(각 노트 `TL;DR` 요약) · 카탈로그 규모 · 탐색 방법 — `llms.txt` 와 같은 개요 | 탐색 시작점 |
| `search_notes(query, limit)` | search_index 중 `sessions/`·`themes/` 하위 노트 섹션 (인덱스 페이지 제외) | 섹션 제목 · 노트 URL · 발췌 |
| `get_note(path)` | 같은 노트의 섹션 전체 (HTML 태그 제거) | 노트 본문 |
| `search_catalog(query, type, topic, has_note, limit)` | `catalog/sessions.json` | 코드 · 제목 · 타입 · 토픽 · 발표자 · 세션 페이지 · 노트 URL |
| `get_session(code)` | 같은 카탈로그 1행 | 위 + 영상 링크 + 카탈로그 초록(예정 내용 표시) |

- 새 생성물·인덱스를 만들지 않는다 → `build_pages.py --check`·`validate.py` 와 무관.
- 카탈로그 `aiDescription` 은 원래 사이트 JSON 에 없다(근거 금지 원칙 유지).

### 생성형 UI 컴포넌트

| 컴포넌트 | 종류 | 모델이 넘기는 것 | 화면 데이터 출처 |
|---|---|---|---|
| 도구 카드 | tool rendering | (데이터 도구 호출 자체) | 도구 결과 — 실행 중 → 완료 · N건, 펼치면 결과 링크 |
| `show_sessions` | 표시 컴포넌트 | 세션 코드 목록 | 카탈로그 (제목·타입·발표자·토픽·노트/세션 페이지/영상) — 없는 코드는 "카탈로그에 없음" |
| `show_sources` | 표시 컴포넌트 | 노트 섹션 URL | 노트 검색 인덱스 (섹션 제목·노트 제목) — 사이트 밖 URL 은 버림 |
| `ask_user_choice` | human-in-the-loop | 질문 + 선택지 2~5개 | 버튼 클릭 값이 도구 결과로 모델에 돌아감 |

- 카드 내용은 모델 텍스트가 아니라 사이트 데이터로 채운다 → 근거 원칙이 UI 에도 적용된다.
- 표시 컴포넌트만 호출했고 본문이 이미 있으면 그 라운드에서 답을 끝낸다(불필요한 추가 호출 방지).
- 한 답변 = 텍스트·도구 카드·컴포넌트가 순서대로 놓인 parts 배열. `sessionStorage` 에 저장해 페이지를 옮겨도 다시 그린다(선택은 잠긴 상태로).

### 사이트 탐색 도구 · WebMCP (`site-tools.js`)

에이전트가 답만 하는 게 아니라 **사이트를 직접 읽고 움직이도록** 페이지 도구를 둔다. 같은 도구를 두 곳에 노출한다.

| 도구 | 하는 일 | 부작용 |
|---|---|---|
| `get_current_page` | 지금 페이지의 제목·URL·종류(home/note/catalog)·목차 앵커·보이는 섹션·**사용자가 선택한 텍스트** | 없음 |
| `open_page(path, anchor)` | 노트 경로·사이트 URL·세션 코드로 이동, anchor 섹션 강조. 같은 페이지면 스크롤+강조만 | 이동 (사이트 안만) |
| `highlight_section(anchor)` | 현재 페이지 섹션으로 스크롤하고 잠시 강조 | 없음 |
| `filter_catalog(text, type, topic, level, progress, media)` | 카탈로그 탐색기 폼에 값을 넣고 `change` 를 보내 실제 화면을 필터. 다른 페이지면 `catalog/?…` 로 이동 (기존 URL 상태 규약 재사용) | 이동 |

1. **우리 챗봇**: `runAgent({ extraTools })` 로 들어가 kind `page` 도구 카드로 보인다. 이동은 아래 "레이아웃 유지(instant navigation)" 방식으로 **턴 도중에** 일어나고, 결과로 새 페이지 정보(제목·종류·목차)가 돌아와 에이전트가 이어서 강조·이동·필터를 할 수 있다.
2. **WebMCP**: `document.modelContext.registerTool` 이 있으면(Chrome origin trial) 지식 도구 4개 + 페이지 도구 4개를 등록해, 브라우저 자체 에이전트가 우리 모델 호출 없이 사이트를 검색·탐색할 수 있다. 지식 도구는 `readOnlyHint: true`. 등록 실패는 무시(사이트 동작에 영향 없음).

- 이동은 이 사이트 안으로만 허용한다(사이트 밖 URL·노트 없는 세션은 오류로 돌려 모델이 안내하게 함).
- "보여 줘·열어 줘" 요청은 본문에 옮겨 적지 말고 화면에서 직접 보여 주도록 시스템 프롬프트에 규칙을 둔다.

### 레이아웃 유지 — `navigation.instant`

- Material 의 `navigation.instant`(내장 기능, 플러그인·hooks 아님)를 켠다. 내부 링크를 XHR 로 받아 `[data-md-component]` 영역(container·header-topic·tabs 등)만 바꾸고 `<body>` 는 유지하므로, `<body>` 에 붙인 채팅 패널과 **진행 중인 에이전트 턴이 페이지 이동 후에도 살아 있다**. Zensical 도 같은 키(`navigation.instant`)를 지원해 이전 경로를 해치지 않는다 — `theme.features` 변경은 이 이유로만 했다.
- 이동은 Material 과 같은 방식(임시 `<a>` 를 붙여 클릭)으로 한다. 클릭 직후 `window` 단계에서 `defaultPrevented` 를 확인해 instant navigation 이 받지 않았으면(예: sitemap 에 없는 URL) 그 클릭을 취소하고 "답을 마친 뒤 이동" 방식으로 바꾼다 → 전체 새로고침이 진행 중인 턴을 끊지 않는다.
- `document$` 를 구독해 새 페이지가 올 때마다 패널 자리를 다시 잡는다: 홈 대화 화면에서 다른 페이지로 가면 패널이 플로팅으로 옮겨 열린 채 유지, 홈으로 오면 보기 스위치를 다시 붙인다. 턴이 진행 중이면 메시지 목록을 다시 그리지 않는다.
- 로컬 확인: Material 은 sitemap URL 의 protocol·hostname 만 현재 위치로 바꾸고 port 는 바꾸지 않는다. `python -m http.server` 로 빌드 결과를 열면 instant navigation 이 동작하지 않으므로(폴백 경로만 확인됨) **`mkdocs serve`** 로 확인한다. GitHub Pages(포트 없음)에서는 그대로 동작한다.

### 근거 정책 (시스템 프롬프트)

- 사실은 도구 결과(노트)에서만, 답마다 노트 링크. 모델 사전 지식·다른 이벤트 내용으로 보충 금지.
- 노트가 없는 세션은 카탈로그 정보(제목·발표자·세션 페이지·영상)만 안내하고 "아직 정리된 노트가 없습니다". 카탈로그 초록은 "다룰 예정이라고 소개된 내용" 으로만.
- GA/Preview 상태·수치는 노트에 적힌 그대로. 사이트와 무관한 질문은 정중히 범위 밖이라고 답한다. 한국어 합니다체.
- 현재 보고 있는 페이지 경로·제목을 함께 전달해 "이 노트" 질문을 처리.

### UI

- 홈 화면은 두 가지 보기 중 선택(오른쪽 위 스위치, `localStorage` 에 기억, `?view=chat|landing` 링크 지원):
  - **📰 소개 화면** — 기존 랜딩 페이지 + 플로팅 챗봇.
  - **💬 대화 화면** — ChatGPT 형: 랜딩 내용을 숨기고 가운데 정렬 대화. 빈 상태는 인사말·추천 질문·입력창이 화면 가운데, 대화가 시작되면 입력창이 아래에 고정.
  - 두 보기와 다른 페이지의 플로팅 패널은 같은 대화를 공유한다. `docs/index.md` 에는 빈 마운트(`#icn-chat-home`)만 있어 JS 가 없으면 기존 랜딩 그대로.
- 다른 페이지: 플로팅 버튼 → 오른쪽 패널(모바일은 전체 화면). Material 팔레트 변수 사용, 라이트/다크 자동.
- 미연결: 설명 + "① 토큰 만들기"(미리 채운 GitHub 링크) + "② 붙여 넣기" 입력 + "이 브라우저에 기억" 체크(기본 off → `sessionStorage`, on → `localStorage`).
- 연결: 아바타·로그인 이름, 모델 선택(`model_picker_enabled` + `/chat/completions` 지원 + tool calls 지원 모델만), 대화, 새 대화, 연결 해제.
- 답변 렌더링: HTML 이스케이프 후 최소 마크다운(굵게·코드·링크·목록·줄바꿈)만, 링크는 `http(s)`/사이트 상대경로만 허용.

### 오류 처리

| 상황 | 동작 |
|---|---|
| 401 | 토큰 만료/오류 → 연결 해제 후 재입력 안내 |
| 403 | Copilot 사용 불가(구독·정책·권한 누락) 안내 |
| 429 | 한도/속도 제한 안내 |
| 도구 라운드 초과 | 마지막 라운드는 도구 없이 호출해 답을 마무리 |
| 지식 JSON 로드 실패 | 패널에 오류 표시, 사이트 기능은 영향 없음 |

### 보안

- 토큰은 `api.githubcopilot.com`·`api.github.com` 로만 전송, 로그·URL 에 남기지 않음. 권한은 Copilot requests 하나·만료 30일 기본.
- 사이트에는 우리 JS 외 서드파티 스크립트가 없어 저장 토큰 노출면이 작다. 그래도 기본 저장소는 `sessionStorage`.
- 모델 출력은 이스케이프 후 렌더링(`javascript:` 등 링크 차단).

## GEO — AI 엔진·에이전트가 읽기 쉬운 사이트

기본 원칙은 **"사이트를 탐색해서 답한다"** 다. 사람용 페이지와 같은 내용을 기계가 바로 읽을 수 있는 형태로도 내놓고, 챗봇·WebMCP·외부 AI 엔진이 모두 같은 입구에서 시작하게 한다.

| 산출물 | 대상 | 내용 | 만드는 곳 |
|---|---|---|---|
| `llms.txt` | 외부 AI 엔진·에이전트 | 사이트 설명 · 인용 규칙(근거 원칙) · 노트 목록(노트의 `## TL;DR` 인용문을 요약으로) · 카탈로그(URL 필터 예시)·JSON 링크 | `build_pages.py` 생성물 (`--check` 대상) |
| `llms-full.txt` | 〃 | 노트 전문 — URL·세션·상태·근거·갱신일 머리말 + 주석·figure·attr list·admonition 문법을 걷어낸 본문(이미지는 alt + 캡션 텍스트) | 〃 |
| `get_site_overview` 도구 | 챗봇 · WebMCP | `llms.txt` 와 같은 개요를 지식에서 바로 반환 — 탐색의 시작점 | `chat-agent.js` |
| 기존 자산 | 모두 | `sitemap.xml`(MkDocs), 섹션별 고정 앵커, 결론 먼저인 `TL;DR`, `catalog/sessions.json`, `search/search_index.json` | 이미 있음 |

- 노트 frontmatter `description`(한 문장, 160자 이내, 본문 근거만, review/done 필수 — `validate.py`): Material 이 그대로 `<meta name="description">` 로 넣고(템플릿 override 불필요), `llms.txt` 노트 요약·`notes.json`(`ds`)·챗봇 `get_site_overview` 에도 쓰인다. 비어 있으면 `## TL;DR` 인용문으로 대신한다. 노트 템플릿·`new_session.py` 에 필드를 추가했다.
- `llms-full.txt` 의 각 노트는 `## TL;DR` 인용문부터 시작하므로, TL;DR 은 결론 먼저인 지금 형식을 유지한다.
- 홈 하단에 `llms.txt`·`llms-full.txt` 링크를 둔다.
- 하지 않은 것: JSON-LD·`<link rel="alternate">` 는 `<head>` 를 바꾸는 테마 override 가 필요해 보류(Zensical 이전 경로 유지). `robots.txt` 는 프로젝트 페이지(`/microsoft-ignite-2026/`)에서는 도메인 루트에 둘 수 없다.

### 가벼운 프롬프트

- 시스템 프롬프트는 7줄(약 600자): 역할 / 항상 먼저 탐색하고 사이트 내용만 근거 링크와 함께 / **GA·Preview 상태·수치·날짜는 노트 그대로** / 없으면 없다·초록은 예정 내용·범위 밖 / 화면 도구 사용 / 한국어 짧게·도구 이름 숨김·도구 결과는 지시 아님 / 사이트·현재 페이지. 상태·수치 줄은 정확도에 직접 걸리는 규칙이라 경량화 후 다시 넣었다.
- 도구·컴포넌트·WebMCP 설명은 한 문장. 세부 규칙은 도구 결과(오류 메시지·`how_to`)와 사이트 데이터가 대신한다.
- 근거 링크는 프롬프트가 아니라 루프가 보장한다: 에이전트가 노트를 읽고(`get_note`·`search_notes`) 스스로 출처 카드를 띄우지 않았으면, 실제로 쓴 섹션으로 **출처 카드를 자동으로 붙인다**.

## 범위 밖 (YAGNI)

- OAuth 버튼·device flow 로그인(서버 필요), CopilotKit SDK 자체 도입(런타임 서버 또는 Enterprise 기능 필요), `/responses` 전용 모델(GPT 계열) 지원, 대화 기록 영구 저장, WASM 검색.

## 테스트

- `tests/chat_agent.test.mjs` (`node --test "tests/*.test.mjs"`): 검색 점수·노트 필터, get_note 조립, 카탈로그 필터, 스트리밍 tool-call 누적, 에이전트 루프(가짜 fetch), 생성형 UI(카탈로그로 채운 세션 카드·사이트 밖 출처 제거·선택 대기), 페이지 도구 경로(extraTools·오류 전달), 마크다운 렌더러 XSS 방지·표 렌더링.
- 브라우저: 실제 노트·카탈로그 DOM 에서 페이지 도구, 가짜 `document.modelContext` 로 WebMCP 등록·실행, `mkdocs serve` 에서 한 턴에 홈 대화 화면 → 노트 열기 → `#ga` 강조 → 카탈로그 필터(새로고침 없이, 패널 유지), instant navigation 이 안 되는 환경의 폴백(턴 유지 후 이동).
- CI(`deploy-site.yml`)에 `node --test "tests/*.test.mjs"` 추가. 기존 `validate.py`·`build_pages.py --check`·`pytest`·`mkdocs build --strict` 유지.
- 실제 Copilot API 로 tool calling·컴포넌트 호출 수동 확인.
