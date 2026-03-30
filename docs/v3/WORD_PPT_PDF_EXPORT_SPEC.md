# Word / PPT / PDF Export Spec

> 형식별 차이 · block 조립 차이 · warning 처리 차이

## 1. 형식별 핵심 차이

| 항목 | Word | PPT | PDF |
|------|------|-----|-----|
| 목적 | 편집/공유/회의 | 설득/발표/장표 | 배포/보관/승인 |
| 구조 | 문단 + 표 + 불릿 | 슬라이드 + 시각화 | 고정 페이지 + 목차 |
| 톤 | 보고서/메신저/불릿/공식 | 설득/전략/분석 | 고정/정확/완결 |
| 편집 가능 | O | 구조적 편집 | X (읽기 전용) |
| evidence 표시 | 부록 표 | 백업 슬라이드 | 부록 페이지 |
| 경고 표시 | 인라인 + 하단 유의사항 | 발표자 노트 + 슬라이드 하단 | 페이지 하단 + 워터마크 |
| mock 처리 | 문서 상단 경고 | 마지막 슬라이드 경고 | 전체 워터마크 |

## 2. Word Export 블록 조립 규칙

### 2.1 블록 → 렌더링 모드

| ExportBlockRole | Word 렌더링 | 설명 |
|-----------------|------------|------|
| TITLE | PARAGRAPH (HEADING1) | 문서 제목 |
| SUMMARY | PARAGRAPH | 한 줄 요약 + 요약 문단 |
| BODY | PARAGRAPH + BULLET 혼합 | 핵심 발견, 분석 결과 |
| TABLE/CHART_HINT | TABLE | 표 형태 (차트는 설명 표) |
| FAQ | TABLE | 질문-답변 2열 표 |
| COMPARISON | TABLE | 비교표 (다열) |
| ACTION | BULLET_LIST | 불릿 리스트 (실행 항목) |
| EVIDENCE | APPENDIX (TABLE) | 부록: 근거 ID/카테고리/라벨/스니펫 표 |
| WARNING/RISK | INLINE_WARNING (WARNING_BOX) | 경고 박스 스타일 |
| APPENDIX | APPENDIX | 부록 원문 |

### 2.2 Word 섹션 순서

```
1. 문서 헤더 (제목, 일자, 키워드, 업종)
2. 한 줄 요약
3. 요약 섹션 (SUMMARY)
4. 핵심 발견/분석 (BODY)
5. FAQ/비교표 (TABLE)
6. 실행 항목 (BULLET_LIST)
7. 경고/리스크 (WARNING_BOX)
8. 부록 — 근거 표, 출처 표, 품질 노트, 원문
9. 유의사항 (전역 경고 목록 + 신뢰도)
```

### 2.3 Word Export 목적별 차이

| 목적 | 포함 블록 | 특징 |
|------|----------|------|
| WEEKLY_REPORT | 전체 | 표준 구조 |
| MONTHLY_REPORT | 전체 + 비교 강화 | 월간 트렌드 비교 강조 |
| MEETING_MATERIAL | SUMMARY + KEY_FINDING + ACTION | 핵심만 1-2장 |
| DECISION_MEMO | SUMMARY + COMPARISON + ACTION + EVIDENCE | 비교 근거 중심 |
| SHARED_DOCUMENT | 전체 | 복붙 친화 (톤: MESSENGER) |
| EVIDENCE_BUNDLE | EVIDENCE + COMPARISON + FAQ | 근거 중심 |

## 3. PPT Export 블록 조립 규칙

### 3.1 블록 → 슬라이드 역할

| ExportBlockRole | PPT 역할 | 설명 |
|-----------------|---------|------|
| TITLE | SLIDE_HEADLINE | 표지 슬라이드 |
| SUMMARY | SLIDE_HEADLINE | Executive Summary 슬라이드 |
| BODY | SUPPORTING_POINT | 본문 슬라이드 (headline + points) |
| TABLE/CHART_HINT | VISUAL_HINT | 시각화 추천 슬라이드 |
| COMPARISON | VISUAL_HINT | 비교표 시각화 슬라이드 |
| FAQ | SUPPORTING_POINT | 질문 하이라이트 슬라이드 |
| ACTION | SUPPORTING_POINT | 액션 아이템 슬라이드 |
| EVIDENCE | BACKUP_SLIDE | 백업: 근거 상세 |
| WARNING/RISK | SPEAKER_NOTE | 발표자 노트에 삽입 |
| APPENDIX | BACKUP_SLIDE | 백업: 부록 |

### 3.2 PPT 슬라이드 구조 (1장당)

```
┌─────────────────────────────────────┐
│ HEADLINE (한 줄)                      │
│                                      │
│ KEY MESSAGE (핵심 메시지)              │
│                                      │
│ • Supporting Point 1                 │
│ • Supporting Point 2                 │
│ • Supporting Point 3                 │
│                                      │
│ [시각화 추천: chart_type]              │
│                                      │
│ ──────────────────────────────────── │
│ 근거: category1, category2  | 경고    │
└─────────────────────────────────────┘
발표자 노트: 유의사항/경고/세부 설명
```

