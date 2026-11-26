---
title: 사이트 Agent 구조
description: GitHub 로그인 후 방문자 자신의 Copilot 으로, 이 사이트의 노트와 카탈로그만 근거로 답하는 Agent 의 구성 · 로그인 흐름 · 에이전트 루프 · 데이터 위치.
---

# 사이트 Agent 구조

이 사이트의 Agent 는 **브라우저 안에서 도는 에이전트**입니다. 답변은 방문자 본인의 GitHub Copilot 이 만들고, 근거는 이 사이트에 정리된 노트와 카탈로그로 한정됩니다.
홈에서 **💬 대화 화면** 으로 전환하거나, 어느 페이지에서든 오른쪽 아래 버튼으로 엽니다.

## 한눈에

<figure class="ar-figure" markdown="0">
--8<-- "docs/agent/architecture.svg"
<figcaption>구성도</figcaption>
</figure>

## 왜 이 구조인가

- **서버를 두지 않습니다.** 모델 호출과 도구 실행은 모두 탭 안에서 일어나고, 사이트는 GitHub Pages 정적 파일 그대로입니다.
- **Copilot API 는 브라우저에서 바로 부릅니다.** `api.githubcopilot.com` 의 `/models` · `/chat/completions` 가 CORS 를 열어 두었기 때문입니다.
- **로그인만 relay 를 거칩니다.** GitHub 로그인 엔드포인트(`github.com/login/device/code`, `/login/oauth/access_token`)는 CORS 헤더를 주지 않아 브라우저 스크립트가 응답을 읽을 수 없습니다. WebAssembly 도 같은 브라우저 규칙을 따르므로 우회가 되지 않습니다.

## 로그인

<figure class="ar-figure" markdown="0">
--8<-- "docs/agent/device-flow.svg"
<figcaption>GitHub device flow 로그인 순서</figcaption>
</figure>

- **PAT 를 받지 않습니다.** 붙여 넣는 토큰은 범위 · 만료를 사이트가 통제할 수 없고 노출 시 피해가 커서, GitHub App 승인 방식으로 바꿨습니다.
- **비밀 값이 없습니다.** device flow 는 `client_secret` 이 필요 없어, relay 가 가진 설정은 공개 값인 Client ID 와 허용 origin 목록뿐입니다.
- **토큰은 8시간 뒤 만료됩니다.** 만료 5분 전에 refresh token 으로 갱신하고, 승인 회수는 GitHub **Settings → Applications** 에서 합니다.

## 답하는 방식

<figure class="ar-figure" markdown="0">
--8<-- "docs/agent/agent-loop.svg"
<figcaption>에이전트 루프</figcaption>
</figure>

- **먼저 찾아보고 답합니다.** 시스템 프롬프트는 7줄로 짧게 두고, 무엇을 아는지는 도구(`get_site_overview` 등)로 확인하게 했습니다. 노트가 늘어도 프롬프트는 그대로입니다.
- **사이트에 없는 내용은 답하지 않습니다.** 지식은 빌드 산출물뿐이고, 노트의 상태 · 수치 · 날짜는 노트에 적힌 그대로 답합니다.
- **페이지를 옮겨도 대화가 이어집니다.** Material 의 instant loading 으로 대화 패널과 진행 중인 답변이 유지됩니다.

## 데이터 위치

<figure class="ar-figure" markdown="0">
--8<-- "docs/agent/data.svg"
<figcaption>데이터가 머무는 곳</figcaption>
</figure>

## 사용 기술

| 기술 | 무엇인가 | 이 사이트에서 |
|---|---|---|
| [GitHub Copilot](https://docs.github.com/en/copilot) | GitHub 의 AI 도우미 | 방문자 본인 Copilot 으로 답변 생성 |
| [GitHub App · device flow](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app) | 코드 입력으로 사용자 토큰을 받는 로그인 방식 | PAT · `client_secret` 없는 로그인 |
| [Azure Functions Flex Consumption](https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan) | 요청이 있을 때만 실행되는 서버리스 요금제 | 로그인 두 요청만 넘기는 relay |
| [Material 내비게이션](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) | instant loading(새로 고침 없는 페이지 이동) | 이동 중에도 대화 유지 |
| [Material 검색](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | 빌드 때 만드는 검색 인덱스 | Agent 의 노트 지식 (`search_index.json`) |
| [WebMCP](https://github.com/webmachinelearning/webmcp) | 웹 페이지가 브라우저 AI 에이전트에 도구를 내주는 제안 표준 | 페이지 도구를 브라우저 에이전트에도 등록 |
| [llms.txt](https://llmstxt.org/) | AI 도구가 사이트를 읽기 쉽게 요약을 두는 제안 형식 | 같은 지식을 외부 AI 에 제공: [`llms.txt`](llms.txt) · [`llms-full.txt`](llms-full.txt) |

## 제약

- **쓸 수 있는 모델이 제한됩니다.** 제3자 앱(OAuth App · GitHub App)이 받은 사용자 토큰에는 Copilot 기본 모델(gpt-4o 계열 등)만 열리고, 다른 모델은 `model_not_supported` 로 거절됩니다. GitHub 쪽 정책이라 사이트에서 바꿀 수 없습니다.
- **`/responses` 와 GitHub Models(`models.github.ai`)는 쓸 수 없습니다.** 둘 다 CORS 를 열지 않아, 쓰려면 모델 호출 전체를 중계하는 서버가 필요합니다.
- **Copilot 이 없는 계정**은 로그인은 되지만 답변을 받을 수 없습니다.

## 운영

- relay 는 [`relay/deploy.sh`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/relay/deploy.sh) 로 배포합니다. 리소스 이름 · 리전은 실행할 때 넘기고 저장소에는 두지 않습니다.
- relay 주소는 저장소 변수 `AGENT_RELAY_URL` 에 두고, 배포 때 `agent.json` 으로 사이트에 넣습니다. 값이 없으면 Agent 가 "로그인이 아직 설정되지 않았다" 고 안내합니다.
- 설정 순서는 [`relay/README.md`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/relay/README.md) 에 있습니다.

## 소스

| 구성 요소 | 파일 |
|---|---|
| 에이전트 · 도구 · 로그인 (DOM 없음) | [`docs/javascripts/chat-agent.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/chat-agent.js) |
| 대화 화면 · 홈 전환 | [`docs/javascripts/chat.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/chat.js) |
| 페이지 도구 · WebMCP | [`docs/javascripts/site-tools.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/site-tools.js) |
| 로그인 relay (Azure Functions) | [`relay/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/relay) |
| 지식 · `llms.txt` 생성 | [`tools/build_pages.py`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/tools/build_pages.py) |
