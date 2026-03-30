# Search Intelligence → Insight/Report Integration Architecture

> 검색 인텔리전스 결과가 Insight, Action, Evidence Bundle, Report 파이프라인에 통합되는 전체 구조

## 1. 전체 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│ Search Intelligence (apps/web)                              │
│ runSearchIntelligence() → SearchIntelligenceResult          │
│ ├─ cluster: ClusterFinderResult + trace                     │
│ ├─ persona: PersonaViewResult + trace                       │
│ ├─ pathfinder: PathfinderResult + trace                     │
│ └─ roadview: RoadViewResult + trace                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ JSON 전달
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Quality Assessment                                     │
│ assessSearchDataQuality(result) → SearchDataQualityAssessment│
│ ├─ level: HIGH | MEDIUM | LOW | INSUFFICIENT                │
│ ├─ isMockOnly: boolean                                      │
│ ├─ usableForReport: boolean                                 │
│ └─ usableForInsight: boolean                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┬────────────┐
          ▼            ▼            ▼            ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│SearchInsight ││SearchAction  ││SearchEvidence││SearchReport  │
│Integration   ││Integration   ││Bundle        ││Section       │
│Service       ││Service       ││Service       ││Builder       │
│              ││              ││              ││              │
│→GeneratedIn- ││→Recommended- ││→EvidenceBundle││→SearchReport│
│  sight[]     ││  Action[]    ││  Item[]      ││  Section[]   │
└──────┬───────┘└──────┬───────┘└──────┬───────┘└──────┬───────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 7 파이프라인 (기존)                                    │
│ InsightGenerationService ← 8번째 collector                   │
│ ActionRecommendationOrchestrator ← 8번째 signal              │
│ EvidenceBundleService ← SEARCH_INTELLIGENCE 번들             │
│ ReportCompositionService ← 5개 검색 섹션 타입                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ SearchExecutiveSummaryService                               │
│ → KPI, 전략적 시사점, 위험 요인, 성장 기회                    │
│ → ExecutiveSummaryService에 합류                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. 품질 정책

| 품질 등급 | Insight | Action | Evidence | Report | Executive |
|-----------|---------|--------|----------|--------|-----------|
| HIGH | ✅ 1등급 | ✅ 전체 | ✅ 전체 | ✅ 전체 | ✅ 전체 |
| MEDIUM | ✅ 사용 | ✅ 사용 | ✅ 경고 표시 | ✅ 경고 표시 | ✅ 경고 표시 |
| LOW | ⚠️ 보조 | ⚠️ 검증 필요 | ⚠️ 제한적 | ❌ 제외 | ⚠️ 경고 |
| INSUFFICIENT | ❌ 차단 | ❌ 차단 | ❌ 차단 | ❌ 차단 | ❌ 차단 |

### Mock 데이터 정책

- `isMockOnly === true` 시: 모든 인사이트에 `[Mock 데이터]` 접두
- 액션에 `[검증 필요]` 접두
- Report에서는 경고 배너 표시
- Executive Summary에 `(테스트 데이터 기반)` 명시

## 3. Role-based Output

| 역할 | 섹션 수 | 내러티브 | Trace | Raw Data | Warnings |
|------|---------|---------|-------|----------|----------|
| PRACTITIONER | 전체 | 기술적 | ✅ | ✅ | ✅ |
| MARKETER | 6개 | 실행 중심 | ❌ | ❌ | ✅ |
| ADMIN | 8개 | 실행 중심 | ✅ | ❌ | ✅ |
| EXECUTIVE | 4개 | 전략적 | ❌ | ❌ | ❌ |

## 4. 서비스 위치

```
packages/api/src/services/search-intelligence/
├── index.ts                                    # Barrel export
├── types.ts                                    # 통합 타입 정의
├── search-data-quality.ts                      # 품질 평가 함수
├── search-insight-integration.service.ts       # Insight collector
├── search-action-integration.service.ts        # Action collector
├── search-evidence-bundle.service.ts           # Evidence 빌더
├── search-report-section-builder.ts            # Report 섹션 빌더
└── search-executive-summary.service.ts         # 경영진 요약
```

## 5. 등록 위치

`packages/api/src/services/index.ts` → `createServices()`:
- `searchInsightIntegration`
- `searchActionIntegration`
- `searchEvidenceBundle`
- `searchReportSectionBuilder`
- `searchExecutiveSummary`

## 6. Insight 추출 매핑

| 엔진 | 인사이트 카테고리 | 설명 |
|------|------------------|------|
| Cluster | KEY_FINDING | 의도 클러스터 분포 및 집중도 |
| Pathfinder | KEY_FINDING | 검색 여정 그래프 크기 |
| Pathfinder | OPPORTUNITY | 허브 키워드 발견 |
| RoadView | KEY_FINDING | 여정 스테이지 분석 |
| RoadView | OPPORTUNITY | 콘텐츠 갭 스테이지 |
| Persona | KEY_FINDING | 페르소나 식별 |
| Cross-engine | KEY_FINDING | 종합 분석 완료 |
| Stale data | RISK | 데이터 갱신 필요 |

## 7. Action 추출 매핑

| 엔진 | 액션 카테고리 | 우선순위 |
|------|-------------|---------|
| Cluster (≥3) | CONTENT_CREATION | HIGH/MEDIUM |
| Pathfinder hub | SEO_OPTIMIZATION | HIGH/MEDIUM |
| Pathfinder paths | CONTENT_CREATION | MEDIUM |
| RoadView gap | CONTENT_CREATION | HIGH/MEDIUM |
| Persona (≥2) | CONTENT_OPTIMIZATION | MEDIUM |

## 8. Evidence Bundle 항목

| 카테고리 | 표시 타입 | 데이터 |
|---------|----------|--------|
| search_intelligence_quality | KPI_CARD | 품질 지표 |
| search_cluster_distribution | PIE_CHART | 클러스터 분포 |
| search_cluster_detail | TABLE | 클러스터 상세 |
| search_pathfinder_graph | TABLE | 노드/경로 목록 |
| search_roadview_stages | BAR_CHART | 스테이지별 키워드 |
| search_persona_profiles | TABLE | 페르소나 목록 |
| search_source_summary | TABLE | 소스 현황 |
| search_quality_warnings | QUOTE_LIST | 품질 경고 |
