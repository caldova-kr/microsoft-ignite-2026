# Agent instructions

이 저장소의 규약은 [`.github/copilot-instructions.md`](.github/copilot-instructions.md) 하나가 기준입니다. 작업 전에 반드시 읽으세요.

요약:

- Microsoft Ignite 2026 **세션 원문(영상·트랜스크립트·슬라이드)** 으로 추적 가능한 내용만 쓴다. 초록·카탈로그 AI 요약·사전 지식·다른 이벤트(Build 2026 등)는 근거가 아니다.
- 기여 흐름은 `CONTRIBUTING.md`: 공유할 세션 → 이슈(`[CODE] 제목`, label `session`), 정리 → assignee 를 자신으로 지정해 점유한 뒤에만, PR 은 `Closes #N`. 다른 사람이 점유한 세션은 작업하지 않는다.
- 이미지 우선: 핵심 장면은 `tools/capture_frame.py` 영상 캡처, 발표는 Ignite 2026 공식 블로그 이미지(`tools/fetch_image.py`). 모든 이미지는 `<figure>` + 출처 `<figcaption>`. 기여자가 Microsoft 직원이라 허용되는 규칙.
- 세션 메타데이터는 `catalog/sessions.json` 이 정답이며, 노트는 `python tools/new_session.py <CODE>` 로 만든다.
- 생성물(`catalog/SESSIONS.md`, `docs/catalog/sessions.json`, `docs/sessions/index.md`, `gen:` 블록)은 직접 고치지 않고 `python tools/build_pages.py` 로 갱신한다.
- 끝나면 `python tools/validate.py && python tools/build_pages.py --check && mkdocs build --strict`.
