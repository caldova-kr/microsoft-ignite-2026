# Microsoft Ignite 2026 — Session Notes

Microsoft Ignite 2026(2026-11-17 ~ 20, San Francisco) 세션을 **세션 원문 근거로** 고객·아키텍트 관점에서 정리하는 비공식 노트입니다.

📖 **사이트**: <https://caldova-kr.github.io/microsoft-ignite-2026/>
🗂️ **전체 세션 목록**: [`catalog/SESSIONS.md`](catalog/SESSIONS.md) · 필터 가능한 [사이트 카탈로그](https://caldova-kr.github.io/microsoft-ignite-2026/catalog/)

## 무엇이 들어 있나

| 위치 | 내용 |
|---|---|
| [`catalog/`](catalog/) | 공식 세션 카탈로그 스냅샷 — 1,366개 세션(온라인으로 볼 수 있는 873개가 정리 대상)의 타입·토픽·태그·레벨·발표자·세션 페이지·영상/슬라이드/트랜스크립트 링크 |
| [`docs/sessions/`](docs/sessions/) | 세션 노트 (세션 1개 = 파일 1개) |
| [`docs/themes/`](docs/themes/) | 여러 노트를 묶는 주제 페이지 |
| [`tools/`](tools/) | 카탈로그 수집 · 원문 자료 수집 · 노트 스캐폴드 · 페이지 생성 · 검증 |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | 작성 규약 (근거 등급 · 금지 출처 · 구조) — 사람과 에이전트 공통 기준 |
| [`design/`](design/) | 데이터 소스·디자인 조사와 설계 결정 |

## 기여 — 이슈로 제안, assignee 로 점유

1. **공유할 만한 세션 → [이슈 등록](https://github.com/caldova-kr/microsoft-ignite-2026/issues/new?template=session.yml)** (`[CODE] 제목`, 한 세션 = 한 이슈)
2. **내가 정리할 세션 → assignee 를 나로** (UI · `gh issue edit N --add-assignee @me` · 댓글 `/claim`)
3. **PR `Closes #N`** → 머지되면 사이트에 게시

진행은 [프로젝트 보드](https://github.com/orgs/caldova-kr/projects/1)에서 자동으로 추적됩니다 — assignee 지정 → In Progress, PR 리뷰 요청 → In Review, 머지 → Done. 릴리스 범위는 Milestone([`1.0`](https://github.com/caldova-kr/microsoft-ignite-2026/milestone/1)).

자세한 규칙: [CONTRIBUTING.md](CONTRIBUTING.md)

## 원칙

1. **세션에서 나온 내용만.** 본문 주장은 그 세션의 영상·트랜스크립트·슬라이드로 추적 가능해야 합니다.
2. **메타데이터는 카탈로그가 정답.** 제목·타입·토픽·태그·발표자는 `catalog/sessions.json` 값과 일치해야 하며 CI가 검사합니다.
3. **세션 밖 정보는 분리.** Book of News·Learn 문서는 `세션 외 보충` 블록 안에서 출처와 함께만.
4. **다른 이벤트와 섞지 않기.** [Build 2026 노트](https://github.com/caldova-kr/microsoft-build-2026)와 구조는 같지만 내용은 독립적입니다.

## Quick start

```bash
pip install -r requirements.txt
python tools/fetch_catalog.py            # 카탈로그 재수집 (선택 — 매일 자동 갱신됨)
python tools/fetch_sources.py KEY01      # 원문 자료 → .cache/sources/KEY01/
gh issue edit <N> --add-assignee @me     # 이슈 점유 후에만 작성
python tools/new_session.py KEY01        # docs/sessions/KEY01-<slug>.md 생성
python tools/build_pages.py              # 생성물 갱신
python tools/validate.py && mkdocs serve # 검증 후 미리보기 http://127.0.0.1:8000
```

`main` 에 푸시하면 `.github/workflows/deploy-site.yml` 이 검증 후 GitHub Pages 로 배포합니다.

## 사이트 챗봇

모든 페이지 우하단 **💬 노트에 물어보기** 는 이 사이트의 노트·카탈로그만 근거로 답하는 챗봇입니다. 서버 없이 브라우저에서 돌고, 모델은 방문자 본인의 GitHub Copilot 을 씁니다. 홈에서는 오른쪽 위 스위치로 **📰 소개 화면**(기존 랜딩)과 **💬 대화 화면**(ChatGPT 형 전체 화면 대화)을 고를 수 있습니다(`?view=chat` 링크 가능).

- 연결: 패널의 링크로 **Copilot requests 권한 하나만** 가진 fine-grained 토큰을 만들어 붙여 넣습니다. 토큰은 브라우저에서 `api.github.com` · `api.githubcopilot.com` 으로만 가고, 사용량은 본인 premium requests 에서 차감됩니다.
- 지식: MkDocs 가 만드는 `search/search_index.json` 과 `catalog/sessions.json` 만 도구(`search_notes` · `get_note` · `search_catalog` · `get_session`)로 읽습니다. 노트를 쓰면 다음 배포부터 자동 반영됩니다.
- 화면: CopilotKit 의 생성형 UI 개념을 따라 도구 실행은 카드로, 세션 추천은 세션 카드(`show_sessions`), 근거는 출처 카드(`show_sources`), 모호한 질문은 선택 버튼(`ask_user_choice`)으로 보여 줍니다. 카드 내용은 모델 텍스트가 아니라 사이트 데이터로 채웁니다.
- 코드: [`docs/javascripts/chat-agent.js`](docs/javascripts/chat-agent.js)(로직) · [`chat.js`](docs/javascripts/chat.js)(패널) · 테스트 `node --test "tests/*.test.mjs"` · 설계 [`design/2026-11-25-site-chat-agent-design.md`](design/2026-11-25-site-chat-agent-design.md)

## 사이트 완성 로드맵

| 단계 | 목표 | 완료 기준 |
|---|---|---|
| 0. 초안 | 카탈로그 스냅샷 · 탐색기 · 규약 · 검증 · 배포 | ✅ 이 커밋 |
| 1. 세션 제안 | 공유할 세션을 이슈로 등록하고 담당자 점유 | 토픽마다 이슈 확보, 자료 없는 세션은 `triage.yml` `hold` |
| 2. 키노트 | `KEY01`, `KEY02` 노트 | 트랜스크립트 근거로 `done` |
| 3. 토픽별 노트 | Agent Platform · Cloud & AI · Security · Data · Copilot · Microsoft IQ 등 | 토픽마다 대표 세션 노트 `done` |
| 4. 테마 · 리캡 | 노트를 가로지르는 `docs/themes/` 페이지 | 작성된 노트만 근거로 테마 페이지 `done` |
| 5. 빌드 도구 이전 | Material for MkDocs EOL(2027-05-05) 전 Zensical 검토 | hooks·서드파티 플러그인 미사용 상태 유지 → `mkdocs.yml` 그대로 빌드 확인 |

## License

- 원본 정리물(요약·분석·표·다이어그램): [CC BY 4.0](LICENSE)
- Microsoft 콘텐츠 인용 범위·상표: [NOTICE.md](NOTICE.md)

본 저장소는 Microsoft 공식이 아닌 비공식 커뮤니티 노트입니다.
