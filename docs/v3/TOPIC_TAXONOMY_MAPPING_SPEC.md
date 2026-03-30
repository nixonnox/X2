# Topic Taxonomy Mapping Spec

> 클러스터 결과를 업종별 topicTaxonomy에 매핑하는 규칙

## 1. 개요

클러스터 엔진이 생성한 클러스터(label + memberTexts)를 업종의 topicTaxonomy 카테고리에 매핑.
매핑 결과로 "이 키워드의 클러스터는 뷰티 업종 기준 '성분분석'과 '스킨케어'에 해당" 같은 맥락 제공.

## 2. 입력

```typescript
type ClusterInput = {
  clusterId: string;
  label: string;          // 클러스터 라벨 (예: "레티놀 세럼 비교")
  memberTexts: string[];  // 멤버 텍스트 (예: ["레티놀 추천", "세럼 효과", ...])
  score?: number;
};
```

## 3. 매핑 방식

### 3.1 카테고리별 확장 키워드 사전

각 업종의 topicTaxonomy 카테고리마다 확장 키워드 사전을 보유.

| 업종 | 카테고리 | 확장 키워드 수 |
|------|---------|-------------|
| BEAUTY | 11개 | 카테고리당 7~12개 |
| FNB | 10개 | 카테고리당 6~10개 |
| FINANCE | 12개 | 카테고리당 6~8개 |
| ENTERTAINMENT | 11개 | 카테고리당 7~11개 |

### 3.2 매칭 규칙

1. 클러스터의 label + memberTexts를 소문자로 정규화
2. 각 카테고리의 [카테고리명 + 확장 키워드]와 부분 문자열 매칭
3. 가중치 산출:
   - label 매칭: 1.0
   - member 매칭: 0.5
   - 카테고리명 직접 매칭: +0.3 보너스
4. confidence = min(1.0, totalWeight / 3.0)

### 3.3 다중 매핑

하나의 클러스터가 여러 카테고리에 매핑될 수 있음.
예: "레티놀 세럼 트러블 관리" → "성분분석"(1.0) + "트러블케어"(0.7) + "스킨케어"(0.5)

## 4. 출력

```typescript
type ClusterTaxonomyMapping = {
  clusterId: string;
  clusterLabel: string;
  industryType: IndustryType;
  matches: TaxonomyMatch[];      // confidence 내림차순
  bestMatch: TaxonomyMatch | null;
  isUnmapped: boolean;           // matches가 비어있으면 true
};

type TaxonomyMappingResult = {
  industryType: IndustryType;
  mappings: ClusterTaxonomyMapping[];
  taxonomyCoverage: Record<string, number>;  // 카테고리별 매핑된 클러스터 수
  unmappedCount: number;
  totalClusters: number;
};
```

## 5. 커버리지 분석

taxonomyCoverage로 업종 분류 체계의 커버리지를 확인:
- 커버되지 않는 카테고리 → "이 키워드에서 '헤어케어' 관련 클러스터가 없음"
- 과도하게 집중된 카테고리 → "성분분석에 클러스터가 5개나 몰려있음"

## 6. 미매핑 처리

- `isUnmapped: true` → 업종 분류에 맞지 않는 새로운 주제
- unmappedCount가 높으면 → 업종 분류 확장 또는 업종 재추론 필요
- 경고 메시지: "[N]개 클러스터가 업종 분류 체계에 매핑되지 않았습니다"

## 7. 예시

| seedKeyword | 클러스터 | BEAUTY 매핑 | FNB 매핑 |
|------------|---------|------------|---------|
| 레티놀 세럼 | "레티놀 효과 비교" | 성분분석(1.0), 리뷰/후기(0.5) | (미매핑) |
| 레티놀 세럼 | "피부 트러블 관리" | 트러블케어(1.0), 피부타입(0.5) | (미매핑) |
| 카페 추천 | "강남 카페 디저트" | (미매핑) | 카페/디저트(1.0), 지역맛집(0.7) |
