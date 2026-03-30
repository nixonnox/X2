# Vertical Intelligence Enhancement — Implementation Notes

> 이번 단계에서 반영한 코드, 설계 결정, 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 신규 서비스 (4개)

```
packages/api/src/services/vertical-templates/
├── topic-taxonomy-mapping.service.ts         ← TopicTaxonomyMappingService
├── benchmark-baseline.service.ts             ← BenchmarkBaselineService
├── vertical-social-comment-integration.service.ts  ← VerticalSocialCommentIntegrationService
└── vertical-signal-fusion.service.ts         ← VerticalSignalFusionService
```

### 1.2 데이터 채움 (benchmarkBaseline)

```
beauty-template.ts    → benchmarkBaseline 8개 메트릭 추가
fnb-template.ts       → benchmarkBaseline 8개 메트릭 추가
finance-template.ts   → benchmarkBaseline 8개 메트릭 추가
entertainment-template.ts → benchmarkBaseline 8개 메트릭 추가
```

### 1.3 서비스 등록 (services/index.ts)

```
Group 13: Vertical Intelligence Enhancement (stateless)
├── topicTaxonomyMapping: new TopicTaxonomyMappingService()
├── benchmarkBaseline: new BenchmarkBaselineService()
├── verticalSocialCommentIntegration: new VerticalSocialCommentIntegrationService()
└── verticalSignalFusion: new VerticalSignalFusionService()
```

### 1.4 tRPC 엔드포인트 (vertical-document.ts)

```
verticalDocument.signalFusion       — query, 시그널 통합 분석
verticalDocument.benchmarkBaseline  — query, 업종별 벤치마크 기준
verticalDocument.taxonomyMapping    — query, 클러스터 → taxonomy 매핑
```

### 1.5 문서

```
docs/v3/
├── VERTICAL_INTELLIGENCE_ENHANCEMENT_ARCHITECTURE.md
├── TOPIC_TAXONOMY_MAPPING_SPEC.md
├── BENCHMARK_BASELINE_SPEC.md
├── SOCIAL_COMMENT_VERTICAL_INTEGRATION_SPEC.md
└── VERTICAL_INTELLIGENCE_ENHANCEMENT_NOTES.md (이 파일)
```

## 2. 설계 결정

### 2.1 왜 별도 서비스인가?

기존 assembler/integration에 직접 넣지 않고 별도 서비스로 분리한 이유:
- **점진적 연결**: 기존 파이프라인 변경 없이 새 시그널을 추가
- **독립 테스트**: 각 시그널 소스를 독립적으로 검증 가능
- **graceful degradation**: 어떤 시그널이 없어도 나머지로 동작

### 2.2 왜 SignalFusionService가 오케스트레이터인가?

- 3개 시그널 소스의 결과를 하나의 통합된 형태로 제공
- 시그널 품질 메타데이터(RICH/MODERATE/MINIMAL) 제공
- 프론트엔드에서 단일 API 호출로 모든 시그널 결과를 받을 수 있음

### 2.3 벤치마크 기준값의 근거

현재는 업종별 분석 경험에 기반한 초기 기준값.
실 데이터 축적 후 기준값을 업데이트할 수 있는 구조.
서비스 레벨에서 관리하므로 DB/config 전환도 용이.

## 3. 기존 코드와의 관계

| 기존 | 변경 여부 | 비고 |
|------|----------|------|
| VerticalDocumentAssembler | ❌ 변경 없음 | fusion 결과를 입력으로 전달 |
| VerticalDocumentIntegrationService | ❌ 변경 없음 | |
| VerticalIndustrySuggester | ❌ 변경 없음 | |
| beauty/fnb/finance/entertainment-template | ✅ benchmarkBaseline 추가 | |
| services/index.ts | ✅ Group 13 추가 | |
| vertical-document.ts (router) | ✅ 3개 엔드포인트 추가 | |

## 4. 남은 과제

### 4.1 단기

- [ ] signalFusion 결과를 apply 입력에 자동 주입
- [ ] 프론트엔드에서 signalFusion 결과 표시 UI
- [ ] 벤치마크 비교 결과 시각화 (게이지/바 차트)
- [ ] taxonomy 매핑 결과 시각화 (히트맵)

### 4.2 중기

- [ ] 실 데이터 기반 벤치마크 기준값 보정
- [ ] 클러스터 → taxonomy 매핑 정확도 개선 (형태소 분석 추가)
- [ ] 소셜 실시간 스트림 → vertical 파이프라인 자동 연결
- [ ] 업종별 시즌 캘린더와 벤치마크 연동

### 4.3 장기

- [ ] ML 기반 taxonomy 매핑 (현재는 키워드 매칭)
- [ ] 벤치마크 기준값 자동 학습
- [ ] 업종 추가 (FASHION, TECH_SAAS, HEALTHCARE)
- [ ] A/B 비교 모드에서 시그널 차이 하이라이트
