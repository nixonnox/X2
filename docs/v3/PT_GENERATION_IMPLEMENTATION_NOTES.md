# PT Generation Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 PT 생성 서비스 (신규 생성: 7개 파일)

```
packages/api/src/services/pt/
├── types.ts                           # PtDeck, PtSlideBlock, PtNarrative, PtDeckType, PtAudience 등
├── pt-deck-generation.service.ts      # 오케스트레이터 (메인 진입점)
├── pt-slide-block-builder.ts          # deck type별 슬라이드 세트 빌더
├── search-to-pt-slide-mapper.ts       # search result → 16종 슬라이드 빌드
├── pt-narrative-assembler.ts          # 전체 스토리라인/전략 메시지 생성
├── evidence-to-pt-visual-hint-mapper.ts # evidence → 14종 시각화 추천
├── role-based-pt-assembler.ts         # audience별 필터링·재조립
└── index.ts                           # Barrel export
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 추가:
- import: `PtDeckGenerationService`
- re-export: PT 타입 8종 (PtDeck, PtDeckType, PtNarrative, PtAudience, PtAudienceConfig, RecommendedVisualType, GeneratePtDeckInput)
- factory: `ptDeckGeneration: new PtDeckGenerationService()` (stateless)

### 1.3 생성된 문서 (4개)

```
docs/v3/
├── PT_DECK_GENERATION_ARCHITECTURE.md
├── PT_SLIDE_BLOCK_SPEC.md
├── ADVERTISER_PT_OUTPUT_STRATEGY.md
└── PT_GENERATION_IMPLEMENTATION_NOTES.md (이 파일)
```

## 2. 설계 결정

### 2.1 기존 documents/SearchPtSectionBuilder와 별도 분리

- 기존: 데이터 중심 슬라이드 (10종, visualHint, speakerNote)
- 신규: 메시지 중심 설득 장표 (16종, keyMessage, recommendedVisualType, narrative)
- 이유: PT의 목적이 "데이터 전달"이 아니라 "설득"이므로, 전혀 다른 서비스 구조 필요
- 기존 서비스는 유지됨 — 보고서형 PT 출력에 계속 사용 가능

### 2.2 PtNarrative 도입

- PT 전체의 스토리라인(overallStoryline)과 전략 메시지(strategicMessage)를 별도 생성
- 개별 슬라이드의 keyMessage와 함께, PT 전체의 일관된 메시지를 유지
- 이유: 광고주 PT는 "이야기"가 있어야 설득력이 생김

### 2.3 keyMessage 필수

- 모든 슬라이드에 keyMessage 필수
- "그래서 무엇이 중요한가"를 명시적으로 표현
- supportingPoints는 keyMessage를 뒷받침하는 구조
- 이유: 데이터 나열형 슬라이드에서 탈피

### 2.4 비즈니스 언어 변환

- PtNarrativeAssembler.toBusinessLanguage()로 기술 용어 자동 변환
- 슬라이드 빌더에서도 비즈니스 친화적 표현 사용
- 이유: 광고주가 "cluster", "pathfinder" 같은 기술 용어를 이해할 필요 없음

### 2.5 소셜/경쟁 결합 포인트

- SlideContext에 socialInsight, competitorGap을 optional로 포함
- SOCIAL_INSIGHT, COMPETITIVE_GAP 슬라이드가 이 데이터를 사용
- 이유: X2의 차별점 — search intelligence만이 아니라 소셜/경쟁까지 결합

### 2.6 6종 PT Deck 유형

- ADVERTISER_PROPOSAL, CAMPAIGN_STRATEGY, COMPETITIVE_ANALYSIS, GEO_AEO_STRATEGY, INFLUENCER_COLLABORATION, INTERNAL_STRATEGY
- PT_DECK_SLIDE_MAP에서 유형별 장표 구성을 정의
- 이유: 같은 데이터라도 목적에 따라 다른 흐름이 필요

### 2.7 Audience별 필터링

- PT_AUDIENCE_CONFIG에 4종 audience 설정 (ADVERTISER, EXECUTIVE, INTERNAL, MARKETER)
- RoleBasedPtAssembler가 슬라이드/evidence/quality 경고를 audience별로 필터링
- 이유: 같은 PT 유형이라도 보는 사람에 따라 필요한 정보의 깊이가 다름

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| documents/SearchPtSectionBuilder | 유지됨 — 보고서형 PT 출력에 계속 사용 |
| documents/SearchDocumentGenerationService | 유지됨 — GEO/AEO + 보고서 출력 담당 |
| documents/RoleBasedDocumentAssembler | 유지됨 — DocumentRole 기반 조립 |
| SearchEvidenceBundleService | 유지됨 — evidence 입력 제공 |
| SearchInsightIntegrationService | 유지됨 — insight 입력 제공 |
| SearchActionIntegrationService | 유지됨 — action 입력 제공 |
| 기존 서비스 팩토리 | 유지됨 — Group 9 추가만 |

## 4. 실제 흐름 예시

### 광고주 제안 PT 생성 흐름

```
1. SearchIntelligenceResult 수신
2. assessSearchDataQuality(result) → quality
3. searchEvidenceBundle.buildSearchEvidenceItems(result, quality) → evidenceItems
4. searchInsightIntegration.generate(result, quality) → insights
5. searchActionIntegration.generate(result, quality) → actions
6. ptDeckGeneration.generate({
     result, quality, evidenceItems,
     deckType: "ADVERTISER_PROPOSAL",
     audience: "ADVERTISER",
     insights, actions,
     socialInsight: { sentimentSummary, topTopics, riskSignals, faqHighlights },
     competitorGap: { summary, gaps, opportunities }
   })
7. 내부:
   - EvidenceToDocumentMapper → evidenceRefs + sourceRefs
   - PtNarrativeAssembler → narrative (storyline + strategy)
   - PtSlideBlockBuilder.buildAll("ADVERTISER_PROPOSAL", ctx) → 12 slides
   - RoleBasedPtAssembler.assemble(deck, "ADVERTISER") → 필터링
8. → PtDeck (12장 슬라이드 + narrative + evidence)
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **tRPC 라우터**: `ptDeck.generate` 엔드포인트
- [ ] **프론트엔드 PT 생성 UI**: 리스닝 허브에서 "PT 생성" → deckType + audience 선택 → 미리보기
- [ ] **LLM 내러티브**: keyMessage/supportingPoints를 AI 기반 자연어로 고도화
- [ ] **소셜/댓글 데이터 실제 연동**: SocialInsight를 CommentAnalysis/ListeningAnalysis에서 자동 추출
- [ ] **경쟁 분석 데이터 실제 연동**: CompetitorGap을 CompetitorService에서 자동 추출

### 5.2 중기

- [ ] **PPT Export**: PtDeck → .pptx 파일 변환 (pptxgenjs 등)
- [ ] **슬라이드 미리보기**: 실제 장표 레이아웃으로 렌더링
- [ ] **커스텀 템플릿**: 브랜드별 PPT 템플릿 적용
- [ ] **히스토리**: PT 생성 이력 저장/비교
- [ ] **인플루언서 데이터 연동**: CampaignService/InfluencerService와 직접 연결

### 5.3 장기

- [ ] **실시간 PT 업데이트**: 분석 결과 변경 시 PT 자동 갱신
- [ ] **협업 편집**: 생성된 PT의 슬라이드 단위 수정
- [ ] **A/B 테스트**: 다른 전략 방향의 PT를 비교 생성
- [ ] **발표 모드**: 슬라이드를 실제 프레젠테이션으로 진행
