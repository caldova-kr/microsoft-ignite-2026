# 설계 메모 — 사이트 내장 채팅 에이전트 (GitHub 로그인 + 사용자 Copilot 모델) (2026-11-25)

## 목표

- GitHub Pages 사이트(`https://caldova-kr.github.io/microsoft-ignite-2026/`) **안에** 채팅 패널을 띄운다.
- 사용자는 **GitHub 로 로그인**하고, 에이전트는 **그 사용자의 GitHub Copilot 구독·모델**로 답한다 (사이트 운영자가 모델 비용·키를 갖지 않음).
- 답변은 **이 사이트에 정리된 노트·카탈로그만 근거**로 한다 — 저장소 원칙(T1 근거, 사전 지식 금지)을 채팅에도 그대로 적용.
- 부가: 같은 도구를 **WebMCP** 로도 노출해, 브라우저 내장 에이전트(Edge/Chrome)가 이 사이트를 도구로 쓸 수 있게 한다.

## 사전 조사 (2026-11-25 확인)

| 항목 | 결과 | 영향 |
|---|---|---|
| GitHub OAuth 토큰 교환 `github.com/login/oauth/access_token`, device flow `github.com/login/device/code` | CORS 헤더 없음 (preflight 404) + `client_secret` 필요 | **정적 페이지만으로 로그인 불가** → 토큰 교환용 서버 필수 |
| GitHub Models `models.github.ai/inference` | 응답에 `Access-Control-Allow-Origin` 없음 | 브라우저 직접 호출 불가, 프록시 필요. 또 Copilot 구독 모델이 아니라 GitHub Models 한도/과금 체계 |
| `api.githubcopilot.com` | CORS `*` 허용되지만 서드파티 앱용 공개 계약이 아님 | 직접 호출하지 않는다 |
| **GitHub Copilot SDK** (`@github/copilot-sdk`) | 공식 인증 방식 "GitHub OAuth App / GitHub App" — 사용자 토큰(`ghu_`/`gho_`)을 넘기면 **사용자 Copilot 구독으로 과금**, 모델 선택·커스텀 도구·세션 지원. 서버(런타임 프로세스)에서 실행 | **"로그인한 사용자의 Copilot 모델" 요구를 공식적으로 충족하는 유일한 경로** |
| WebMCP (`document.modelContext.registerTool`) | Chromium 146+ Early Preview, Tools 만 지원 | 보조 채널로만. 로그인·Copilot 모델과는 무관(브라우저 에이전트가 자기 모델 사용) |
| MkDocs 제약 (`design/2026-11-20-…`) | hooks·서드파티 플러그인 금지(Zensical 이전), `theme/plugins/markdown_extensions` 변경 금지 | 위젯은 `extra_javascript`/`extra_css` 로만 주입. 템플릿 override(`custom_dir`) 쓰지 않음 |

## 접근 비교

| | A. Copilot SDK 백엔드 (**채택**) | B. GitHub Models 프록시 | C. WebMCP 단독 |
|---|---|---|---|
| 로그인 | GitHub App (서버가 토큰 교환) | GitHub App | 없음 |
| 모델·과금 | 사용자 Copilot 구독·모델 목록 | GitHub Models 무료 한도/유료 | 사용자 브라우저 에이전트 |
| 사이트 내 채팅 UI | ✅ | ✅ | ❌ (브라우저 사이드바) |
| 서버 | 필요 (SDK 런타임 상주) | 필요 (무상태 프록시) | 불필요 |
| 성숙도 | SDK 공식 문서화 | GA | Early Preview |

→ **A 를 본체로, C 를 같은 도구 계약을 재사용하는 부가 기능으로.** B 는 "Copilot 모델" 요구를 만족하지 않아 제외.

## 아키텍처

```
[GitHub Pages (정적)]                         [Chat backend — Azure Container Apps]           [GitHub]
 docs/javascripts/chat.js  ──popup──▶  /auth/login ─────────────────────────────────▶ github.com/login/oauth/authorize
   (패널 UI)                ◀─postMessage─ /auth/callback ◀── code ──  토큰 교환(client_secret) ─▶ access_token(ghu_)
   sessionStorage: 세션 토큰                │ ghu_ 는 서버 메모리(세션 맵)에만, 브라우저엔 불투명 세션 토큰
   │                                       │
   ├─ GET  /models  ───────────────────────▶ CopilotClient(gitHubToken=ghu_).listModels()
   └─ POST /chat (SSE) {q, model, page} ───▶ session.send(…) ── Copilot API (사용자 구독) ─▶
                                           │   커스텀 도구만 허용:
                                           │   search_notes · get_note · search_catalog · get_session
                                           └── 데이터: 배포된 사이트의 search/search_index.json, catalog/sessions.json (주기적 캐시)
 docs/javascripts/webmcp.js  — 같은 도구 4종을 브라우저에서 정적 JSON 으로 구현해 document.modelContext 에 등록 (지원 브라우저만)
```

### 구성 요소

1. **채팅 위젯** — `docs/javascripts/chat.js` + `docs/stylesheets/chat.css`, vanilla JS (기존 `catalog.js` 와 같은 무의존 스타일).
   - 우하단 플로팅 버튼 → 사이드 패널. 로그인 전: "GitHub 로 로그인" 버튼. 로그인 후: 모델 선택, 대화, 스트리밍 답변(마크다운 → 안전한 DOM 렌더, `innerHTML` 미사용).
   - 현재 페이지 `location.pathname`·제목을 `page` 로 함께 보내 "이 노트 기준으로" 질문 가능.
   - 백엔드 URL 은 `docs/javascripts/chat-config.js` 상수 하나 (mkdocs.yml `extra` 는 템플릿 override 없이는 JS 로 못 읽음).
   - 백엔드 미설정·장애 시 버튼 자체를 숨긴다 → 사이트 기본 기능에 영향 없음.
