# Vertical Runtime MVP Connection

> 현재 runtime에서 실제로 연결된 vertical template 기능 전체 흐름

## 1. End-to-End 흐름

```
[사용자]
  │
  ├─ /vertical-preview 페이지 진입
  │
  ├─ seedKeyword 입력 (예: "레티놀 세럼")
  │   └─ tRPC: verticalDocument.suggestIndustry → VerticalIndustrySuggester.suggest()
  │       → 4개 업종 스코어 + 추천 업종 + 추천 근거 반환
  │
  ├─ outputType 선택 (WORKDOC / PT_DECK / GENERATED_DOCUMENT)
  │
  ├─ 업종 선택 (추천 수락 또는 수동 선택)
  │
  ├─ "업종 적용" 버튼 클릭
  │   └─ tRPC: verticalDocument.apply (mutation)
  │       1. suggestIndustry → 업종 추론 (선택 없으면 자동)
  │       2. generate → 원본 문서 생성 → vertical 조립
  │       3. 결과를 블록 구조로 분류 (summary/evidence/action/warning/data)
  │       → ApplyResultPanel에서 렌더링
  │
  └─ "4개 업종 비교" 버튼 클릭
      └─ tRPC: verticalDocument.comparisonPreview (query)
          → 4개 업종 동시 생성 → 차이점 매트릭스 반환
```

## 2. 연결된 서비스

| 서비스 | 역할 | 연결 상태 |
|--------|------|-----------|
| VerticalIndustrySuggester | seedKeyword/cluster/category → 업종 추론 | 연결됨 (tRPC suggestIndustry) |
| VerticalDocumentIntegrationService | 업종 추론 → 문서 생성 → vertical 조립 통합 | 연결됨 (tRPC generate, apply) |
| VerticalDocumentAssembler | 8단계 업종별 재조립 파이프라인 | 연결됨 (generate 내부) |
| VerticalTemplateRegistryService | 4개 업종 템플릿 관리 | 연결됨 (listIndustries) |
| VerticalPreviewBuilder | 4개 업종 비교 프리뷰 생성 | 연결됨 (comparisonPreview) |
| WorkReportGenerationService | WORKDOC 원본 생성 | 연결됨 (generate 내부) |
| PtDeckGenerationService | PT_DECK 원본 생성 | 연결됨 (generate 내부) |
| SearchDocumentGenerationService | GEO/AEO 원본 생성 | 연결됨 (generate 내부) |

## 3. 프론트엔드 페이지

- 경로: `/vertical-preview`
- 파일: `apps/web/src/app/(dashboard)/vertical-preview/page.tsx`
- 사이드바: "업종 템플릿" 섹션에 "업종별 프리뷰" 항목 추가

## 4. tRPC 엔드포인트 (verticalDocument 라우터)

| 엔드포인트 | 타입 | 용도 |
|-----------|------|------|
| suggestIndustry | query | 업종 자동 추론 |
| apply | mutation | 업종 적용 → 문서 생성 + 블록 구조화 |
| generate | mutation | 원본 문서 생성 + vertical 조립 |
| comparisonPreview | query | 4개 업종 비교 프리뷰 |
| detailedComparison | query | QA/QC용 상세 비교 |
| listIndustries | query | 지원 업종 목록 |

## 5. 데이터 흐름 상세

### apply 엔드포인트

```
입력:
  seedKeyword, selectedIndustry?, outputType, audience

처리:
  1. suggestIndustry → suggestion (scores, matchedSignals, reasoning)
  2. selectedIndustry ?? suggestion.suggestedIndustry ?? "BEAUTY"
  3. generate(industry, result, quality, evidence, insights, actions, outputType)
     → originalDocument(workDoc|ptDeck|generatedDocument)
     → assembler.assemble(industry, sections, insights, actions)
     → verticalResult(sections, insightMappings, actionMappings, evidencePolicy)
  4. 블록 분류:
     - summaryBlocks: QUICK_SUMMARY, KEY_FINDING
     - evidenceBlocks: EVIDENCE
     - actionBlocks: ACTION
     - warningBlocks: RISK_NOTE
     - dataBlocks: PERSONA, CLUSTER, PATH, ROAD_STAGE, FAQ, COMPARISON

출력:
  selectedIndustry, industryLabel, recommendedIndustry, suggestion,
  summaryBlocks[], evidenceBlocks[], actionBlocks[], warningBlocks[], dataBlocks[],
  allSections[], insightMappings, actionMappings, evidencePolicy,
  additionalWarnings[], metadata, generatedAt
```
