# Search Document Generation Architecture

> Search Intelligence 결과가 GEO/AEO 문서, PT/제안서, 실무 보고서로 변환되는 전체 구조

## 1. 파이프라인

```
Search Intelligence Result
  │
  ├─ assessSearchDataQuality()
  │   └─ INSUFFICIENT → 빈 출력 (즉시 반환)
  │
  ├─ SearchEvidenceBundleService.buildSearchEvidenceItems()
  │   └─ EvidenceBundleItem[] (8종: quality, cluster×2, pathfinder, roadview, persona, source, warnings)
  │
  ├─ EvidenceToDocumentMapper
  │   ├─ mapToEvidenceRefs()   → EvidenceRef[] (모든 블록의 근거)
  │   ├─ mapToSourceRefs()     → SourceRef[] (모든 블록의 출처)
  │   └─ mapQuality()          → DocumentQualityMeta
  │
  ├─ GeoAeoDocumentBlockBuilder
  │   └─ DocumentBlock[] (FAQ, Summary, Comparison, Stage, Persona, Evidence, Action)
  │
  ├─ SearchPtSectionBuilder
  │   └─ PtSlideBlock[] (Title, Background, Intent, Journey, Persona, Cluster, Opportunity, Action, Evidence, GEO/AEO)
  │
  ├─ SearchReportOutputBuilder
  │   └─ ReportOutputSection[] (보고서 유형별 섹션 조합)
  │
  └─ RoleBasedDocumentAssembler
      └─ GeneratedDocumentOutput (역할에 맞게 필터링·조립된 최종 출력)
```

## 2. 서비스 구조

```
packages/api/src/services/documents/
├── types.ts                                # 공통 타입: DocumentBlock, ReportOutputSection, PtSlideBlock
├── evidence-to-document-mapper.ts          # Evidence → 문서용 레퍼런스 매퍼
├── geo-aeo-document-block-builder.ts       # GEO/AEO 최적화 문서 블록 빌더 (7종)
├── search-pt-section-builder.ts            # PT/제안서 슬라이드 빌더 (10종)
├── search-report-output-builder.ts         # 보고서 섹션 빌더 (6종 보고서 × 11종 섹션)
├── role-based-document-assembler.ts        # 역할별 필터링·조립
├── search-document-generation.service.ts   # 오케스트레이터 (메인 진입점)
└── index.ts                                # Barrel export
```

## 3. 서비스별 상세

### 3.1 SearchDocumentGenerationService (오케스트레이터)

| 항목 | 내용 |
|------|------|
| 입력 | SearchIntelligenceResult + QualityAssessment + EvidenceBundleItem[] + Role + UseCase |
| 사용 서비스 | EvidenceToDocumentMapper, GeoAeoDocumentBlockBuilder, SearchPtSectionBuilder, SearchReportOutputBuilder, RoleBasedDocumentAssembler |
| 출력 | GeneratedDocumentOutput |
| Evidence 연결 | EvidenceToDocumentMapper가 모든 블록의 evidenceRefs/sourceRefs를 생성 |
| Confidence 처리 | INSUFFICIENT → 빈 출력, isMockOnly → "[검증 필요]" 접두 |
| Failure 포인트 | quality gate, 개별 빌더 실패 시 해당 블록만 스킵 |

### 3.2 GeoAeoDocumentBlockBuilder

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + QualityAssessment + EvidenceRef[] + SourceRef[] |
| 출력 | DocumentBlock[] (최대 7종) |
| Evidence 연결 | 각 블록에 관련 카테고리의 evidenceRefs 필터링하여 삽입 |
| GEO 최적화 | geoOptimized=true, schemaHint (FAQPage, Article, HowTo, Table) |
| Mock 처리 | body에 "[검증 필요]" 접두 |

### 3.3 SearchPtSectionBuilder

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + QualityAssessment + EvidenceRef[] + SourceRef[] |
| 출력 | PtSlideBlock[] (최대 10종) |
| Evidence 연결 | 각 슬라이드에 관련 evidenceRefs 삽입 |
| 시각화 힌트 | visualHint (chart_bar, chart_pie, flow_diagram, persona_card, table) |
| Quality 처리 | speakerNote에 경고 표기 |

### 3.4 SearchReportOutputBuilder