2. **백엔드** — 저장소 `agent/` (TypeScript, Node, `@github/copilot-sdk`, Dockerfile).
   - `GET /auth/login` → state(+PKCE) 생성 후 GitHub App 인가 URL 로 리다이렉트.
   - `GET /auth/callback` → state 검증, 토큰 교환, 사용자 확인(`GET /user`), 불투명 세션 토큰 발급 → 팝업이 `window.opener.postMessage(token, SITE_ORIGIN)` 후 닫힘. (Pages 와 백엔드 도메인이 달라 서드파티 쿠키에 의존하지 않기 위함)
   - `GET /models`, `POST /chat` (SSE), `POST /auth/logout`.
   - 사용자별 `CopilotClient` 는 세션 맵에 보관, 유휴 15분 후 `stop()`, 동시 사용자 상한으로 메모리 보호. 재시작 시 세션은 사라지고 재로그인 (DB 없음 — YAGNI).
   - CORS: `https://caldova-kr.github.io` 와 `http://127.0.0.1:8000`(mkdocs serve)만.
3. **콘텐츠 도구** (백엔드·WebMCP 공통 계약)
   - `search_notes(query)` — MkDocs 가 이미 생성하는 `search/search_index.json` 에서 `sessions/`·`themes/` 문서만 대상으로 키워드 검색 → 제목·URL·발췌.
   - `get_note(path)` — 해당 노트 섹션 텍스트 (search_index 의 섹션 단위 엔트리 재조립).
   - `search_catalog(query, filters)` / `get_session(code)` — `catalog/sessions.json` (제목·타입·토픽·발표자·세션 페이지·영상 링크).
   - 새 인덱스 생성물을 만들지 않는다 — 기존 빌드 산출물만 읽으므로 `build_pages.py --check`·`validate.py` 와 무관.
4. **근거 정책 (시스템 프롬프트)**
   - 노트(`docs/sessions/`·`docs/themes/`) 내용만 사실로 답하고, 답마다 노트 링크를 단다.
   - 노트가 없는 세션은 카탈로그 메타데이터(제목·발표자·세션 페이지·영상)만 안내하고 "아직 정리된 노트가 없습니다" 라고 말한다. 초록으로 발표 내용을 추정하지 않는다(카탈로그 `aiDescription` 은 도구 결과에서 제외).
   - 모델 사전 지식·다른 이벤트 내용으로 보충하지 않는다. 한국어 답변.
5. **보안**
   - SDK 세션은 위 4개 커스텀 도구만 노출(빌트인 셸·파일·웹 도구 비활성), `onPermissionRequest` 는 커스텀 도구 외 전부 거부. 컨테이너에는 GitHub App secret 외 자격 증명 없음.
   - GitHub App 은 리포지토리·조직 권한을 요청하지 않는다(계정 권한은 Copilot SDK "GitHub OAuth setup" 문서가 요구하는 것만). 토큰은 로그에 남기지 않음.
   - `postMessage` 는 대상 origin 고정, 위젯은 `event.origin === BACKEND_ORIGIN` 만 수신.
   - 요청 크기·속도 제한(사용자당), 프롬프트 주입 대비로 도구 결과는 "데이터" 로 감싸 전달.

### 오류 처리

| 상황 | 동작 |
|---|---|
| 사용자에게 Copilot 구독/정책 없음 | SDK 오류를 잡아 "이 계정은 Copilot 을 쓸 수 없습니다" 안내 |
| 토큰 만료(GitHub App 사용자 토큰 8h) | refresh token 으로 갱신, 실패 시 재로그인 유도 |
| 백엔드 다운 / 콜드 스타트 | 위젯 상태 표시 후 재시도, 사이트 탐색은 정상 |
| 팝업 차단 | 같은 창 리다이렉트 + `#chat-token=` 프래그먼트 수신으로 폴백 |

## 배포

- 백엔드: Azure Container Apps (최소 레플리카 0~1, SDK 런타임이 프로세스를 띄우므로 Functions 대신 컨테이너). `.github/workflows/deploy-agent.yml` — `agent/**` 변경 시 이미지 빌드·배포 (Node 24 런타임 액션 버전 유지).
- GitHub App: `caldova-kr` 조직 소유, callback = `<backend>/auth/callback`. Client ID/secret 은 Container Apps secret.
- 사이트: `mkdocs.yml` 의 `extra_javascript`/`extra_css` 에 위젯 파일만 추가.

## 테스트

- `agent/`: 콘텐츠 도구 검색·필터 단위 테스트(고정 fixture JSON), OAuth state 검증·origin 검증 테스트, `/chat` 은 SDK 를 목으로 바꿔 SSE 형식 확인.
- 사이트: `python tools/validate.py && python tools/build_pages.py --check && mkdocs build --strict` 통과 유지, `mkdocs serve` + 브라우저로 위젯 로그인·대화 수동 확인.

## 범위 밖 (YAGNI)

- 대화 기록 영구 저장, 다중 레플리카 세션 공유, 벡터 인덱스/임베딩, 익명(비로그인) 채팅, GitHub Models 폴백.

## 결정이 필요한 것 (구현 전)

1. 백엔드 호스팅: Azure Container Apps(제안) — 사용할 구독/리소스 그룹.
2. GitHub App 소유: `caldova-kr` 조직(제안) vs 개인 계정.
3. 이용 범위: Copilot 이 있는 모든 GitHub 사용자(제안) vs 특정 조직 멤버만.
4. WebMCP 부가 기능 포함 여부 (제안: 1차에 포함, 도구 계약 공유로 추가 비용 작음).
