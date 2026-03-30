# Vertical Document Template Architecture

> 업종별 템플릿 엔진 전체 구조 — 같은 데이터라도 업종에 따라 다르게 해석하고 다르게 문서화

## 1. 설계 원칙

1. **공통 엔진 위의 vertical layer**: 별도 시스템이 아니라 workdocs/pt/documents/ 위에 얹는 구조
2. **evidence 없는 업종별 해석 금지**: 근거 없이 업종 맥락을 추가하지 않음
3. **품질 상태 투명성**: confidence/stale/partial 숨기지 않음, 업종별 경고 문구 차별화
4. **mock ≠ 기본값**: mock 데이터를 업종 템플릿 기본값처럼 사용하지 않음
5. **재사용 가능**: PT, 보고서, 실무 문서, GEO 문서 모두에 적용 가능

## 2. 파이프라인

```
공통 문서 생성 (workdocs / pt / documents)
  │
  ├─ WorkReportGenerationService → WorkDoc
  ├─ PtDeckGenerationService → PtDeck
  └─ SearchDocumentGenerationService → GeneratedDocumentOutput
  │
  ▼
Vertical Template Layer
  │
  ├─ VerticalTemplateRegistry
  │   └─ getTemplate(industry) → VerticalTemplate
  │
  ├─ VerticalEvidencePolicyService
  │   └─ applyPolicy(evidence, quality, industry) → 정렬/경고/사용가능여부
  │
  ├─ VerticalInsightMapper
  │   └─ mapInsights(insights, industry) → 업종별 해석 + 관련도 점수
  │
  ├─ VerticalActionMapper
  │   └─ mapActions(actions, industry) → 업종별 프레이밍 + 우선순위 조정
  │
  └─ VerticalDocumentAssembler
      ├─ 블록 필터링 (REQUIRED/EMPHASIZED/OPTIONAL/HIDDEN)
      ├─ 제목/oneLiner 오버라이드
      ├─ 문장 톤 정책 적용 (금지 패턴 감지)
      ├─ 리스크 노트 삽입
      └─ → VerticalAssemblyResult
```

## 3. 서비스 구조

```
packages/api/src/services/vertical-templates/
├── types.ts                         # VerticalTemplate, VerticalDocumentProfile 등 타입
├── beauty-template.ts               # 뷰티 업종 템플릿 + 프로파일
├── fnb-template.ts                  # F&B 업종 템플릿 + 프로파일
├── finance-template.ts              # 금융 업종 템플릿 + 프로파일
├── entertainment-template.ts        # 엔터 업종 템플릿 + 프로파일
├── vertical-template-registry.ts    # 템플릿 등록/조회 레지스트리
├── vertical-document-assembler.ts   # 업종별 문서 재조립
├── vertical-insight-mapper.ts       # 업종별 인사이트 해석 변환
├── vertical-action-mapper.ts        # 업종별 액션 프레이밍 변환
├── vertical-evidence-policy.ts      # 업종별 근거 정책
└── index.ts                         # Barrel export
```

## 4. 서비스별 상세

### 4.1 VerticalTemplateRegistryService

| 항목 | 내용 |
|------|------|
| 역할 | 업종 템플릿 등록/조회 진입점 |
| 메서드 | getTemplate(), getProfile(), listIndustries(), supportsOutput() |
| 등록 업종 | BEAUTY, FNB, FINANCE, ENTERTAINMENT |
| Stateless | repository 의존 없음 |

### 4.2 VerticalDocumentAssembler

| 항목 | 내용 |
|------|------|
| 입력 | industry + sections[] + evidenceRefs[] + quality + insights[] + actions[] |
| 출력 | VerticalAssemblyResult (sections + insightMappings + actionMappings + evidencePolicy + warnings) |
| 처리 | 블록 필터/정렬 → 제목 오버라이드 → 문장 톤 검증 → 리스크 삽입 → 순서 재정렬 |
| 핵심 | 공통 섹션을 업종별로 재조립 (새 블록 생성 아님) |

### 4.3 VerticalInsightMapper

| 항목 | 내용 |
|------|------|
| 입력 | InsightItem[] + IndustryType |
| 출력 | VerticalInsightMapping[] (원본 + 업종해석 + 관련도 + 프레이밍) |
| 관련도 | 우선유형 매칭(+0.3) + 키워드 매칭(+0.2/hit, max 0.4) + evidence(+0.2) |
| 핵심 원칙 | evidence 없으면 원본 유지 (업종 해석 추가 안 함) |

### 4.4 VerticalActionMapper

| 항목 | 내용 |
|------|------|
| 입력 | ActionItem[] + IndustryType |
| 출력 | VerticalActionMapping[] (원본 + 업종액션 + 조정된우선순위 + 담당자 + 프레이밍) |
| 톤 스타일 | CONSERVATIVE(금융), DIRECTIVE(F&B/엔터), SUGGESTIVE(뷰티) |
| 우선순위 | 업종 우선 액션이면 한 단계 올림, 금융 컴플라이언스는 항상 HIGH |

### 4.5 VerticalEvidencePolicyService

| 항목 | 내용 |
|------|------|
| 입력 | EvidenceRef[] + QualityMeta + IndustryType |
| 출력 | EvidencePolicyResult (정렬된 evidence + 경고 + 사용가능여부 + 신뢰도충족여부) |
| 금융 특수 | stale 불허, 신뢰도 기준 60%, 경고 "경고" 레벨 |
| 엔터 특수 | stale 불허 (타이밍 민감), 신뢰도 기준 35% |
| 뷰티/F&B | stale 허용 (경고 표시), 신뢰도 기준 40% |

## 5. 적용 계층

| 출력 유형 | 적용 방식 |
|----------|----------|
| 실무 문서 (workdocs) | WorkDoc.sections → VerticalDocumentAssembler.assemble() → 재조립된 sections |
| PT (pt) | PtDeck.slides → VerticalAssemblyResult의 블록 구성/경고 반영 |
| 보고서 (documents) | GeneratedDocumentOutput → vertical evidence/insight/action 매핑 적용 |
| GEO/AEO | DocumentBlock → vertical evidence 정책 + 리스크 노트 |
| Executive | vertical 필터링 후 EXECUTIVE audience 필터링 적용 |
| 이슈/FAQ | FAQ/COMPARISON 블록 강조도 업종별 차이 반영 |

## 6. 기존 서비스와의 관계

```
기존 (변경 없음)                          신규 (vertical layer)
─────────────────                      ─────────────────────
workdocs/WorkReportGenerationService ─→ VerticalDocumentAssembler
pt/PtDeckGenerationService          ─→ VerticalInsightMapper
documents/SearchDocumentGeneration  ─→ VerticalActionMapper
                                       VerticalEvidencePolicyService
                                       VerticalTemplateRegistryService
```

기존 서비스는 전혀 수정하지 않음. Vertical layer는 기존 출력 위에 후처리로 적용.
