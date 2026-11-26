---
title: 사이트 기술
description: Ignite 2026 Session Notes 를 만드는 기술 — GitHub Pages · MkDocs · Material for MkDocs · vanilla JS, 그리고 GitHub Actions CI/CD.
---

# 사이트 기술

이 사이트는 **서버 없는 정적 사이트**입니다. 노트는 Markdown 으로 쓰고, MkDocs 가 HTML 로 만들어 GitHub Pages 에 올립니다. 빌드부터 배포까지 GitHub 안에서 끝납니다.
사이트 안 Agent 는 [Agent 구조](agent.md) 에서 따로 다룹니다.

## 한눈에

<figure class="ar-figure" markdown="0">
--8<-- "docs/site/stack.svg"
<figcaption>기술 스택</figcaption>
</figure>

## 호스팅 · 배포

| 기술 | 무엇인가 | 이 사이트에서 |
|---|---|---|
| [GitHub Pages](https://docs.github.com/en/pages) | 저장소에서 정적 사이트를 호스팅하는 GitHub 기능 | `_site/` 를 그대로 서비스, 서버·DB 없음 |
| [GitHub Actions](https://docs.github.com/en/actions) | 저장소 이벤트·일정에 맞춰 워크플로를 실행하는 CI/CD | 검증 · 빌드 · 배포, 카탈로그 갱신, 점유 · 보드 동기화 |
| [Pages 사용자 지정 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) | `gh-pages` 브랜치 없이 Actions 산출물을 바로 배포하는 방식 | `upload-pages-artifact` → `deploy-pages` |

## 빌드 · 콘텐츠

| 기술 | 무엇인가 | 이 사이트에서 |
|---|---|---|
| [MkDocs](https://www.mkdocs.org/) | Markdown 문서를 정적 HTML 사이트로 만드는 Python 생성기 | 모든 페이지 빌드, `mkdocs.yml` 하나로 설정 |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) | MkDocs 용 테마 · 기능 모음 | 사이트 테마 전체, 라이트/다크 |
| [Material 내비게이션](https://squidfunk.github.io/mkdocs-material/setup/setting-up-navigation/) | 탭 · 섹션 인덱스 · instant loading(새로 고침 없는 페이지 이동) | 상단 탭, 이동 중에도 Agent 대화 유지 |
| [Material 검색](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/) | 빌드 때 만든 인덱스로 브라우저에서 검색 | 한국어 · 영어 검색 |
| [Admonitions](https://squidfunk.github.io/mkdocs-material/reference/admonitions/) | 본문 안의 강조 블록 | GA · Preview 상태 콜아웃, 세션 외 보충 블록 |
| [Python-Markdown 확장](https://python-markdown.github.io/extensions/) | 표 · 각주 · 목차 · HTML 안 Markdown 등 기본 확장 | `tables` · `footnotes` · `toc` · `md_in_html` |
| [PyMdown Extensions](https://facelessuser.github.io/pymdown-extensions/) | 코드 강조 · 탭 · 접기 등 추가 확장 | `superfences` · `tabbed` · `details` · `tasklist` |
| [Snippets](https://facelessuser.github.io/pymdown-extensions/extensions/snippets/) | 다른 파일을 빌드 때 끼워 넣는 확장 | 기여 가이드, SVG 다이어그램 |

## UI

| 기술 | 무엇인가 | 이 사이트에서 |
|---|---|---|
| [Material 사용자 지정](https://squidfunk.github.io/mkdocs-material/customization/) | 테마는 그대로 두고 `extra_css` · `extra_javascript` 로 덧붙이는 방식 | `extra.css` · `chat.css`, JS 5개 |
| CSS 변수 토큰 | 색·간격을 변수로 두고 라이트/다크에서 값만 바꾸는 방식 | `--dg-*` · `--ig-*`, SVG 다이어그램도 같은 변수 |
| [Noto Sans KR](https://fonts.google.com/noto/specimen/Noto+Sans+KR) | 한글 본문 글꼴 | 본문 · 제목 |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | 코드용 고정폭 글꼴 | 코드 · 세션 코드 · 파일명 |
| Vanilla JavaScript | 프레임워크·번들러 없이 브라우저 기본 API 만 사용 | 카탈로그 탐색기, 노트 보강, Agent |

## 데이터 · 도구

| 기술 | 무엇인가 | 이 사이트에서 |
|---|---|---|
| Python 3.12 | 수집·생성·검증 스크립트 언어 | `tools/*.py` |
| [PyYAML](https://pyyaml.org/) | YAML 파서 | 노트 frontmatter · `catalog/triage.yml` 읽기 |
| [pytest](https://docs.pytest.org/) | Python 테스트 프레임워크 | 도구 테스트 |
| [Node.js test runner](https://nodejs.org/api/test.html) | Node 에 내장된 테스트 실행기 | Agent · relay 테스트 (설치할 패키지 없음) |

## CI/CD

<figure class="ar-figure" markdown="0">
--8<-- "docs/site/cicd.svg"
<figcaption>GitHub Actions 워크플로</figcaption>
</figure>

| 워크플로 | 언제 | 왜 |
|---|---|---|
| `deploy-site` | main push · PR · 이슈 변경 | PR 도 배포와 같은 검사를 거쳐, 카탈로그와 다른 메타데이터 · 근거 없는 `review`/`done` · 깨진 링크를 머지 전에 거릅니다. 카탈로그 화면이 이슈의 공유 제안 · 점유 상태를 보여 주므로 이슈가 바뀌어도 다시 배포합니다. |
| `refresh-catalog` | 매일 ([`schedule`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)) | 행사 뒤에도 on-demand 영상 · 트랜스크립트 · 슬라이드가 계속 추가됩니다. |
| `claim` | 이슈 댓글 `/claim` · `/unclaim` ([`issue_comment`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issue_comment)) | 저장소 권한이 없는 기여자도 세션을 점유할 수 있게 합니다. |
| `project-board` | 이슈 · PR 변경, 매시 | [Project 보드](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) 상태를 이슈 · PR 상태에서 계산하므로 손으로 옮기지 않습니다. |

- [`GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token) 으로 만든 push · assignee 변경은 다른 워크플로를 깨우지 않습니다. 그래서 `refresh-catalog` 와 `claim` 이 끝에서 배포 · 보드 동기화를 직접 실행합니다.
- `project-board` 는 [`pull_request_target`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target) 으로 기본 브랜치 코드만 실행해, fork PR 에서도 비밀 값이 PR 코드에 닿지 않습니다.
- 배포 때만 만드는 파일(`issues.json`, Agent 의 `agent.json`)은 커밋하지 않습니다.

## 원칙

- **hooks · 서드파티 플러그인 · 테마 override 를 쓰지 않습니다.** 나중에 [Zensical](https://zensical.org/)(Material for MkDocs 팀의 차세대 생성기)로 옮길 수 있게 하기 위해서입니다.
- **생성물은 손으로 고치지 않습니다.** 카탈로그 표 · 인덱스 · nav · `llms.txt` 는 `tools/build_pages.py` 가 만들고, CI 가 `--check` 로 어긋남을 막습니다.
- **빌드 단계를 늘리지 않습니다.** 번들러 · npm 빌드가 없어 배포물은 MkDocs 결과 그대로입니다.
- **디자인은 색과 글꼴만 가져옵니다.** Ignite 2026 Breakout Design Guide 의 Magenta-Blue-Green 테마를 따르고, 브랜드 아트는 쓰지 않습니다.

## 로컬 개발

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
