# Agent instructions

이 저장소의 규약은 [`.github/copilot-instructions.md`](.github/copilot-instructions.md) 하나가 기준입니다. 작업 전에 반드시 읽으세요.

요약:

- Microsoft Ignite 2026 **세션 원문(영상·트랜스크립트·슬라이드)** 으로 추적 가능한 내용만 쓴다. 초록·카탈로그 AI 요약·사전 지식·다른 이벤트(Build 2026 등)는 근거가 아니다.
- 세션 메타데이터는 `catalog/sessions.json` 이 정답이며, 노트는 `python tools/new_session.py <CODE>` 로 만든다.
- 생성물(`catalog/SESSIONS.md`, `docs/catalog/sessions.json`, `docs/sessions/index.md`, `gen:` 블록)은 직접 고치지 않고 `python tools/build_pages.py` 로 갱신한다.
- 끝나면 `python tools/validate.py && python tools/build_pages.py --check && mkdocs build --strict`.
