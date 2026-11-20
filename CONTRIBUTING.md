# Contributing — Ignite 2026 Session Notes

이 저장소는 Microsoft Ignite 2026 세션을 **세션 원문 근거로** 정리합니다. 기여는 세 단계입니다.

```text
① 공유할 만한 세션 → 이슈 등록       (누구나, 정리할 생각이 없어도 OK)
② 내가 정리할 세션 → assignee = 나   (점유: 한 세션은 한 사람만)
③ 정리 → PR "Closes #이슈"           (리뷰 후 머지 = 사이트 게시)
```

## ① 공유할 만한 세션 → 이슈 등록

세션을 보다가 공유할 가치가 있으면 **이슈로 남깁니다.** 직접 정리하지 않아도 됩니다.

1. 이미 있는지 확인 — [Issues `label:session`](https://github.com/caldova-kr/microsoft-ignite-2026/issues?q=is%3Aissue+label%3Asession) 또는 [사이트 카탈로그](https://caldova-kr.github.io/microsoft-ignite-2026/catalog/)의 상태 열(📌 공유 제안 · 🙋 점유).
   - 이미 있으면 새로 만들지 말고 그 이슈에 **댓글로** 공유 포인트를 보탭니다.
2. 없으면 등록 — 사이트 카탈로그에서 세션 행을 펼쳐 **＋ 이슈로 공유 제안**을 누르거나, [New issue → 세션 공유 제안](https://github.com/caldova-kr/microsoft-ignite-2026/issues/new?template=session.yml).
   - **제목**: `[세션코드] 카탈로그 제목` 그대로 — 예: `[KEY01] Microsoft Ignite opening keynote`
   - **한 세션 = 한 이슈.** 라벨 `session` 은 템플릿이 자동으로 붙입니다.
   - **공유 포인트**: 세션에서 실제로 나온 내용을, 가능하면 위치(`영상 18:40`, `슬라이드 #12`, 발화자)와 함께.

```bash
gh issue create --label session --title "[BRK220] <카탈로그 제목>" --body "- 18:40 — ..."
```

## ② 내가 정리할 세션 → assignee 로 점유

정리를 시작하기 전에 **반드시 이슈의 assignee 를 나로 지정**합니다. assignee 가 곧 "이 세션은 누가 정리 중"이라는 표시이고, 사이트 카탈로그에 🙋 `@아이디` 로 보입니다.

| 방법 | 하는 법 |
|---|---|
| GitHub UI | 이슈 오른쪽 **Assignees → assign yourself** |
| CLI | `gh issue edit <번호> --add-assignee @me` |
| 댓글 | `/claim` — 권한이 없는 외부 기여자도 가능 (워크플로가 지정). 해제는 `/unclaim` |

규칙:

- **assignee 가 이미 있으면 점유된 세션입니다.** 가로채지 말고 이슈 댓글로 조율합니다.
- 한 이슈의 assignee 는 **한 명**. 같이 쓰면 대표 한 명이 점유하고 나머지는 PR 리뷰·커밋으로 참여합니다.
- 점유하면 가능한 빨리 **Draft PR** 을 열어 진행을 보입니다.
- 진행을 멈추면 assignee 를 해제합니다(`/unclaim`). **7일간 진척(커밋·댓글)이 없으면** 메인테이너가 댓글로 확인한 뒤 해제할 수 있습니다.
- 등록과 동시에 정리할 생각이면, 등록 직후 본인을 assignee 로 지정하면 됩니다.

## ③ 정리 → PR

```bash
git switch -c note/BRK220
pip install -r requirements.txt
python tools/fetch_sources.py BRK220   # 원문 자료 → .cache/sources/BRK220/ (커밋되지 않음)
python tools/new_session.py BRK220     # 카탈로그 값이 채워진 docs/sessions/BRK220-<slug>.md
python tools/capture_frame.py BRK220 18:40 <name>   # 핵심 장면 캡처 (아래 "이미지 우선")
#   … 노트 작성 …
python tools/build_pages.py            # 인덱스·카탈로그·메뉴 갱신 (생성물도 커밋)
python tools/validate.py && mkdocs build --strict
gh pr create --draft --title "[BRK220] <제목>" --body "Closes #<이슈번호>"
```

- PR 본문에 **`Closes #<이슈번호>`** — 머지되면 이슈가 닫히고 노트가 사이트에 게시됩니다.
- 처음엔 `status: draft`. 원문 근거로 다 쓰면 `review` 로 바꾸고 Ready for review. 리뷰 반영 후 `done`.
- 영상·트랜스크립트·슬라이드가 아직 없으면 노트를 시작하지 말고 이슈에 그 사실을 남겨 둡니다.

## 이미지 우선 — 영상 캡처 + 공식 블로그 이미지

**기여자는 모두 Microsoft 직원**이라 Microsoft 가 공개한 세션 영상의 캡처와 공식 발표 블로그 이미지를 출처와 함께 노트에 넣을 수 있습니다. 노트는 글보다 이미지로 보여 주세요.

```bash
python tools/capture_frame.py BRK220 18:40 agent-architecture             # 영상 18:40 프레임 → 노트 폴더
python tools/capture_frame.py BRK220 18:40 agent-architecture --crop 1200:675:200:100   # ID 가 보이면 잘라내기
python tools/fetch_image.py BRK220 --page <공식 블로그 포스트 URL> --image <이미지 URL> --name foundry-overview
```

두 도구 모두 아래 형식의 스니펫을 출력합니다. 캡션의 출처 표기는 필수이고 CI 가 검사합니다.

```markdown
<figure markdown="span">
  ![무엇을 보여 주는지](BRK220-slug/agent-architecture.jpg)
  <figcaption>▶ 영상 18:40 — 한 줄 설명</figcaption>
</figure>
```

- 섹션마다 **이미지 1장 + bullet 2~4개**. 긴 문단은 쓰지 않습니다.
- 공식 블로그는 Ignite 2026 발표 포스트(Book of News, Azure/Tech Community/Microsoft 블로그, GitHub Blog 등)만. 블로그에서만 나온 *글* 정보는 `세션 외 보충` 블록에 둡니다.
- 캡처 전에 테넌트·구독 ID, 이메일, 토큰이 보이는지 확인하고 `--crop` 으로 잘라냅니다. 공개되지 않은 사내 자료는 넣지 않습니다.
- 영상 프레임 캡처에는 `ffmpeg` 가 필요합니다 (`brew install ffmpeg`).

## 작성 원칙 — 반드시 지킬 것

전체 규약은 [`.github/copilot-instructions.md`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/.github/copilot-instructions.md) 가 단일 기준입니다. 요점:

| 등급 | 출처 | 사용 범위 |
|---|---|---|
| **T1** 세션 원문 | 그 세션의 영상 · 트랜스크립트 · 슬라이드 | 본문 전체 |
| **T2** 카탈로그 | 제목 · 타입 · 토픽 · 태그 · 발표자 · 초록 · 공식 리소스 링크 | 메타데이터 · Resources |
| **T3** Ignite 2026 공식 발표 | Book of News 2026, 공식 블로그 | `세션 외 보충` 블록 안 |
| **T4** 공식 문서 | Microsoft Learn 등 | `세션 외 보충` 블록 안, 확인 일자 포함 |

- **초록은 "다룰 예정", 말한 내용이 아닙니다.** 카탈로그의 AI 요약은 탐색용입니다.
- **근거가 아닌 것**: 다른 이벤트(Build 2026, 이전 Ignite), 모델의 사전 지식, 추측, 제3자 블로그.
- GA · Preview 상태와 날짜는 **세션이나 공식 발표가 명시한 경우에만.** 아니면 `Caveats & open questions` 에 질문으로.
- 카탈로그 유래 frontmatter(제목·타입·토픽·태그·발표자 등)는 수정하지 않습니다 — CI 가 카탈로그와 비교합니다.
- `review`/`done` 노트는 `source_basis` 에 `video`/`transcript`/`slides` 중 하나 이상이 있어야 합니다 — CI 강제.
- 트랜스크립트·슬라이드·영상 **원본 파일**은 커밋하지 않습니다 (영상 프레임 캡처와 공식 블로그 이미지는 커밋).

## 진행 상태 한눈에

| 표시 | 의미 | 결정 위치 |
|:-:|---|---|
| · | 미검토 | — |
| 📌 | 공유 제안 (담당자 없음) | 이슈 open, assignee 없음 |
| 🙋 | 점유 — 정리 중 | 이슈 assignee |
| ✍️ / 🔍 / ✅ | 작성 중 / 검토 중 / 완료 | 노트 `status: draft / review / done` |
| ⏸️ / ➖ | 보류 / 제외 | `catalog/triage.yml` (`hold` / `skip`) |

사이트 카탈로그의 이슈·점유 상태는 이슈가 바뀔 때마다 사이트가 다시 배포되며 반영됩니다(1~2분).

### 프로젝트 보드 — 자동 추적

모든 이슈는 [프로젝트 보드](https://github.com/orgs/caldova-kr/projects/1)에 올라가고, **Status 는 이슈·PR 상태에서 자동으로 정해집니다.** 카드를 손으로 옮기지 마세요 — 다음 동기화 때 되돌아갑니다.

| Status | 이렇게 하면 이동 |
|---|---|
| **Todo** | 이슈 등록 (assignee 없음, 연결된 PR 없음) |
| **In Progress** | assignee 지정(`/claim` 포함) 또는 `Closes #N` 을 단 **Draft PR** |
| **In Review** | 그 PR 을 **Ready for review** 로 전환 (또는 처음부터 일반 PR) |
| **Done** | PR 머지로 이슈가 닫힘 (이슈를 직접 닫아도 Done) |

- PR 과 이슈의 연결은 **PR 본문의 `Closes #N`** (또는 이슈의 Development 사이드바)로만 인식합니다. 제목의 `#N` 은 연결이 아닙니다.
- **릴리스 범위 = Milestone.** 새 이슈는 마감일이 가장 가까운 열린 마일스톤(현재 [`1.0`](https://github.com/caldova-kr/microsoft-ignite-2026/milestone/1))에 자동으로 들어갑니다. 범위 밖이면 마일스톤을 바꾸거나 비웁니다.
- 동작: [`.github/workflows/project-board.yml`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/.github/workflows/project-board.yml) 이 이슈·PR 이벤트마다, 그리고 매시간 전체를 재조정합니다. 지금 바로 맞추려면 Actions → Project board → Run workflow.

<details markdown>
<summary>메인테이너 — 설정·다른 저장소 재사용</summary>

- 워크플로는 시크릿 **`PROJECT_TOKEN`** 이 필요합니다(기본 `GITHUB_TOKEN` 은 Projects 에 쓸 수 없음). Fine-grained PAT: Resource owner `caldova-kr`, 이 저장소 · Repository 권한 Issues **Read and write**, Pull requests **Read** · Organization 권한 Projects **Read and write**. 또는 같은 권한의 GitHub App 토큰.
- 로컬 재조정: `GH_TOKEN=$(gh auth token) python tools/project_board.py sync --all`
- 다른 저장소: `tools/project_board.py` 와 `.github/workflows/project-board.yml` 을 복사 → `GH_TOKEN=$(gh auth token) python tools/project_board.py setup --repo OWNER/REPO --title "<보드 이름>" [--public]` → 생성된 `.github/project-board.json` 커밋 → `PROJECT_TOKEN` 시크릿 등록 → `sync --all`. 새 이슈 자동 마일스톤이 필요 없으면 `setup --no-auto-milestone`.

</details>
