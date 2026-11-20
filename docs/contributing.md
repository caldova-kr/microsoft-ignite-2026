---
title: 기여하기
description: Ignite 2026 세션 노트 작성 규약과 절차
---

# 기여하기

이 사이트의 노트는 **해당 Ignite 2026 세션의 공식 자료(영상·트랜스크립트·슬라이드)로 추적 가능한 내용**만 담습니다.
전체 규약은 저장소의 [`.github/copilot-instructions.md`](https://github.com/caldova-kr/microsoft-ignite-2026/blob/main/.github/copilot-instructions.md)가 단일 기준입니다.

## 근거 등급

| 등급 | 출처 | 사용 범위 |
|---|---|---|
| T1 세션 원문 | 그 세션의 영상 · 트랜스크립트 · 슬라이드 | 본문 전체 |
| T2 카탈로그 | 제목 · 타입 · 토픽 · 태그 · 발표자 · 초록 · 공식 리소스 링크 | 메타데이터 · Resources |
| T3 Ignite 2026 공식 발표 | Book of News 2026, 공식 블로그 | `세션 외 보충` 블록 안 |
| T4 공식 문서 | Microsoft Learn 등 | `세션 외 보충` 블록 안, 확인 일자 포함 |

- 초록은 "다룰 예정"이지 "말한 내용"이 아닙니다. 카탈로그의 AI 요약은 탐색용입니다.
- 다른 이벤트(Build 2026, 이전 Ignite)와 모델의 사전 지식은 근거가 아닙니다.
- GA·Preview 상태와 날짜는 세션이나 공식 발표가 명시한 경우에만 씁니다.

## 절차

```bash
pip install -r requirements.txt
python tools/fetch_sources.py <CODE>   # 원문 자료를 .cache/ 로 (커밋되지 않음)
python tools/new_session.py <CODE>     # 카탈로그 값이 채워진 노트 생성
python tools/build_pages.py            # 인덱스 · 카탈로그 · 메뉴 갱신
python tools/validate.py               # 카탈로그 일치 · 근거 · 섹션 검증
mkdocs serve                           # http://127.0.0.1:8000
```

정리할 세션 선정은 `catalog/triage.yml`에 `pick` · `hold` · `skip`으로 기록합니다.

## 진행 상태

| 표시 | 의미 | 결정 위치 |
|:-:|---|---|
| · | 미검토 | — |
| 📌 | 정리 대상 | `triage.yml` `pick` |
| ⏸️ | 보류 (자료 공개 대기 등) | `triage.yml` `hold` |
| ➖ | 제외 | `triage.yml` `skip` |
| ✍️ | 작성 중 | 노트 `status: draft` |
| 🔍 | 검토 중 | 노트 `status: review` — T1 근거 필수 |
| ✅ | 완료 | 노트 `status: done` — T1 근거 필수 |

## 상태 콜아웃

!!! ga "GA"
    세션 또는 공식 발표가 GA라고 명시한 항목

!!! preview "Public Preview"
    세션 또는 공식 발표가 Public Preview라고 명시한 항목

!!! roadmap "Roadmap"
    세션에서 향후 계획으로 언급한 항목

!!! supplement "세션 외 보충 · Book of News 2026"
    세션 밖 정보는 이 블록 안에만, 출처 링크와 함께 둡니다.
