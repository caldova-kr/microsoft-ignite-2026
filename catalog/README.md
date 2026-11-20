# catalog/ — Ignite 2026 전체 세션 스냅샷

공식 세션 카탈로그(<https://ignite.microsoft.com/en-US/sessions>)가 사용하는 공개 API
`https://ignite.microsoft.com/api/session/all/en-US` 에서 받은 데이터를 정규화한 것입니다.
**이 폴더의 데이터가 세션 메타데이터(제목·타입·토픽·태그·레벨·발표자·링크)의 단일 출처**입니다.

| 파일 | 만드는 방법 | 용도 |
|---|---|---|
| [`SESSIONS.md`](SESSIONS.md) | 생성 (`tools/build_pages.py`) | GitHub에서 바로 훑어보는 전체 목록 — 타입별 표, 진행 상태, 세션 링크, 미디어 |
| `sessions.json` | 생성 (`tools/fetch_catalog.py`) | 정규화된 전체 세션 (세션 코드당 1건) |
| `sessions.csv` | 생성 (`tools/fetch_catalog.py`) | 스프레드시트용 |
| `meta.json` | 생성 (`tools/fetch_catalog.py`) | 수집 시각·건수·해시 |
| [`triage.yml`](triage.yml) | **사람이 편집** | 정리 대상 선정 (`pick` / `hold` / `skip`) |

## 갱신

```bash
python tools/fetch_catalog.py   # 카탈로그 재수집 (변경 없으면 아무것도 쓰지 않음)
python tools/build_pages.py     # SESSIONS.md · 사이트 데이터 · 인덱스 재생성
```

`.github/workflows/refresh-catalog.yml` 이 매일 자동 갱신합니다 — 행사 후 온디맨드 영상·트랜스크립트·슬라이드 링크가 계속 추가되기 때문입니다.

## sessions.json 필드

| 필드 | 카탈로그 원본 | 비고 |
|---|---|---|
| `code` | `sessionCode` | 예: `KEY01`, `BRK220`, `LTG401`, `THRSP312` |
| `title` | `title` | 원문 그대로 |
| `type` | `sessionType` | Keynote · Breakout · Theater · Lightning Talk · Table Talk · Lab · Digital Lab · Pre-recorded · Broadcast Stage · Innovation Session |
| `topics` | `topic[]` | Cloud & AI · Agent Platform · Security · Copilot · Data · Agentic Business Applications · Windows · Frontier Transformation · Microsoft IQ · MAICPP · Other |
| `tags` | `tags[]` | 카탈로그 태그 원문 (약 180종) |
| `level` | `sessionLevel` | 100 / 200 / 300 / 400 |
| `audiences`, `industries`, `delivery`, `recorded` | `audienceTypes`, `industry`, `deliveryTypes`, `viewingOptions` | |
| `speakers` | `speakerNames` | |
| `duration_min` | `durationInMinutes` | |
| `slots[]` | `startDateTime`/`endDateTime`/`location` | 반복 회차는 같은 코드로 병합 (UTC) |
| `url` | — | `https://ignite.microsoft.com/en-US/sessions/<code>` (검증된 패턴) |
| `video` | `onDemand` | 온디맨드 영상 임베드 URL |
| `transcript` | `captionFileLink` | 공식 트랜스크립트(.docx) |
| `slides` | `slideDeck` | 공식 슬라이드(.pptx) |
| `resources[]` | `relatedResources` | 세션이 공식 링크한 자료 |
| `description` | `description` | 초록 (HTML → 텍스트) |
| `has_ai_summary` | `aiDescription` 존재 여부 | 본문은 `tools/fetch_sources.py` 로 로컬에서만 확인 (탐색용, 근거 아님) |

> 세션 초록·제목 등은 Microsoft 저작물입니다. 자세한 범위는 [NOTICE.md](../NOTICE.md).
