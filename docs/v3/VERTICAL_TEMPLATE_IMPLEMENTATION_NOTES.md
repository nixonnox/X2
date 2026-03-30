# Vertical Template Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 업종별 템플릿 엔진 서비스 (신규 생성: 10개 파일)

```
packages/api/src/services/vertical-templates/
├── types.ts                         # IndustryType, VerticalTemplate, VerticalDocumentProfile 등 25+ 타입
├── beauty-template.ts               # BEAUTY_TEMPLATE + BEAUTY_PROFILE
├── fnb-template.ts                  # FNB_TEMPLATE + FNB_PROFILE
├── finance-template.ts              # FINANCE_TEMPLATE + FINANCE_PROFILE
├── entertainment-template.ts        # ENTERTAINMENT_TEMPLATE + ENTERTAINMENT_PROFILE
├── vertical-template-registry.ts    # VerticalTemplateRegistryService (등록/조회)
├── vertical-document-assembler.ts   # VerticalDocumentAssembler (블록 재조립)
├── vertical-insight-mapper.ts       # VerticalInsightMapper (인사이트 해석 변환)
├── vertical-action-mapper.ts        # VerticalActionMapper (액션 프레이밍 변환)
├── vertical-evidence-policy.ts      # VerticalEvidencePolicyService (근거 정책)
└── index.ts                         # Barrel export
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 추가:
- import: 5개 서비스 (Registry, Assembler, InsightMapper, ActionMapper, EvidencePolicy)
- re-export: IndustryType, VerticalTemplate, VerticalDocumentProfile, VerticalInsightMapping, VerticalActionMapping, VerticalAssemblyInput, VerticalAssemblyResult, EvidencePolicyResult
- factory: Group 11로 5개 서비스 인스턴스 등록 (모두 stateless)

### 1.3 생성된 문서 (4개)

```
docs/v3/
├── VERTICAL_DOCUMENT_TEMPLATE_ARCHITECTURE.md
├── BEAUTY_FNB_FINANCE_ENT_TEMPLATE_SPEC.md
├── VERTICAL_EVIDENCE_AND_ACTION_POLICY.md
└── VERTICAL_TEMPLATE_IMPLEMENTATION_NOTES.md (이 파일)
```

## 2. 설계 결정

### 2.1 공통 엔진 위의 Vertical Layer

- 기존 workdocs/pt/documents/ 서비스를 전혀 수정하지 않음
- Vertical layer는 기존 출력 위에 후처리로 적용
- 이유: 기존 문서 생성 파이프라인의 안정성 보장, 업종 템플릿은 선택적 적용

### 2.2 VerticalTemplate 구조

하나의 VerticalTemplate에 모든 정책을 포함:
- blockConfigs: 블록별 강조/숨김/제목오버라이드
- toneGuideline: 금지/권장 패턴, 불확실성 처리
- insightPriority: 우선 인사이트 유형, 해석 키워드, 프레이밍 템플릿
- evidencePolicy: 우선 카테고리, 신뢰도 기준, stale/mock/partial 경고
- actionPolicy: 우선 액션 유형, 톤 스타일, 기본 담당자
- riskPolicy: 리스크 강도, 추가 체크, 규제 주의

이유: 업종 간 차이를 한 눈에 비교 가능, 새 업종 추가 시 하나의 파일만 작성

### 2.3 Evidence 없는 업종별 해석 금지

- VerticalInsightMapper.buildInterpretation()에서 evidence 없으면 원본 유지
- 이유: 근거 없이 "뷰티 관점에서~" 등을 추가하면 허위 해석

### 2.4 금융 특수 처리

- stale 데이터 불허 (allowStaleData: false)
- 신뢰도 기준 60% (다른 업종 40%)
- 경고 레벨 "경고" (다른 업종 "주의"/"참고")
- 액션 톤 CONSERVATIVE ("~을 검토하시기 바랍니다")
- 리스크 STRICT (모든 불확실 문장에 경고)
- low confidence prefix "[주의: 데이터 불충분]" (강한 표현)
- 이유: 금융 정보의 부정확성은 법적/규제 리스크로 직결

### 2.5 엔터 특수 처리

- stale 데이터 불허 (타이밍 민감)
- 신뢰도 기준 35% (속도 우선, 가장 낮음)
- PATH(확산 경로) 블록 EMPHASIZED
- PERSONA보다 CLUSTER(팬 반응 영역) 강조
- 이유: 엔터 이슈는 수시간 내에 유효성이 바뀜

### 2.6 인사이트 관련도 점수 (verticalRelevance)

점수 계산:
- 기본: 0.1
- 우선 인사이트 유형 매칭: +0.3
- 업종 키워드 매칭: +0.2/hit (max 0.4)
- evidence 존재: +0.2
- 최대: 1.0

이유: 업종별로 어떤 인사이트가 더 중요한지 정량적으로 판단

### 2.7 액션 우선순위 자동 조정

- 업종 우선 액션이면 한 단계 승격 (LOW→MEDIUM, MEDIUM→HIGH)
- 금융 컴플라이언스 관련 → 항상 HIGH
- 엔터 타이밍 관련 → 항상 HIGH
- 이유: 업종별로 "긴급한 액션"의 기준이 다름

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| workdocs/WorkReportGenerationService | 유지됨 — vertical layer는 출력 후 적용 |
| pt/PtDeckGenerationService | 유지됨 — vertical layer는 출력 후 적용 |
| documents/SearchDocumentGenerationService | 유지됨 — vertical layer는 출력 후 적용 |
| 기존 evidence/insight/action 서비스 | 유지됨 — vertical은 입력으로만 사용 |
| 기존 서비스 팩토리 | 유지됨 — Group 11 추가만 |

## 4. 실제 흐름 예시

### 뷰티 업종 주간 보고서 생성

```
1. SearchIntelligenceResult 수신
2. assessSearchDataQuality(result) → quality
3. searchEvidenceBundle.buildSearchEvidenceItems(result, quality) → evidenceItems
4. searchInsightIntegration.generate(result, quality) → insights
5. searchActionIntegration.generate(result, quality) → actions
6. workReportGeneration.generate({
     result, quality, evidenceItems,
     docType: "WEEKLY_REPORT",
     audience: "TEAM_LEAD",
     insights, actions,
     tone: "REPORT"
   }) → workDoc
