# Agent instructions

이 저장소의 규약은 [`.github/copilot-instructions.md`](.github/copilot-instructions.md) 하나가 기준입니다. 작업 전에 반드시 읽으세요.

요약:

- Microsoft Ignite 2026 **세션 원문(영상·트랜스크립트·슬라이드)** 으로 추적 가능한 내용만 쓴다. 초록·카탈로그 AI 요약·사전 지식·다른 이벤트(Build 2026 등)는 근거가 아니다.
- 기여 흐름은 `CONTRIBUTING.md`: 공유할 세션 → 이슈(`[CODE] 제목`, label `session`), 정리 → assignee 를 자신으로 지정해 점유한 뒤에만, PR 은 `Closes #N`. 다른 사람이 점유한 세션은 작업하지 않는다.
- **본문을 쓰기 전에 기여자에게 정리 의도를 먼저 묻는다** — 관점·독자, 중점 발표·사례, 제외 범위, 형식·깊이, 추가 자료. 답이 없으면 이슈의 "공유 포인트" 를 쓰고 가정한 의도를 PR 에 밝힌다. 정한 의도는 노트 맨 위 주석과 PR 본문에 남긴다 (instructions 3장 "작성 전 의도 확인").
- 이미지: 핵심 장면만. 공식 슬라이드가 공개돼 있으면 `tools/capture_slide.py`(슬라이드 내보내기)를 먼저 쓰고, 없으면 `tools/capture_frame.py` 영상 캡처나 Ignite 2026 공식 블로그 이미지(`tools/fetch_image.py`)로. 모든 이미지는 `<figure>` + 짧은 출처 `<figcaption>`. 이미지를 글로 설명하지 않고, 더 알고 싶은 사람에게는 공식 소개 블로그 링크를 건다. 기여자가 Microsoft 직원이라 허용되는 규칙.
- 문체: 주변에 공유하는 **참관 후기**(합니다체). 발표 내용 + "그래서 무엇이 달라지나" 를 함께 쓰고, bullet 마다 `(transcript: …)`·`(영상 MM:SS)` 를 달지 않는다 — 근거는 `Key announcements` 표의 `근거` 열에.
- **노트는 세션 중계가 아니라 정리다** — 옮겨 적지 않고 필요한 정보만 추린다. 현재 제공 상태는 Microsoft Learn · 공식 블로그 같은 세션 밖 출처로 확인해, `supplement` 블록 안에 확인 일자와 함께 가볍게 덧붙인다(세션 원문 규칙의 예외는 이 블록뿐). 세부 규칙은 instructions 7장 "세션 중계가 아니라 정리".
- Keynote 등 발표 중심 노트: `TL;DR` 에 이벤트 핵심 의제 + 키노트 영상·Book of News 링크 → `Top highlights` 는 제품 소개만(의미 포함, `Why it matters` 생략 가능) → `Customer scenarios` 에 고객·현장 사례 분리(근거는 키노트 영상 + Microsoft 공식 블로그, 화면에 나온 SNS 원문은 링크하지 않음) → 제품마다 GA / Preview 콜아웃, `Key announcements` 는 GA · Preview 표만(한 제품은 한 행, 상태 미언급 표·Caveats 생략) → 제품별 공식 소개 글 링크. 자세한 내용은 instructions 6장 "Keynote · 발표 중심 노트의 구성".
- 세션 메타데이터는 `catalog/sessions.json` 이 정답이며, 노트는 `python tools/new_session.py <CODE>` 로 만든다.
- 생성물(`catalog/SESSIONS.md`, `docs/catalog/sessions.json`, `docs/sessions/index.md`, `docs/sessions/notes.json`, `docs/llms.txt`, `docs/llms-full.txt`, `gen:` 블록)은 직접 고치지 않고 `python tools/build_pages.py` 로 갱신한다.
- 끝나면 `python tools/validate.py && python tools/build_pages.py --check && mkdocs build --strict`.