| 항목 | 내용 |
|------|------|
| 입력 | ReportOutputType + SearchResult + Quality + EvidenceRef[] + SourceRef[] |
| 출력 | ReportOutputSection[] |
| 보고서 유형 | 6종 (WEEKLY_LISTENING, MONTHLY, EXECUTIVE, ISSUE_FAQ, CAMPAIGN, GEO_AEO_MEMO) |
| 섹션 매핑 | 보고서 유형별 포함 섹션이 다름 (REPORT_SECTION_MAP) |
| GEO 연동 | GEO_AEO_IMPLICATIONS 섹션에서 citation-ready 소스 수 표시 |

### 3.5 RoleBasedDocumentAssembler

| 항목 | 내용 |
|------|------|
| 입력 | 전체 블록/섹션/슬라이드 + Role + UseCase |
| 출력 | GeneratedDocumentOutput (필터링 완료) |
| PRACTITIONER | 전체 포함, 기술 상세, raw evidence |
| MARKETER | 액션 중심, quality note 제외 |
| EXECUTIVE | 요약/전략만, warning 제거, 최소 블록 |
| ADMIN | 전체 + quality 경고 강조 |

### 3.6 EvidenceToDocumentMapper

| 항목 | 내용 |
|------|------|
| 입력 | EvidenceBundleItem[] + SourceInfo[] + QualityAssessment |
| 출력 | EvidenceRef[] + SourceRef[] + DocumentQualityMeta |
| 역추적 | evidenceId → category → dataSourceType → entityIds |
| Citation | citationReady 플래그로 GEO/AEO용 소스 필터링 |

## 4. UseCase별 출력 구성

| UseCase | GEO 블록 | PT 슬라이드 | 보고서 섹션 |
|---------|----------|------------|-----------|
| GEO_AEO_DOCUMENT | ✅ 7종 | ❌ | ❌ |
| PT_PROPOSAL | ❌ | ✅ 10종 | ❌ |
| WEEKLY_REPORT | ❌ | ❌ | ✅ 6섹션 |
| MONTHLY_REPORT | ✅ | ❌ | ✅ 11섹션 |
| EXECUTIVE_BRIEF | ❌ | ✅ | ✅ 3섹션 |
| CAMPAIGN_BRIEF | ❌ | ✅ | ✅ 6섹션 |
| FAQ_REPORT | ✅ | ❌ | ✅ 4섹션 |
| OPTIMIZATION_MEMO | ✅ | ❌ | ✅ 6섹션 |

## 5. Evidence/Source 추적 흐름

```
SearchIntelligenceResult.trace.analysisId
  │
  ├─ SearchEvidenceBundleService
  │   └─ EvidenceBundleItem { category, entityIds, dataSourceType }
  │
  ├─ EvidenceToDocumentMapper.mapToEvidenceRefs()
  │   └─ EvidenceRef { evidenceId, category, snippet, entityIds }
  │
  ├─ DocumentBlock.evidenceRefs[]  ← 각 블록이 어떤 근거에서 나왔는지
  ├─ PtSlideBlock.evidenceRefs[]   ← 각 슬라이드의 근거
  └─ ReportOutputSection.blocks[].evidenceRefs[]  ← 보고서 섹션의 근거

역추적 경로:
문서 문장 → evidenceRef.evidenceId → category + entityIds → 원본 데이터
```

## 6. Confidence / Stale / Partial 처리

| 상태 | 처리 |
|------|------|
| INSUFFICIENT | 빈 출력 반환 (문서 생성 안함) |
| isMockOnly | 모든 body에 "[검증 필요]" 접두, 모든 quality에 isMockOnly=true |
| stale | quality.freshness="stale", speakerNote에 경고, body에 "(데이터 갱신 필요)" |
| partial | quality.isPartial=true, 실패 엔진 블록 자동 스킵 |
| low confidence (<30%) | quality.confidence < 0.3, speakerNote에 경고, body에 신뢰도 표기 |

## 7. 기존 서비스 연결

| 기존 서비스 | 연결 방식 |
|------------|----------|
| SearchEvidenceBundleService | evidence 입력 제공 |
| assessSearchDataQuality() | quality gate |
| SearchInsightIntegrationService | insightIds 참조 (향후) |
| SearchActionIntegrationService | actionIds 참조 (향후) |
| GeoAeoService | citation/source 정보 연결 (향후) |
| ReportService | GeneratedDocumentOutput → InsightReport 변환 (향후) |
