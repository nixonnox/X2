# PT / Report Output Spec

> PT/제안서와 보고서 출력 구조, use case별 차이, role별 조립 방식

## 1. PT 슬라이드 구조 (PtSlideBlock)

### 1.1 슬라이드 유형 (10종)

| # | Type | 역할 | Visual Hint |
|---|------|------|-------------|
| 1 | TITLE | 표지 | — |
| 2 | MARKET_BACKGROUND | 시장 배경 | chart_bar |
| 3 | INTENT_SHIFT | 검색 인텐트 구조 | flow_diagram |
| 4 | JOURNEY_MAP | 탐색 경로 | flow_diagram |
| 5 | PERSONA_ARCHETYPE | 검색자 유형 | persona_card |
| 6 | CLUSTER_INSIGHT | 클러스터 분석 | chart_pie |
| 7 | COMPETITIVE_OPPORTUNITY | 기회 영역 | — |
| 8 | RECOMMENDED_ACTION | 추천 액션 | — |
| 9 | EVIDENCE_SUPPORT | 근거 자료 | table |
| 10 | GEO_AEO_INSIGHT | AI 검색 최적화 | chart_bar |

### 1.2 공통 슬라이드 구조

```typescript
{
  id: string;
  slideType: PtSlideType;
  headline: string;             // 장표 헤드라인 (1줄)
  subheadline?: string;         // 보조 설명 (1줄)
  supportingPoints: string[];   // 핵심 포인트 (3-5줄)
  evidenceRefs: EvidenceRef[];  // 근거 연결
  sourceRefs: SourceRef[];      // 출처 연결
  visualHint?: string;          // 차트/시각화 힌트
  speakerNote?: string;         // 발표자 노트 (quality 경고 포함)
  quality: DocumentQualityMeta;
  order: number;
}
```

### 1.3 슬라이드별 메시지 구조

| 슬라이드 | headline 예시 | 핵심 메시지 |
|---------|-------------|-----------|
| MARKET_BACKGROUND | "시장 검색 환경 현황" | 시장 관심이 다양한 방향으로 확산 |
| INTENT_SHIFT | "검색 인텐트 구조" | 사용자가 어떤 단계에서 어떤 질문을 하는가 |
| JOURNEY_MAP | "주요 검색 탐색 경로" | 허브 키워드와 대표 경로 기반 콘텐츠 전략 |
| PERSONA_ARCHETYPE | "핵심 검색자 페르소나" | N개 유형의 검색자가 존재, 유형별 전략 필요 |
| CLUSTER_INSIGHT | "주요 검색 클러스터 분석" | N개 주제 그룹이 시장 구조를 형성 |
| COMPETITIVE_OPPORTUNITY | "기회 영역" | 콘텐츠 갭 + 허브 키워드 선점 |
| GEO_AEO_INSIGHT | "AI 검색 최적화 시사점" | FAQ 구조화 + schema 적용 + answerability |

## 2. 보고서 구조 (ReportOutputSection)

### 2.1 보고서 유형 (6종)

| # | Type | 대상 | 주기 | 포함 섹션 수 |
|---|------|------|------|-------------|
| 1 | WEEKLY_LISTENING | 실무자 | 주간 | 6 |
| 2 | MONTHLY_SEARCH_INTELLIGENCE | 전체 | 월간 | 11 |
| 3 | EXECUTIVE_SUMMARY | 경영진 | 수시 | 3 |
| 4 | ISSUE_FAQ | 실무자 | 수시 | 4 |
| 5 | CAMPAIGN_STRATEGY_BRIEF | 마케터 | 수시 | 6 |
| 6 | GEO_AEO_OPTIMIZATION_MEMO | GEO 운영자 | 수시 | 6 |

### 2.2 보고서별 섹션 구성

```
WEEKLY_LISTENING:
  핵심요약 → 인텐트구조 → 클러스터 → 검색경로 → 추천액션 → 품질안내

MONTHLY_SEARCH_INTELLIGENCE:
  핵심요약 → 시장배경 → 인텐트구조 → 클러스터 → 검색경로 → 페르소나
  → 경쟁환경 → GEO/AEO → 추천액션 → 근거부록 → 품질안내

EXECUTIVE_SUMMARY:
  핵심요약 → 인텐트구조 → 추천액션

ISSUE_FAQ:
  핵심요약 → 클러스터 → 추천액션 → 근거부록

CAMPAIGN_STRATEGY_BRIEF:
  시장배경 → 인텐트구조 → 페르소나 → 클러스터 → 추천액션 → 근거부록

GEO_AEO_OPTIMIZATION_MEMO:
  핵심요약 → 인텐트구조 → 검색경로 → GEO/AEO시사점 → 추천액션 → 품질안내
```

