# 설계 메모 — 사이트 내장 챗봇 (서버 없음 · 사용자 Copilot 크레딧) (2026-11-25)

## 목표

- 이 사이트가 제공하는 챗봇: 모든 페이지 우하단에서 열리는 패널로, **이 사이트에 정리된 노트·카탈로그만 근거로** 답한다.
- **서버 없음.** 정적 GitHub Pages 그대로, 로직은 전부 브라우저에서 돈다.
- 모델 호출은 **사용자 본인의 GitHub Copilot** 으로 — 사용량은 그 사용자의 premium request 한도에서 차감되고, 사이트 운영자는 키·비용을 갖지 않는다.

## 사전 조사 (2026-11-25, `Origin: https://caldova-kr.github.io` 로 직접 확인)

| 엔드포인트 | 브라우저 호출 | 판단 |
|---|---|---|
| `github.com/login/oauth/access_token`, `github.com/login/device/code` | ❌ CORS 헤더 없음, `client_secret` 필요 | OAuth "Sign in with GitHub" 버튼은 서버 없이는 불가 |
| `api.githubcopilot.com/models`, `/chat/completions` | ✅ `Access-Control-Allow-Origin: *`, preflight 허용, SSE 스트리밍 동작, 별도 integration 헤더 불필요 | **모델 호출 경로** |
| `api.github.com/user` | ✅ CORS `*` | 토큰 확인 · 로그인 사용자 표시 |
| `models.github.ai` (GitHub Models) | ❌ CORS 헤더 없음 | 사용 안 함 |

- GitHub 문서(Managing your personal access tokens)가 fine-grained PAT 계정 권한 **`copilot_requests` (Copilot requests)** 를 "Copilot requests for the given user … count towards the user's premium request allowance" 로 정의하고, 같은 문서가 **URL 파라미터로 토큰 생성 화면을 미리 채우는 방법**을 제공한다. Copilot SDK 인증 문서도 `github_pat_` 를 지원 토큰으로 명시.
- 따라서 "GitHub 로그인" = **사이트가 미리 채운 링크로 사용자가 직접 만든 fine-grained PAT(권한: Copilot requests 하나, 리포 접근 없음)를 붙여 넣는 것.** 토큰은 사용자 브라우저에서 GitHub 로만 전송된다.

### WebAssembly 판단

- 모델은 GitHub 쪽에서 돌기 때문에 WASM 이 할 일은 **검색(retrieval)** 뿐이다. 지금 노트 규모(검색 인덱스 36 섹션 + 카탈로그 1.4k 행)는 순수 JS 로 즉시 처리된다.
- 1차는 **WASM 없이** 순수 JS. 노트가 수백 개로 늘어 한국어 검색 품질이 문제가 되면 Pagefind(WASM, 정적 인덱스, CI 에서 `_site` 후처리 — MkDocs 플러그인 아님)로 `search_notes` 내부만 바꾼다. 도구 계약은 그대로.
- Copilot SDK 런타임을 WASM/WebContainer 로 브라우저에 올리는 안은 런타임이 Node 프로세스·파일시스템을 전제해 과하다 → 에이전트 루프를 직접 구현(수백 줄).

## 아키텍처

```
브라우저 (GitHub Pages 정적 페이지)
 ├─ chat.js          패널 UI · 토큰/모델 선택 · 대화 상태(sessionStorage, 페이지 이동해도 유지)
 └─ chat-agent.js    DOM 없는 순수 로직 (Node 테스트 가능)
      ├─ Knowledge   ← <site>/search/search_index.json (MkDocs 가 이미 생성) + <site>/catalog/sessions.json (기존 생성물)
      ├─ tools       search_notes · get_note · search_catalog · get_session
      ├─ runAgent    OpenAI 형식 tool calling 루프 (최대 5 라운드, 스트리밍)
      └─ Copilot API  GET /models · POST /chat/completions   (Authorization: Bearer <사용자 PAT>)
```

### 도구 (지식 범위를 이 사이트로 한정)

| 도구 | 데이터 | 반환 |
|---|---|---|
| `search_notes(query, limit)` | search_index 중 `sessions/`·`themes/` 하위 노트 섹션 (인덱스 페이지 제외) | 섹션 제목 · 노트 URL · 발췌 |
| `get_note(path)` | 같은 노트의 섹션 전체 (HTML 태그 제거) | 노트 본문 |
| `search_catalog(query, type, topic, has_note, limit)` | `catalog/sessions.json` | 코드 · 제목 · 타입 · 토픽 · 발표자 · 세션 페이지 · 노트 URL |
| `get_session(code)` | 같은 카탈로그 1행 | 위 + 영상 링크 + 카탈로그 초록(예정 내용 표시) |

- 새 생성물·인덱스를 만들지 않는다 → `build_pages.py --check`·`validate.py` 와 무관.
- 카탈로그 `aiDescription` 은 원래 사이트 JSON 에 없다(근거 금지 원칙 유지).

### 근거 정책 (시스템 프롬프트)

- 사실은 도구 결과(노트)에서만, 답마다 노트 링크. 모델 사전 지식·다른 이벤트 내용으로 보충 금지.
- 노트가 없는 세션은 카탈로그 정보(제목·발표자·세션 페이지·영상)만 안내하고 "아직 정리된 노트가 없습니다". 카탈로그 초록은 "다룰 예정이라고 소개된 내용" 으로만.
- GA/Preview 상태·수치는 노트에 적힌 그대로. 사이트와 무관한 질문은 정중히 범위 밖이라고 답한다. 한국어 합니다체.
- 현재 보고 있는 페이지 경로·제목을 함께 전달해 "이 노트" 질문을 처리.

### UI

- 플로팅 버튼 → 오른쪽 패널(모바일은 전체 화면). Material 팔레트 변수 사용, 라이트/다크 자동.
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

## 범위 밖 (YAGNI)

- OAuth 버튼 로그인(서버 필요), `/responses` 전용 모델(GPT 계열) 지원, 대화 기록 영구 저장, WASM 검색, WebMCP 노출(브라우저 에이전트용 — 도구 계약이 같아 나중에 `document.modelContext.registerTool` 로 쉽게 추가 가능).

## 테스트

- `tests/chat_agent.test.mjs` (`node --test`): 검색 점수·노트 필터, get_note 조립, 카탈로그 필터, 스트리밍 tool-call 누적, 에이전트 루프(가짜 fetch), 마크다운 렌더러 XSS 방지.
- CI(`deploy-site.yml`)에 `node --test tests/` 추가. 기존 `validate.py`·`build_pages.py --check`·`pytest`·`mkdocs build --strict` 유지.
- 실제 Copilot API 로 tool calling 1회 수동 확인.
