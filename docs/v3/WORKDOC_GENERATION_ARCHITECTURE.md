# WorkDoc Generation Architecture

> Search Intelligence 결과가 실무형 복붙/정리/보고 문서로 변환되는 전체 구조

## 1. 파이프라인

```
Search Intelligence Result
  │ + Insight (SearchInsightIntegrationService)
  │ + Action (SearchActionIntegrationService)
  │ + Evidence (SearchEvidenceBundleService)
  │
  ├─ Quality Gate
  │   └─ INSUFFICIENT → 빈 문서 (즉시 반환)
  │
  ├─ EvidenceToWorkDocMapper
  │   ├─ mapToEvidenceRefs() → EvidenceRef[]
  │   ├─ mapToSourceRefs() → SourceRef[]
  │   └─ mapQuality() → WorkDocQualityMeta
  │
  ├─ QuickSummaryBuilder
  │   ├─ buildOneLiner() → 한 줄 요약
  │   └─ buildParagraph() → 한 문단 요약
  │
  ├─ WorkDocSectionBuilder (WORKDOC_SECTION_MAP에 따라 섹션 구성)
  │   └─ buildSection() × N → WorkDocSection[]
  │       └─ ReportSentenceBuilder → tone별 문장 변환
  │
  └─ RoleBasedWorkDocAssembler
      └─ WorkDoc (audience별 필터링 완료)
```

## 2. 서비스 구조

```
packages/api/src/services/workdocs/
├── types.ts                           # WorkDoc, WorkDocSection, WorkDocSentenceBlock 등 타입
├── work-report-generation.service.ts  # 오케스트레이터 (메인 진입점)
├── quick-summary-builder.ts           # 한 줄/한 문단 요약 빌더
├── evidence-to-workdoc-mapper.ts      # evidence → 실무 문서용 ref 변환
├── report-sentence-builder.ts         # 4종 톤별 문장 변환기
├── workdoc-section-builder.ts         # 7종 블록 유형별 섹션 빌더
├── role-based-workdoc-assembler.ts    # audience별 필터링·재조립
└── index.ts                           # Barrel export
```

## 3. 서비스별 상세

### 3.1 WorkReportGenerationService (오케스트레이터)

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + Quality + EvidenceItems + DocType + Audience + Insights + Actions + Tone |
| 사용 서비스 | EvidenceToWorkDocMapper, QuickSummaryBuilder, WorkDocSectionBuilder, RoleBasedWorkDocAssembler |
| 출력 | WorkDoc |
| Quality Gate | INSUFFICIENT → 빈 문서 반환 |
| Tone | audience 기본 톤 또는 오버라이드 |

### 3.2 QuickSummaryBuilder

| 항목 | 내용 |
|------|------|
| 입력 | SearchResult + QualityAssessment |
| 출력 | 한 줄 요약 (string) / 한 문단 요약 (string) |
| 한 줄 | "'프로틴 음료' 검색 분석: 5개 관심 영역, 3개 고객 유형, 2개 콘텐츠 공백 발견" |
| 한 문단 | 분석 개요 + 클러스터 + 페르소나 + 콘텐츠 공백 + 허브 키워드 + 품질 경고 |
| 품질 | isMockOnly → "[검증 필요]", stale → "[주의]" |

### 3.3 ReportSentenceBuilder

| 항목 | 내용 |
|------|------|
| 입력 | content + metric + evidenceRef + quality |
| 출력 | WorkDocSentenceBlock (문장 + 톤 + 근거 + 품질) |
| REPORT | "~로 분석됩니다." |
| MESSENGER | "~입니다. 확인 부탁드립니다." |
| MEETING_BULLET | "• ~" |
| FORMAL | "~한 것으로 분석되었습니다." |

### 3.4 WorkDocSectionBuilder

| 항목 | 내용 |
|------|------|
| 입력 | SectionContext (SearchResult + Quality + Evidence + Insight + Action + Tone) |
| 출력 | WorkDocSection (개별 섹션) |
| 7종 블록 | QUICK_SUMMARY, KEY_FINDING, EVIDENCE, ACTION, RISK_NOTE, FAQ, COMPARISON |
| Evidence-gated | KEY_FINDING, EVIDENCE, FAQ, COMPARISON → 데이터 없으면 null |

### 3.5 RoleBasedWorkDocAssembler

| 항목 | 내용 |
|------|------|
| 입력 | WorkDoc + WorkDocAudience |
| 출력 | WorkDoc (필터링 완료) |
| PRACTITIONER | 전체 섹션, 전체 근거, 품질 경고 표시 |
| TEAM_LEAD | 6종 블록, 근거 snippet만, 품질 경고 유지 |
| EXECUTIVE | 3종 블록 (요약+발견+액션), 경고 제거 |
| OPS_MANAGER | 전체 섹션, 전체 근거, 실행 항목 강조 |

### 3.6 EvidenceToWorkDocMapper

| 항목 | 내용 |
|------|------|
| 입력 | EvidenceBundleItem[] + SourceInfo[] + QualityAssessment |
| 출력 | EvidenceRef[] + SourceRef[] + WorkDocQualityMeta |
| toSnippetSummary | snippet → 200자 이내 복붙 가능 요약 |

## 4. 문서 유형별 섹션 구성

| Doc Type | 섹션 구성 |
|----------|----------|
| WEEKLY_REPORT | QUICK_SUMMARY → KEY_FINDING → COMPARISON → ACTION → RISK_NOTE → EVIDENCE |
| MONTHLY_REPORT | QUICK_SUMMARY → KEY_FINDING → COMPARISON → FAQ → ACTION → RISK_NOTE → EVIDENCE |
| SI_SUMMARY | QUICK_SUMMARY → KEY_FINDING → COMPARISON → ACTION → EVIDENCE |
| COMMENT_ISSUE_REPORT | QUICK_SUMMARY → KEY_FINDING → FAQ → RISK_NOTE → ACTION → EVIDENCE |
| MEETING_MATERIAL | QUICK_SUMMARY → KEY_FINDING → ACTION |
| DECISION_MEMO | QUICK_SUMMARY → KEY_FINDING → COMPARISON → ACTION → EVIDENCE |
| EVIDENCE_BUNDLE_DOC | QUICK_SUMMARY → EVIDENCE → COMPARISON → FAQ |
| GEO_AEO_OPS_MEMO | QUICK_SUMMARY → KEY_FINDING → FAQ → ACTION → EVIDENCE |

## 5. 기존 서비스와의 차이

| 항목 | documents/ | pt/ | workdocs/ |
|------|-----------|-----|-----------|
| 목적 | GEO/AEO + 보고서 | 광고주 설득 PT | 실무 복붙/정리/보고 |
| 대상 | 분석가/마케터 | 광고주/경영진 | 일반 직장인/실무자 |
| 핵심 구조 | DocumentBlock | PtSlideBlock + keyMessage | WorkDocSection + 문장 복붙 |
| 톤 | technical/actionable | persuasive/analytical | 4종 (report/messenger/bullet/formal) |
| 요약 | section별 summary | narrative + storyline | quickSummary (한 줄/한 문단) |
| 역할 | PRACTITIONER/MARKETER/ADMIN/EXECUTIVE | ADVERTISER/EXECUTIVE/INTERNAL/MARKETER | PRACTITIONER/TEAM_LEAD/EXECUTIVE/OPS_MANAGER |
| 시각화 | displayType | recommendedVisualType (14종) | 없음 (텍스트 중심) |