### 3.3 시각화 힌트 매핑

| 원본 블록 | 시각화 추천 |
|----------|-----------|
| CLUSTER | cluster_board (관심 영역 보드) |
| COMPARISON | comparison_table (비교표) |
| FAQ | quote_highlight (질문 카드) |
| PERSONA | persona_cards (고객 유형 카드) |
| ROAD_STAGE | stage_flow (여정 플로우) |
| PATH | path_graph (경로 그래프) |
| STAT_HIGHLIGHT | metric_dashboard (지표 대시보드) |
| COMPETITIVE_GAP | comparison_table (경쟁 갭) |
| GEO_AEO | heatmap (노출 히트맵) |

### 3.4 PPT Export 목적별 차이

| 목적 | 슬라이드 구성 | 특징 |
|------|-------------|------|
| ADVERTISER_PROPOSAL | 표지 → 요약 → 문제 → 기회 → 전략 → 액션 → 마무리 | 설득 중심 |
| INTERNAL_STRATEGY | 표지 → 전체 분석 → 전략 → 액션 | 분석 중심 |
| EXECUTIVE_REPORT | 표지 → 요약 → 핵심 3장 → 마무리 | 핵심만 |
| CAMPAIGN_STRATEGY | 표지 → 타겟 → 채널 → 전략 → 액션 → 기대효과 | 캠페인 중심 |
| GEO_AEO_STRATEGY | 표지 → AI 검색 현황 → 갭 → 전략 → 액션 | GEO 특화 |

## 4. PDF Export 블록 조립 규칙

### 4.1 블록 → 페이지 배치

| ExportBlockRole | PDF 배치 | 설명 |
|-----------------|---------|------|
| TITLE | COVER (표지) | 표지 페이지 |
| SUMMARY | SUMMARY (첫 본문) | 요약 페이지 |
| BODY | BODY | 본문 페이지 |
| TABLE/CHART_HINT | BODY | 본문 + 차트 플레이스홀더 |
| FAQ | BODY (TABLE) | FAQ 표 페이지 |
| COMPARISON | BODY (TABLE) | 비교표 페이지 |
| ACTION | BODY (BULLET) | 실행 항목 페이지 |
| EVIDENCE | APPENDIX | 부록 페이지 |
| WARNING/RISK | FOOTER_WARNING | 페이지 하단 경고 |
| APPENDIX | APPENDIX | 부록 페이지 |

### 4.2 PDF 페이지 구조

```
┌──────────────────────────────────────┐
│ [헤더 뱃지: 샘플 데이터 / 오래된 데이터]  │
│                                       │
│ 섹션 제목                               │
│ ─────────────────────────────────────  │
│                                       │
│ 본문 콘텐츠 (문단 / 표 / 불릿 / 차트)    │
│                                       │
│                                       │
│                                       │
│ ─────────────────────────────────────  │
│ [하단 경고: 품질 경고 / 규제 주의]        │
│                                  p.N   │
└──────────────────────────────────────┘
```

### 4.3 PDF 특수 구조

| 구성 요소 | 설명 |
|----------|------|
| 표지 신뢰도 뱃지 | HIGH(녹색)/MEDIUM(황색)/LOW(적색) |
| 목차 | 자동 생성, 부록은 level 2 |
| 워터마크 | mock 데이터일 때 전체 페이지 워터마크 |
| 유의사항 페이지 | 마지막 페이지 — 규제 경고 + 품질 경고 + evidence 요약 |

## 5. Warning 처리 차이

### 5.1 경고 배치

| 경고 유형 | Word | PPT | PDF |
|----------|------|-----|-----|
| MOCK_DATA | 문서 상단 (HEADER) | 슬라이드 하단 (FOOTER) | 워터마크 (WATERMARK) |
| STALE_DATA | 인라인 (INLINE) | 슬라이드 하단 (FOOTER) | 페이지 하단 (FOOTER) |
| PARTIAL_SOURCE | 인라인 (INLINE) | 슬라이드 하단 (FOOTER) | 페이지 하단 (FOOTER) |
| LOW_CONFIDENCE | 문서 상단 (HEADER) | 슬라이드 하단 (FOOTER) | 표지 (HEADER) |
| REGULATORY | 부록 (APPENDIX) | 슬라이드 하단 (FOOTER) | 페이지 하단 (FOOTER) |
| VERTICAL_POLICY | 인라인 (INLINE) | 슬라이드 하단 (FOOTER) | 페이지 하단 (FOOTER) |

### 5.2 경고 심각도

| 심각도 | Word 표시 | PPT 표시 | PDF 표시 |
|--------|----------|---------|---------|
| CRITICAL | WARNING_BOX (빨간) | 슬라이드 + 발표자노트 | 헤더 뱃지 + 하단 + 워터마크 |
| WARNING | WARNING_BOX (주황) | 발표자노트 | 하단 경고 |
| CAUTION | 인라인 텍스트 | 발표자노트 | 하단 경고 |
| INFO | 캡션 | — (생략) | 캡션 |
