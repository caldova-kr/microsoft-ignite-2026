---
title: 사이트 챗봇 구조
description: GitHub 로그인 후 방문자 자신의 Copilot 으로, 이 사이트의 노트와 카탈로그만 근거로 답하는 챗봇의 구성 · 로그인 흐름 · 에이전트 루프 · 데이터 위치.
---

# 사이트 챗봇 구조

이 사이트의 챗봇은 **브라우저 안에서 도는 에이전트**입니다. 답변은 방문자 본인의 GitHub Copilot 이 만들고, 근거는 이 사이트에 정리된 노트와 카탈로그로 한정됩니다.
홈에서 **💬 대화 화면** 으로 전환하거나, 어느 페이지에서든 오른쪽 아래 버튼으로 엽니다.

## 구성

<figure class="ar-figure" markdown="0">
--8<-- "docs/chatbot/architecture.svg"
<figcaption>구성도</figcaption>
</figure>

서버를 두지 않는 것이 출발점이었습니다. 모델 호출과 도구 실행은 모두 탭 안에서 일어나고, 사이트는 GitHub Pages 정적 파일 그대로입니다.
Azure Functions relay 는 **로그인 두 요청만** 통과시킵니다. 이 relay 가 꼭 필요한 이유는 다음과 같습니다.

- GitHub 의 로그인 엔드포인트(`github.com/login/device/code`, `/login/oauth/access_token`)는 CORS 헤더를 주지 않아, 브라우저 스크립트가 응답을 읽을 수 없습니다. WebAssembly 도 같은 브라우저 보안 규칙을 따르므로 우회가 되지 않습니다.
- 반대로 Copilot API(`api.githubcopilot.com` 의 `/models` · `/chat/completions`)는 CORS 를 열어 두어, 로그인 이후는 브라우저에서 직접 호출합니다.

## 로그인 — GitHub device flow

<figure class="ar-figure" markdown="0">
--8<-- "docs/chatbot/device-flow.svg"
<figcaption>로그인 순서</figcaption>
</figure>

- **PAT 를 받지 않습니다.** 붙여 넣는 토큰은 범위·만료를 사이트가 통제할 수 없고 노출 시 피해가 커서, GitHub App 승인 방식으로 바꿨습니다.
- **device flow 라 `client_secret` 이 없습니다.** relay 에도 비밀 값이 없고, 갖고 있는 것은 공개 값인 Client ID 와 허용 origin 목록뿐입니다.
- 토큰은 8시간 뒤 만료되고, 만료 5분 전에 refresh token 으로 갱신합니다. 승인 회수는 GitHub **Settings → Applications** 에서 합니다.

## 에이전트 루프

<figure class="ar-figure" markdown="0">
--8<-- "docs/chatbot/agent-loop.svg"
<figcaption>에이전트 루프</figcaption>
</figure>

- **먼저 찾아보고 답합니다.** 시스템 프롬프트는 7줄로 짧게 두고, 무엇을 아는지는 도구(`get_site_overview` 등)로 확인하게 했습니다. 프롬프트에 지식을 미리 넣지 않아 노트가 늘어도 프롬프트는 그대로입니다.
- 지식은 빌드 산출물뿐이라 사이트에 없는 내용은 답하지 않습니다. 노트의 상태·수치·날짜는 노트에 적힌 그대로 답하게 했습니다.
- 페이지 도구는 [WebMCP](https://github.com/webmachinelearning/webmcp) 를 지원하는 브라우저에도 같은 이름으로 등록되어, 브라우저 쪽 에이전트도 이 사이트를 같은 방식으로 다룰 수 있습니다.
- `navigation.instant` 로 페이지를 옮겨도 대화 패널과 진행 중인 답변이 유지됩니다.

## 데이터가 머무는 곳

<figure class="ar-figure" markdown="0">
--8<-- "docs/chatbot/data.svg"
<figcaption>데이터 위치</figcaption>
</figure>

## 제약

- **쓸 수 있는 모델이 제한됩니다.** 제3자 앱(OAuth App · GitHub App)이 받은 사용자 토큰에는 Copilot 기본 모델(gpt-4o 계열 등)만 열립니다. 다른 모델은 `model_not_supported` 로 거절되며, 이는 GitHub 쪽 정책이라 사이트에서 바꿀 수 없습니다.
- `/responses` 엔드포인트와 GitHub Models(`models.github.ai`)는 CORS 를 열지 않아 브라우저에서 쓸 수 없습니다. 이 둘을 쓰려면 모델 호출 전체를 중계하는 서버가 필요해, 이 구조의 목표와 맞지 않습니다.
- Copilot 이 없는 계정은 로그인은 되지만 답변을 받을 수 없습니다.

## 검색 엔진 · 외부 AI 를 위한 출력

챗봇과 같은 지식을 외부 AI 도구도 읽을 수 있게, 빌드 때 [`llms.txt`](../llms.txt)(노트 목록과 요약)와 [`llms-full.txt`](../llms-full.txt)(노트 전문)를 함께 만듭니다. 노트 frontmatter 의 `description` 은 페이지 `<meta description>` 과 이 파일들의 요약으로 쓰입니다.

## 소스

| 구성 요소 | 파일 |
|---|---|
| 에이전트 · 도구 · 로그인 (DOM 없음) | [`docs/javascripts/chat-agent.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/chat-agent.js) |
| 대화 화면 · 홈 전환 | [`docs/javascripts/chat.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/chat.js) |
| 페이지 도구 · WebMCP | [`docs/javascripts/site-tools.js`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/docs/javascripts/site-tools.js) |
| 로그인 relay (Azure Functions) | [`relay/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/relay) |
| 지식 · `llms.txt` 생성 | [`tools/build_pages.py`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/tools/build_pages.py) |
