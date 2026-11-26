---
title: 사이트 기술
description: Ignite 2026 Session Notes 를 만드는 기술 — GitHub Pages · MkDocs · Material for MkDocs · vanilla JS, 그리고 GitHub Actions CI/CD.
---

# 사이트 기술

이 사이트는 **서버 없는 정적 사이트**입니다. 노트는 Markdown 으로 쓰고, MkDocs 가 HTML 로 만들어 GitHub Pages 에 올립니다. 빌드부터 배포까지 GitHub 안에서 끝납니다.

## 스택

<figure class="ar-figure" markdown="0">
--8<-- "docs/site/stack.svg"
<figcaption>기술 스택</figcaption>
</figure>

- **MkDocs + Material for MkDocs.** Markdown 만으로 노트를 쓰고, 한국어 검색·라이트/다크 테마·상태 콜아웃(GA · Preview 등)을 설정만으로 씁니다. 버전은 [`requirements.txt`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/requirements.txt) 에 고정합니다.
- **hooks · 서드파티 플러그인 · 테마 override 를 쓰지 않습니다.** 나중에 [Zensical](https://zensical.org/) 로 옮길 수 있도록 Material 기본 기능과 `extra_css` · `extra_javascript` 만으로 꾸몄습니다.
- **UI 는 Material 위에 CSS 토큰만 얹었습니다.** 색과 글꼴(Noto Sans KR · JetBrains Mono)은 Ignite 2026 Breakout Design Guide 의 Magenta-Blue-Green 테마를 따랐고, 브랜드 아트는 쓰지 않습니다.
- **JavaScript 는 프레임워크 없이 씁니다.** 번들러·npm 빌드가 없어 배포물은 MkDocs 결과 그대로입니다. 카탈로그 탐색기·노트 보강·Agent 가 모두 `navigation.instant` 페이지 전환에 맞춰 동작합니다.
- **생성물은 손으로 고치지 않습니다.** 카탈로그 표·인덱스·nav·`llms.txt` 는 `tools/build_pages.py` 가 만들고, CI 가 `--check` 로 어긋남을 막습니다.

## CI/CD

<figure class="ar-figure" markdown="0">
--8<-- "docs/site/cicd.svg"
<figcaption>GitHub Actions 워크플로</figcaption>
</figure>

- **PR 도 배포와 같은 검사를 거칩니다.** 카탈로그와 다른 메타데이터, 근거 없는 `review`/`done`, 깨진 링크는 머지 전에 걸러집니다.
- **카탈로그는 매일 다시 받습니다.** 행사 뒤에도 on-demand 영상·트랜스크립트·슬라이드가 계속 추가되기 때문입니다.
- **이슈가 바뀌면 다시 배포합니다.** 카탈로그 화면이 세션별 공유 제안·점유 상태를 보여 주므로, 이슈 목록(`issues.json`)은 배포 때만 만들고 커밋하지 않습니다.
- **`GITHUB_TOKEN` 으로 만든 push · assignee 변경은 다른 워크플로를 깨우지 않습니다.** 그래서 갱신·점유 워크플로가 끝에서 배포와 보드 동기화를 직접 실행합니다.
- **프로젝트 보드는 손으로 옮기지 않습니다.** 상태는 이슈·PR 상태에서 계산되고, `pull_request_target` 으로 기본 브랜치 코드만 실행해 fork PR 에서도 안전합니다.

## 로컬에서 보기

```bash
pip install -r requirements.txt
python tools/build_pages.py      # 생성물 갱신
mkdocs serve                      # http://127.0.0.1:8000/microsoft-ignite-2026/
```

커밋 전 검사는 CI 와 같습니다.

```bash
python tools/validate.py && python tools/build_pages.py --check \
  && python -m pytest -q && node --test "tests/*.test.mjs" && mkdocs build --strict
```

## 소스

| 구성 요소 | 파일 |
|---|---|
| 사이트 설정 · nav | [`mkdocs.yml`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/mkdocs.yml) |
| 테마 CSS | [`docs/stylesheets/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/docs/stylesheets) |
| 카탈로그 탐색기 · 노트 보강 | [`docs/javascripts/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/docs/javascripts) |
| 수집 · 생성 · 검증 도구 | [`tools/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/tools) |
| 워크플로 | [`.github/workflows/`](https://github.com/caldova-kr/microsoft-ignite-2026/tree/main/.github/workflows) |
