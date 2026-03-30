# PT Deck Generation Architecture

> Search Intelligence 결과가 광고주 설득용 PT 장표로 변환되는 전체 구조

## 1. 파이프라인

```
Search Intelligence Result
  │ + Insight (SearchInsightIntegrationService)
  │ + Action (SearchActionIntegrationService)
  │ + Evidence (SearchEvidenceBundleService)
  │ + Social Insight (optional)
  │ + Competitor Gap (optional)
  │
  ├─ Quality Gate
  │   └─ INSUFFICIENT → 빈 deck (즉시 반환)
  │
  ├─ EvidenceToDocumentMapper
  │   ├─ mapToEvidenceRefs() → EvidenceRef[]
  │   ├─ mapToSourceRefs() → SourceRef[]
  │   └─ mapQuality() → PtQualityMeta
  │
  ├─ PtNarrativeAssembler
  │   └─ PtNarrative (overallStoryline + strategicMessage + topInsights + recommendedActions)
  │
  ├─ PtSlideBlockBuilder (PT_DECK_SLIDE_MAP에 따라 장표 구성)
  │   └─ SearchToPtSlideMapper.buildSlide() × N → PtSlideBlock[]
  │       └─ EvidenceToPtVisualHintMapper → recommendedVisualType
  │
  └─ RoleBasedPtAssembler
      └─ PtDeck (audience별 필터링 완료)
```

## 2. 서비스 구조

```
packages/api/src/services/pt/
├── types.ts                           # PtDeck, PtSlideBlock, PtNarrative 등 타입
├── pt-deck-generation.service.ts      # 오케스트레이터 (메인 진입점)
├── pt-slide-block-builder.ts          # deck type별 슬라이드 세트 빌더
├── search-to-pt-slide-mapper.ts       # search result → 개별 슬라이드 변환
├── pt-narrative-assembler.ts          # 전체 스토리라인/전략 메시지 생성
├── evidence-to-pt-visual-hint-mapper.ts # evidence → 시각화 힌트 추천
├── role-based-pt-assembler.ts         # audience별 필터링·재조립
└── index.ts                           # Barrel export
```

## 3. 서비스별 상세

### 3.1 PtDeckGenerationService (오케스트레이터)

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + Quality + EvidenceItems + DeckType + Audience + Insights + Actions + SocialInsight + CompetitorGap |
| 사용 서비스 | EvidenceToDocumentMapper, EvidenceToPtVisualHintMapper, SearchToPtSlideMapper, PtSlideBlockBuilder, PtNarrativeAssembler, RoleBasedPtAssembler |
| 출력 | PtDeck |
| Evidence 연결 | EvidenceToDocumentMapper가 모든 슬라이드의 evidenceRefs 생성 |
| Confidence 처리 | INSUFFICIENT → 빈 deck, isMockOnly → 경고, stale → speakerNote |
| Failure 포인트 | quality gate, 개별 슬라이드 빌드 실패 시 해당 슬라이드만 스킵 |

### 3.2 SearchToPtSlideMapper

| 항목 | 내용 |
|------|------|
| 입력 | SlideContext (SearchResult + Quality + Evidence + Insight + Action + Social + Competitor) |
| 출력 | PtSlideBlock (개별 슬라이드) |
| 16종 슬라이드 | TITLE, EXECUTIVE_SUMMARY, PROBLEM_DEFINITION, OPPORTUNITY, PATHFINDER, ROADVIEW, PERSONA, CLUSTER, SOCIAL_INSIGHT, COMPETITIVE_GAP, GEO_AEO, STRATEGY, ACTION, EXPECTED_IMPACT, EVIDENCE, CLOSING |
| 메시지 원칙 | keyMessage 필수, 비즈니스 언어, "그래서 무엇을 해야 하는가" 포함 |

### 3.3 PtNarrativeAssembler

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + PtQualityMeta + InsightItem[] + ActionItem[] |
| 출력 | PtNarrative |
| Storyline | 시장상황 → 문제/기회 → 전략방향 → 신뢰도 경고 |
| Strategic Message | weakStages 기반 또는 cluster 기반 1~2줄 핵심 메시지 |
| 언어 변환 | toBusinessLanguage()로 기술 용어 → 비즈니스 언어 변환 |

