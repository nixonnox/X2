# Search Evidence Bundle Spec

> 검색 인텔리전스 결과의 Evidence Bundle 변환 구조

## 1. 개요

SearchEvidenceBundleService는 SearchIntelligenceResult를 EvidenceBundleItem[]으로 변환하여
EvidenceBundleService의 `SEARCH_INTELLIGENCE` 번들 타입으로 통합한다.

## 2. Evidence 항목 목록

| # | category | label | displayType | 데이터 소스 | 조건 |
|---|----------|-------|-------------|-----------|------|
| 1 | search_intelligence_quality | 검색 인텔리전스 품질 지표 | KPI_CARD | trace | 항상 포함 |
| 2 | search_cluster_distribution | 검색 의도 클러스터 분포 | PIE_CHART | cluster | cluster 성공 시 |
| 3 | search_cluster_detail | 검색 의도 클러스터 상세 | TABLE | cluster | cluster 성공 시 |
| 4 | search_pathfinder_graph | 검색 여정 그래프 | TABLE | pathfinder | pathfinder 성공 시 |
| 5 | search_roadview_stages | 사용자 여정 단계별 분포 | BAR_CHART | roadview | roadview 성공 시 |
| 6 | search_persona_profiles | 검색자 페르소나 프로필 | TABLE | persona | persona 성공 시 |
| 7 | search_source_summary | 데이터 소스 현황 | TABLE | trace | PRACTITIONER/ADMIN |
| 8 | search_quality_warnings | 데이터 품질 경고 | QUOTE_LIST | quality | 경고 있을 때 |

## 3. 항목별 data shape

### 3.1 search_intelligence_quality (KPI_CARD)

```typescript
{
  seedKeyword: string;
  confidence: number;        // 0-1
  freshness: "fresh" | "recent" | "stale";
  qualityLevel: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  enginesSucceeded: number;
  enginesTotal: number;
  isMockOnly: boolean;
  durationMs: number;
}
```

### 3.2 search_cluster_distribution (PIE_CHART)

```typescript
Array<{
  label: string;     // 클러스터 라벨
  count: number;     // 멤버 키워드 수
}>
```

### 3.3 search_cluster_detail (TABLE)

```typescript
Array<{
  label: string;
  memberCount: number;
  topMembers: string[];    // 상위 5개 키워드
}>
```

### 3.4 search_pathfinder_graph (TABLE)

```typescript
{
  nodeCount: number;
  pathCount: number;
  topNodes: Array<{
    keyword: string;
    connections: number;
  }>;
}
```

### 3.5 search_roadview_stages (BAR_CHART)

```typescript
Array<{
  stage: string;         // 스테이지 이름
  keywordCount: number;  // 해당 스테이지의 키워드 수
}>
```

### 3.6 search_persona_profiles (TABLE)

```typescript
Array<{
  name: string;
  description: string | null;
  keywordCount: number;
  topKeywords: string[];
}>
```

### 3.7 search_source_summary (TABLE)

```typescript
Array<{
  name: string;
  status: "ready" | "unavailable" | "error" | "rate_limited";
  itemCount: number;
  latencyMs: number;
}>
```

### 3.8 search_quality_warnings (QUOTE_LIST)

```typescript
string[]  // 경고 메시지 배열
```

## 4. Role-based 필터링

| 항목 | PRACTITIONER | MARKETER | ADMIN | EXECUTIVE |
|------|-------------|----------|-------|-----------|
| quality KPI | ✅ | ✅ | ✅ | ✅ |
| cluster distribution | ✅ | ✅ | ✅ | ✅ |
| cluster detail | ✅ | ✅ | ✅ | ❌ |
| pathfinder graph | ✅ | ✅ | ✅ | ❌ |
| roadview stages | ✅ | ✅ | ✅ | ✅ |
| persona profiles | ✅ | ✅ | ✅ | ❌ |
| source summary | ✅ | ❌ | ✅ | ❌ |
| quality warnings | ✅ | ✅ | ✅ | ❌ |

## 5. 기존 BundleType 확장

현재 EvidenceBundleService는 8개 BundleType을 지원:
- SENTIMENT_OVERVIEW, FAQ_SUMMARY, RISK_SUMMARY, INTENT_GAP
- TREND_OVERVIEW, COMPETITIVE_POSITION, CAMPAIGN_PERFORMANCE, FULL_PROJECT

확장: `SEARCH_INTELLIGENCE` 번들 타입 추가.
`FULL_PROJECT` 번들에도 검색 인텔리전스 항목을 포함.

## 6. 통합 예시

```typescript
// 사용 방법
const quality = assessSearchDataQuality(searchResult);
const items = searchEvidenceBundle.buildSearchEvidenceItems(
  searchResult,
  quality,
  "MARKETER",
);

// 기존 EvidenceBundle에 합류
bundle.items.push(...items);
```
