---
mode: agent
description: Ignite 2026 세션 하나를 원문 근거로 정리한다
---

Ignite 2026 세션 `${input:code:세션 코드 (예: BRK220)}` 의 노트를 작성한다. `.github/copilot-instructions.md` 를 먼저 읽고 그대로 따른다.

0. `gh issue list --label session --search "[${input:code}]"` 로 이슈를 확인한다. 없으면 `[${input:code}] <카탈로그 제목>` 으로 만들고, assignee 가 비어 있으면 `gh issue edit <N> --add-assignee @me` 로 점유한다. **다른 사람이 assignee 면 멈추고 보고한다.**
1. `python tools/fetch_sources.py ${input:code}` 를 실행하고 `.cache/sources/${input:code}/` 의 `catalog.md`, `transcript.txt`(있으면)를 읽는다. `slides.pptx` 가 있으면 텍스트를 추출해 참고한다.
2. 트랜스크립트·슬라이드·영상이 모두 없으면 노트를 만들지 말고 `catalog/triage.yml` 에 `hold` 로 기록한 뒤 이유를 보고하고 멈춘다.
3. 노트가 없으면 `python tools/new_session.py ${input:code}` 로 만든다. 카탈로그 유래 frontmatter 는 수정하지 않는다.
4. 세션 타입별 권장 섹션 조합으로 본문을 채운다. 모든 주장에 근거 위치(발화자 인용·슬라이드 번호·영상 시각)를 확인하고, 세션 밖 정보는 `!!! supplement "세션 외 보충 · <출처>"` 블록에만 둔다. `aiDescription`·초록·사전 지식·다른 이벤트 내용으로 채우지 않는다.
5. `source_basis` 에 실제로 확인한 근거만 적는다. 사람 검토 전이므로 `status: review` 로 둔다.
6. `python tools/build_pages.py`, `python tools/validate.py`, `mkdocs build --strict` 를 통과시킨다.
7. 브랜치 `note/${input:code}` 에서 커밋하고 `Closes #<N>` 을 넣은 Draft PR 을 연다.
8. 근거가 불충분해 단정하지 못한 항목을 목록으로 보고한다.