7. verticalDocumentAssembler.assemble({
     industry: "BEAUTY",
     sections: workDoc.sections,
     evidenceRefs: workDoc.allEvidenceRefs,
     quality: workDoc.quality,
     insights, actions
   }) → verticalResult
8. 결과:
   - KEY_FINDING 제목 → "핵심 발견: 성분/효능/피부 고민"
   - FAQ → "자주 묻는 성분/효능 질문" (EMPHASIZED)
   - COMPARISON → "제품/성분 비교" (EMPHASIZED)
   - 인사이트 → 성분/피부 관련 관련도 높은 것이 상위
   - 액션 → "~을 권장합니다" (SUGGESTIVE)
   - 경고 → 화장품 광고 규제 주의
```

### 금융 업종 PT 생성

```
1. (공통 단계 1-5 동일)
6. ptDeckGeneration.generate({
     result, quality, evidenceItems,
     deckType: "ADVERTISER_PROPOSAL",
     audience: "ADVERTISER",
     insights, actions
   }) → ptDeck
7. verticalEvidencePolicy.applyPolicy(
     ptDeck.allEvidenceRefs,
     ptDeck.quality,
     "FINANCE"
   ) → evidenceResult
   - stale → 강력 경고 + 불허
   - 신뢰도 < 60% → 미달 경고
   - mock → "금융 문서에서 샘플 데이터를 근거로 사용하면 안 됩니다"
8. verticalInsightMapper.mapInsights(insights, "FINANCE")
   - 금리/조건 관련 인사이트 최상위
   - evidence 없는 인사이트는 원본 유지
9. verticalActionMapper.mapActions(actions, "FINANCE")
   - 모든 액션 "~을 검토하시기 바랍니다" (CONSERVATIVE)
   - 규제/컴플라이언스 → 항상 HIGH
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **tRPC 라우터**: `verticalTemplate.apply` 엔드포인트
- [ ] **프론트엔드 UI**: 문서 생성 시 업종 선택 드롭다운
- [ ] **업종별 topicTaxonomy 활용**: cluster 매핑 시 업종 분류 체계 적용
- [ ] **업종별 벤치마크 기준**: VerticalDocumentProfile.benchmarkBaseline 실제 데이터 채움
- [ ] **소셜/댓글 데이터 연동**: 엔터 템플릿의 팬 반응 데이터 실제 주입

### 5.2 중기

- [ ] **업종 자동 감지**: seedKeyword에서 업종 자동 추론
- [ ] **커스텀 업종 추가**: FASHION, TECH_SAAS 등 추가 업종
- [ ] **업종별 경쟁사 프리셋**: VerticalDocumentProfile에 경쟁사 자동 설정
- [ ] **업종별 시즌 캘린더**: 뷰티(봄/여름), F&B(시즌메뉴), 엔터(컴백/시상식)
- [ ] **업종별 문서 미리보기**: 같은 데이터를 4개 업종으로 동시 미리보기

### 5.3 장기

- [ ] **업종별 LLM 톤 최적화**: AI 기반 문장 톤 자동 조정
- [ ] **업종별 콘텐츠 라이브러리**: 업종별 FAQ/비교표 템플릿 사전
- [ ] **크로스 업종 분석**: 같은 키워드를 여러 업종 관점에서 분석
- [ ] **업종별 대시보드**: 업종별 인사이트 트렌드 시각화