### 2.3 공통 섹션 구조

```typescript
{
  id: string;
  type: ReportOutputSectionType;
  title: string;
  summary: string;                    // 섹션 요약 (복사 가능한 형태)
  blocks: DocumentBlock[];            // GEO 블록 재사용 (해당시)
  relatedInsightIds: string[];
  relatedActionIds: string[];
  quality: DocumentQualityMeta;
  order: number;
}
```

## 3. Use Case별 출력 차이

| Use Case | 주 출력물 | 보조 출력물 | 타겟 |
|----------|---------|-----------|------|
| GEO_AEO_DOCUMENT | GEO 블록 7종 | — | SEO/GEO 담당자 |
| PT_PROPOSAL | PT 슬라이드 10종 | — | AE/기획자 |
| WEEKLY_REPORT | 보고서 6섹션 | — | 실무자 |
| MONTHLY_REPORT | 보고서 11섹션 | GEO 블록 | 전체 |
| EXECUTIVE_BRIEF | 보고서 3섹션 | PT 슬라이드 | 경영진 |
| CAMPAIGN_BRIEF | 보고서 6섹션 | PT 슬라이드 | 마케터 |
| FAQ_REPORT | 보고서 4섹션 | GEO 블록 | 실무자 |
| OPTIMIZATION_MEMO | 보고서 6섹션 | GEO 블록 | GEO 운영자 |

## 4. Role별 조립 차이

### 4.1 PRACTITIONER (기획자/일반 직장인)

- 전체 블록/섹션/슬라이드 포함
- raw evidence 포함
- quality warnings 표시
- source 상세 정보 포함
- narrativeStyle: "technical"
- **용도**: 차트 + 근거 + 요약 → PPT/보고서 복붙

### 4.2 MARKETER (마케터/AE)

- DATA_QUALITY_NOTE 제외
- raw evidence 미포함 (snippet만)
- source 상세 미포함
- narrativeStyle: "actionable"
- **용도**: stage별 메시지 전략, cluster별 액션, 콘텐츠/광고 제안

### 4.3 EXECUTIVE (대표/CMO)

- EXECUTIVE_SUMMARY + INTENT + ACTIONS만
- PT: TITLE + BACKGROUND + OPPORTUNITY + ACTION + GEO
- quality warnings 미표시
- narrativeStyle: "strategic"
- **용도**: decision-ready 요약, 전략 기회/리스크

### 4.4 ADMIN (GEO/AEO 운영자)

- 전체 포함 + quality 경고 강조
- raw evidence 포함
- source 상세 정보 포함
- narrativeStyle: "technical"
- **용도**: citation readiness, source trust, FAQ/summary 개선 포인트

## 5. Role별 블록 수 제한

| Role | maxBlocks | maxSlides | maxSections |
|------|-----------|-----------|-------------|
| PRACTITIONER | 20 | 15 | 12 |
| MARKETER | 15 | 12 | 8 |
| ADMIN | 18 | 12 | 10 |
| EXECUTIVE | 8 | 10 | 5 |

## 6. 실무 활용 시나리오

### 시나리오 A: 마케터가 "프로틴 음료" PT 제안서 생성

```
입력: useCase=PT_PROPOSAL, role=MARKETER
출력:
  - 10장 PT 슬라이드 (MARKETER용으로 필터링)
  - 각 슬라이드에 headline + supportingPoints + visualHint
  - evidence 근거 연결
  - speakerNote에 데이터 상태
```

### 시나리오 B: GEO 운영자가 최적화 메모 생성

```
입력: useCase=OPTIMIZATION_MEMO, role=ADMIN
출력:
  - GEO 블록 7종 (FAQ, Summary, Comparison 등)
  - 보고서 6섹션 (GEO/AEO 시사점 포함)
  - citation-ready 소스 목록
  - schema.org 적용 힌트
```

### 시나리오 C: CMO에게 주간 브리프

```
입력: useCase=EXECUTIVE_BRIEF, role=EXECUTIVE
출력:
  - 보고서 3섹션 (핵심요약 + 인텐트 + 액션)
  - PT 5장 (타이틀 + 배경 + 기회 + 액션 + GEO)
  - quality 경고 없음 (전략적 관점만)
```