### 3.4 EvidenceToPtVisualHintMapper

| 항목 | 내용 |
|------|------|
| 입력 | EvidenceRef[] + displayType + PtSlideType |
| 출력 | RecommendedVisualType |
| 추천 로직 | displayType 우선 → evidence 카테고리 빈도 → 슬라이드 기본값 |
| 시각화 종류 | 14종 (line_chart, trend_bar, path_graph, stage_flow, persona_cards, cluster_board, comparison_table, evidence_panel, executive_summary_card, funnel_chart, heatmap, quote_highlight, metric_dashboard, none) |

### 3.5 RoleBasedPtAssembler

| 항목 | 내용 |
|------|------|
| 입력 | PtDeck + PtAudience |
| 출력 | PtDeck (필터링 완료) |
| ADVERTISER | 11종 슬라이드, quality 경고 제거, snippet만 |
| EXECUTIVE | 6종 슬라이드, quality 경고 제거, snippet만 |
| MARKETER | 전체 슬라이드, quality 경고 유지 |
| INTERNAL | 전체 슬라이드, 전체 evidence, 전체 경고 |

## 4. PT Deck 유형별 장표 구성

| Deck Type | 장표 구성 |
|-----------|---------|
| ADVERTISER_PROPOSAL | TITLE → EXEC → PROBLEM → OPPORTUNITY → PATHFINDER → PERSONA → CLUSTER → STRATEGY → ACTION → IMPACT → EVIDENCE → CLOSING |
| CAMPAIGN_STRATEGY | TITLE → PROBLEM → PERSONA → ROADVIEW → CLUSTER → SOCIAL → STRATEGY → ACTION → IMPACT → EVIDENCE → CLOSING |
| COMPETITIVE_ANALYSIS | TITLE → EXEC → PROBLEM → COMPETITIVE → PATHFINDER → CLUSTER → OPPORTUNITY → STRATEGY → ACTION → EVIDENCE → CLOSING |
| GEO_AEO_STRATEGY | TITLE → EXEC → PROBLEM → ROADVIEW → CLUSTER → GEO_AEO → STRATEGY → ACTION → IMPACT → EVIDENCE → CLOSING |
| INFLUENCER_COLLABORATION | TITLE → PROBLEM → PERSONA → CLUSTER → SOCIAL → STRATEGY → ACTION → IMPACT → EVIDENCE → CLOSING |
| INTERNAL_STRATEGY | TITLE → EXEC → PROBLEM → OPPORTUNITY → PATHFINDER → ROADVIEW → PERSONA → CLUSTER → COMPETITIVE → GEO_AEO → STRATEGY → ACTION → EVIDENCE → CLOSING |

## 5. 기존 서비스와의 차이

| 항목 | documents/SearchPtSectionBuilder | pt/PtDeckGenerationService |
|------|--------------------------------|---------------------------|
| 목적 | 데이터 중심 슬라이드 | 메시지 중심 설득 장표 |
| 스토리라인 | 없음 | PtNarrative (storyline + strategy) |
| keyMessage | 없음 | 모든 장표 필수 |
| 소셜/댓글 결합 | 없음 | SOCIAL_INSIGHT 슬라이드 |
| 경쟁 분석 | 단순 opportunity | COMPETITIVE_GAP 슬라이드 |
| 기대효과 | 없음 | EXPECTED_IMPACT 슬라이드 |
| Insight/Action 통합 | 없음 | narrative에 통합 |
| PT 유형 | 1종 | 6종 (advertiser, campaign, competitive, geo, influencer, internal) |
| Audience 필터링 | ROLE_DOCUMENT_CONFIG | PT_AUDIENCE_CONFIG (4종) |
| 시각화 | visualHint (5종) | recommendedVisualType (14종) |
| 언어 | 기술 용어 혼재 | 비즈니스 언어 통일 |
