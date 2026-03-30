# GEO/AEO Document Block Spec

> AI 인용에 유리한 구조화 문서 블록 7종의 상세 사양

## 1. 블록 유형 목록

| # | Type | 용도 | Schema Hint | GEO 최적화 |
|---|------|------|-------------|-----------|
| 1 | FAQ | 질문-답변형 (AI Overview 인용 대상) | FAQPage | ✅ |
| 2 | SUMMARY | 전체 분석 요약 (첫 문단 핵심 정보) | Article | ✅ |
| 3 | COMPARISON_TABLE | 클러스터 간 비교 (구조화 데이터) | Table | ✅ |
| 4 | INTENT_STAGE_EXPLANATION | 여정 단계 설명 (정의형) | HowTo | ✅ |
| 5 | PERSONA_INSIGHT | 검색자 유형 분석 (타겟 전략) | — | ✅ |
| 6 | KEY_EVIDENCE | 근거 요약 (출처 역추적) | — | — |
| 7 | RECOMMENDED_ACTION | GEO 최적화 액션 | — | ✅ |

## 2. 공통 블록 구조 (DocumentBlock)

```typescript
{
  id: string;                    // 고유 ID
  type: DocumentBlockType;       // FAQ | SUMMARY | COMPARISON_TABLE | ...
  title: string;                 // 블록 제목
  purpose: string;               // 이 블록의 목적 설명
  body: string;                  // 본문 (마크다운 형식)
  structuredData?: Record;       // 구조화 데이터 (타입별 상이)
  evidenceRefs: EvidenceRef[];   // 근거 레퍼런스 (필수!)
  sourceRefs: SourceRef[];       // 출처 레퍼런스
  quality: DocumentQualityMeta;  // confidence, freshness, warnings
  geoOptimized?: boolean;        // GEO 최적화 여부
  schemaHint?: string;           // schema.org 타입
  generatedAt: string;           // 생성 시각
}
```

## 3. 블록별 상세

### 3.1 FAQ Block

- **소스**: ClusterEngine → clusters + topKeywords
- **structuredData**: `{ questions: [{ question, answer }] }`
- **Evidence 연결**: search_cluster_distribution, search_cluster_detail
- **GEO 포인트**: FAQPage 스키마 적용 가능, AI Overview가 Q&A 구조를 우선 인용
- **생성 조건**: 클러스터 결과 + 관련 evidence 존재 시

### 3.2 SUMMARY Block

- **소스**: 전체 엔진 결과 종합
- **body 포함**: 클러스터 수, 노드/경로 수, 페르소나 수, 여정 단계 수, 신뢰도
- **Evidence 연결**: search_intelligence_quality + 상위 3개 evidence
- **GEO 포인트**: Article 스키마, 첫 문단에 핵심 정보 배치 (AI Overview 인용 패턴)

### 3.3 COMPARISON_TABLE Block

- **소스**: ClusterEngine → clusters
- **structuredData**: `{ columns: [...], rows: [{ cluster, keywordCount, topKeywords }] }`
- **Evidence 연결**: search_cluster_distribution, search_cluster_detail
- **GEO 포인트**: 비교형 구조는 AI 검색엔진이 테이블 형태로 인용
- **생성 조건**: 클러스터 2개 이상

### 3.4 INTENT_STAGE_EXPLANATION Block

- **소스**: RoadViewEngine → stages + weakStages
- **structuredData**: `{ stages: [{ name, keywordCount, hasGap }] }`
- **Evidence 연결**: search_roadview_stages
- **GEO 포인트**: HowTo 스키마, 단계별 설명은 "how to" 쿼리에서 인용

### 3.5 PERSONA_INSIGHT Block

- **소스**: PersonaEngine → personas
- **structuredData**: `{ personas: [{ name, percentage, archetype, description }] }`
- **Evidence 연결**: search_persona_profiles
- **GEO 포인트**: 타겟 오디언스 분석 → 콘텐츠 개인화 전략 근거

### 3.6 KEY_EVIDENCE Block

- **소스**: 전체 evidence의 snippet 모음
- **Evidence 연결**: 전체 evidenceRefs
- **목적**: 문서의 모든 주장이 어떤 근거에서 나왔는지 역추적 가능

### 3.7 RECOMMENDED_ACTION Block

- **소스**: RoadView weakStages + Cluster FAQ 기회 + Citation-ready sources
- **Evidence 연결**: search_roadview_stages + search_cluster_*
- **GEO 포인트**: 콘텐츠 갭 보강, schema markup, FAQ 페이지 생성 액션

## 4. Source/Citation 연결 방식

### SourceRef 구조

```typescript
{
  sourceId: string;
  sourceName: string;
  sourceType: "SEARCH_ENGINE" | "ANALYTICS" | "SOCIAL" | "AEO_SNAPSHOT" | "INTERNAL" | "CITATION";
  url?: string;
  domain?: string;
  trustScore?: number;        // 0-1
  citationReady?: boolean;    // GEO/AEO용 필터링
}
```

### Citation Policy 연결

- `citationReady=true`: schema markup 적용 가능, 구조화 데이터 완비
- `trustScore >= 0.7`: 신뢰할 수 있는 소스
- GEO 블록은 `mapper.filterCitationReady(sourceRefs)`로 citation-ready 소스만 참조
- 향후 GeoAeoService.getCitationGaps()와 연동하여 미인용 소스 우선 추천

### Preferred Source Policy

- 자사 콘텐츠 소스 우선 (sourceType=INTERNAL, trustScore 높음)
- 검색엔진 데이터(SEARCH_ENGINE)는 분석 근거로만 사용, 인용 소스로는 비추천
- AEO_SNAPSHOT은 경쟁 분석용, 자사 인용 전략의 참고로 사용

## 5. Confidence / Stale / Partial 표시

| 상태 | FAQ Block | SUMMARY Block | 기타 |
|------|-----------|--------------|------|
| Mock | body 앞 "[검증 필요]" | body 앞 "[검증 필요]" | 동일 |
| Stale | quality.freshness="stale" | body에 "(데이터 갱신 필요)" | 동일 |
| Partial | 실패 엔진 블록 스킵 | body에 누락 메트릭 표시 | 동일 |
| Low conf | quality.confidence 표시 | body에 신뢰도 % | 동일 |

## 6. 금지 사항

- ❌ evidenceRefs가 빈 배열인 블록 생성
- ❌ sourceRefs 없이 GEO 최적화라고 표시
- ❌ isMockOnly인데 "[검증 필요]" 없이 생성
- ❌ confidence < 0.2인 데이터로 블록 생성 (INSUFFICIENT → 빈 출력)
