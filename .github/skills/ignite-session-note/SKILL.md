---
name: ignite-session-note
description: "Ignite 2026 세션 하나를 원문 근거로 정리한다"
argument-hint: "세션 코드 (예: BRK220)"
disable-model-invocation: true
---
Ignite 2026 세션 하나의 노트를 작성한다. `.github/copilot-instructions.md` 를 먼저 읽고 그대로 따른다.

세션 코드(예: `BRK220`)는 스킬을 부른 요청에서 확인한다. 요청에 없으면 먼저 묻는다. 아래 `<CODE>` 는 모두 그 코드로 바꿔 쓴다.

0. `gh issue list --label session --search "[<CODE>]"` 로 이슈를 확인한다. 없으면 `[<CODE>] <카탈로그 제목>` 으로 만들고, assignee 가 비어 있으면 `gh issue edit <N> --add-assignee @me` 로 점유한다. **다른 사람이 assignee 면 멈추고 보고한다.**
1. `python tools/fetch_sources.py <CODE>` 를 실행하고 `.cache/sources/<CODE>/` 의 `catalog.md`, `transcript.txt`(있으면), `slides.md`(덱의 슬라이드별 텍스트, 있으면)를 읽는다. 카탈로그에 링크가 아직 없으면 `--refresh` 를 붙인다.
2. 트랜스크립트·슬라이드·영상이 모두 없으면 노트를 만들지 말고 `catalog/triage.yml` 에 `hold` 로 기록한 뒤 이유를 보고하고 멈춘다.
3. 노트가 없으면 `python tools/new_session.py <CODE>` 로 만든다. 카탈로그 유래 frontmatter 는 수정하지 않는다.
4. **정리 의도를 먼저 묻는다** (instructions 3장 "작성 전 의도 확인"). 트랜스크립트에서 뽑은 주요 발표·데모·사례 후보를 선택지로 보여 주고 관점·독자, 중점 항목, 제외 범위, 형식·깊이, 추가 자료(캡처·블로그 링크)를 한 번에 묻는다. 답이 없으면 이슈의 "공유 포인트" 를 의도로 쓰고 가정을 PR 본문에 적는다. 정한 의도는 노트 맨 위 주석에 남긴다.
5. 의도에 맞는 핵심 장면만 이미지로 넣는다. 덱이 있으면 `python tools/capture_slide.py <CODE> <슬라이드 번호> <name>` (영상이 삽입된 슬라이드는 `--at <초>`), 덱이 없거나 데모 화면이면 `python tools/capture_frame.py <CODE> MM:SS <name>` 로 캡처한다. 생성된 이미지를 열어 내용과 ID·이메일 노출을 확인하고, 필요하면 `--crop` 으로 다시 캡처한다. 발표 항목은 Ignite 2026 공식 블로그 포스트의 이미지를 `tools/fetch_image.py` 로 받거나 링크로 건다.
6. 세션 타입별 권장 조합(Keynote 는 "Keynote · 발표 중심 노트의 구성")으로 참관 후기 문체로 쓴다 — 세션을 옮겨 적지 않고 필요한 정보만 추린다(instructions 7장 "세션 중계가 아니라 정리"). 이미지는 핵심 장면만, 이미지를 글로 설명하지 않고, bullet 마다 근거 표기를 달지 않는다(근거는 `Key announcements` 표). 모든 주장은 원문으로 확인하고, 세션 밖 정보는 `!!! supplement "세션 외 보충 · <출처>"` 블록에만 둔다. `aiDescription`·초록·사전 지식·다른 이벤트 내용으로 채우지 않는다.
7. 초안을 기여자에게 보여 주고 피드백(구성·문체·강조점)을 반영한다.
8. `source_basis` 에 실제로 확인한 근거만 적는다. 사람 검토 전이므로 `status: review` 로 둔다.
9. `python tools/build_pages.py`, `python tools/validate.py`, `mkdocs build --strict` 를 통과시킨다.
10. 브랜치 `note/<CODE>` 에서 커밋하고 `Closes #<N>` 과 정리 의도를 넣은 Draft PR 을 연다.
11. 근거가 불충분해 단정하지 못한 항목을 목록으로 보고한다.
