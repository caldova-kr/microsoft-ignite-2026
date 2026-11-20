# 설계 메모 — Ignite 2026 Session Notes (2026-11-20)

## 목표

- Microsoft Ignite 2026 **전체 세션을 저장소 안에 리스트업**하고(타입·토픽·태그·레벨·발표자·세션 페이지·미디어 링크), 하나씩 확인·정리할 수 있게 한다.
- 정리 결과는 GitHub Pages 정적 사이트로 공유한다. 컨셉은 `caldova-kr/microsoft-build-2026`, 디자인은 `hellices/devguidesample`(엔지니어링 노트 톤).
- **오해 방지**: 노트 내용이 이번 Ignite 세션 원문에서 나온 것임을 규약 + 자동 검증으로 보장한다.

## 데이터 소스 조사 결과

| 항목 | 결과 |
|---|---|
| 카탈로그 API | `https://ignite.microsoft.com/api/session/all/en-US` — 사이트 JS 번들의 `apiV2` base(`https://ignite.microsoft.com/api`) + `/session/all/{locale}` 경로. 구 `api-v2.ignite.microsoft.com` 은 403 |
| 규모 (2026-11-20) | 인스턴스 1,527 → 고유 `sessionCode` 1,365 (반복 회차 병합) |
| 온라인 시청 가능 | 872 (Online 송출 530 + 현장 전용이지만 영상 있음 242 + 녹화 예정 100). 나머지 493 은 현장 전용·녹화 없음 — `deliveryTypes` 만으로 거르면 영상 있는 Theater 242 개를 잃으므로 `online` = Online ∨ 영상 ∨ 녹화 예정 으로 판정 |
| 세션 타입 | Breakout 437 · Theater 284 · Lightning Talk 232 · Table Talk 212 · Pre-recorded 104 · Lab 49 · Digital Lab 26 · Broadcast Stage 15 · Innovation Session 4 · Keynote 2 |
| 토픽 | Cloud & AI · Agent Platform · Security · Copilot · Data · Agentic Business Applications · Windows · Frontier Transformation · Microsoft IQ · MAICPP · Other |
| 태그 | 약 180종 (카탈로그 원문 유지) |
| 목록 API 누락 | `/session/all` 이 회차 재편성된 BRK338 을 누락(개별 API `/session/en-US-BRK338` 과 세션 페이지에는 있음). 코드 범위 795개 조회 결과 누락은 이 1건 → `catalog/extra-sessions.txt` 로 보충, `fetch_catalog.py --probe` 로 재점검 |
| 세션 페이지 | `https://ignite.microsoft.com/en-US/sessions/<CODE>` — 200, 제목 일치 확인 |
| 미디어 | 영상 668 · 트랜스크립트(.docx) 99 · 슬라이드(.pptx) 25 — 행사 직후라 증가 중 → 매일 재수집 |
| `aiDescription` | Microsoft가 생성한 긴 요약(타임스탬프 포함). 탐색용으로만 로컬 보관, 근거 금지 |

## 디자인 조사

| 참고 | 관찰 | 반영 |
|---|---|---|
| `hellices/devguidesample` | MkDocs Material + 커스텀 토큰(`--dg-*`), Noto Sans KR / JetBrains Mono, eyebrow·hero·stats·카드, 다크 슬레이트 | 토큰·타이포·랜딩 컴포넌트를 그대로 차용 (`docs/stylesheets/extra.css`) |
| `caldova-kr/microsoft-build-2026` | 세션 1개 = 파일 1개, 6 카테고리 고정 섹션, 상태 콜아웃, Copilot 지침 | 구조·섹션 체계 계승. 근거 등급·카탈로그 일치 검증을 추가 |
| `kronatus/ignite-catalog` (Ignite 2025, Next.js) | 카탈로그 slice & dice 포털 | 필터형 탐색기 아이디어. 서버 없이 정적 JSON + vanilla JS로 구현 |
| `tdwg/2026-conference-explorer` | 완전 정적, 브라우저 내 검색, 테마별 탐색, 근거 링크 | "evidence-linked" 원칙, 정적 인덱스 |
| `ArielMedeiros13/event-schedule-explorer` | 칩 필터·펼침 카드·URL 상태 | 행 펼침(초록·링크), 필터 상태를 URL 쿼리로 공유 |
| SSG 동향 (2026) | Starlight·VitePress·Docusaurus 인기. **Material for MkDocs 는 유지보수 모드, EOL 2027-05-05**, 후속 Zensical 이 `mkdocs.yml` 을 그대로 읽음(일부 플러그인·hooks 미지원) | MkDocs Material 유지(자매 저장소·devguide와 동일 스택) + **hooks·서드파티 플러그인 미사용**으로 Zensical 이전 경로 확보. 생성은 사전 스크립트로 |

## 결정

1. **스택**: MkDocs Material 9.7 (`mkdocs.yml` 에 hooks/플러그인 없음). 생성물은 `tools/build_pages.py` 가 커밋 전에 만들고 CI가 `--check` 로 확인.
2. **단일 출처**: `catalog/sessions.json` (생성) + `catalog/triage.yml` (수동). 노트 frontmatter 의 카탈로그 유래 필드는 카탈로그와 정확히 일치해야 함.
3. **근거 등급 T1~T4** 와 `source_basis` 필드. `review`/`done` 은 T1(영상·트랜스크립트·슬라이드) 필수.
4. **세션 밖 정보 격리**: `!!! supplement "세션 외 보충 · <출처>"` 블록. 블록 밖의 다른 이벤트 참조는 CI 에러.
5. **원본 미디어 비커밋**: `.cache/` 로만 받고 노트는 공식 URL 을 링크.
6. **진행 상태**: 미검토 → 📌 공유 제안(이슈) → 🙋 점유(이슈 assignee) → ✍️ draft → 🔍 review → ✅ done (노트). ⏸️ hold / ➖ skip 은 `triage.yml`.
7. **협업 (2026-11-20 추가)**: 공유할 세션은 이슈(`[CODE] 제목`, label `session`)로 제안, 정리자는 assignee 로 점유(`/claim` 댓글 워크플로 지원), PR `Closes #N`. 이슈 상태는 배포 시 `tools/fetch_issues.py` → `docs/catalog/issues.json`(비커밋)으로 사이트 카탈로그에 표시되며, 이슈 이벤트마다 재배포.
10. **이미지 우선**: 기여자 전원이 Microsoft 직원이므로 세션 영상 프레임 캡처(`tools/capture_frame.py`, HIGHMP4 를 HTTP range 로 seek — 전체 다운로드 없음)와 Ignite 2026 공식 블로그 이미지(`tools/fetch_image.py`, 공식 도메인 허용 목록)를 출처 캡션과 함께 커밋. `<figure>` + `<figcaption>` 형식과 출처를 `validate.py` 가 강제.
9. **오프라인 전용 처리**: 데이터에서 지우지 않고 `online` 플래그로 표시. 사이트 카탈로그 기본 필터 = 온라인으로 볼 수 있음, `SESSIONS.md` 는 오프라인 전용을 접힌 목록으로. `new_session.py` 는 오프라인 전용 세션 노트를 거부.
8. **Actions 런타임**: Node 24 버전 고정 (checkout v7 · setup-python v7 · upload-pages-artifact v5 · deploy-pages v5).

## 범위 밖 (YAGNI)

- 세션 노트 대량 자동 생성, 번역 자동화, 사이트 내 트랜스크립트 검색.
- 발표자 상세 페이지, 일정(시간표) 뷰.
