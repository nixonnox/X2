# Benchmark Baseline Spec

> 업종별 벤치마크 기준 데이터와 비교 분석 규칙

## 1. 개요

각 업종에 8개의 벤치마크 메트릭을 정의하고, 실제 분석 결과와 비교하여
"업종 평균 대비 높은/낮은/평균" 해석을 제공.

## 2. 업종별 벤치마크 데이터

### BEAUTY (뷰티)

| 메트릭 | 라벨 | 기준값 | 단위 | 설명 |
|--------|------|--------|------|------|
| faqFrequency | FAQ 비중 | 22% | percent | 전체 검색 중 FAQ 형태 비율 |
| comparisonClusterRatio | 비교 클러스터 비중 | 28% | percent | 비교/대조 관련 클러스터 비율 |
| ingredientSearchShare | 성분 검색 비중 | 35% | percent | 성분 관련 키워드 검색 비율 |
| reviewMentionRate | 리뷰 언급률 | 18% | percent | 리뷰/후기 관련 검색 비율 |
| skinTypeMentionRate | 피부타입 언급률 | 15% | percent | 피부타입 관련 키워드 비율 |
| seasonalVariation | 시즌 변동폭 | 0.25 | ratio | 월별 검색량 변동 계수 |
| purchaseIntentRatio | 구매 의도 비율 | 30% | percent | 구매 의도 검색 비율 |
| avgClusterCount | 평균 클러스터 수 | 6 | count | 시드키워드당 평균 클러스터 수 |

### FNB (F&B)

| 메트릭 | 라벨 | 기준값 | 단위 | 설명 |
|--------|------|--------|------|------|
| menuSearchShare | 메뉴 검색 비중 | 30% | percent | 메뉴/음식 관련 검색 비율 |
| locationSearchRatio | 지역 검색 비중 | 25% | percent | 지역/맛집 관련 검색 비율 |
| seasonalVariation | 시즌 변동폭 | 0.35 | ratio | 월별 검색량 변동 계수 (시즌 메뉴 영향) |
| deliverySearchRate | 배달 검색 비율 | 20% | percent | 배달/포장 관련 검색 비율 |
| priceComparisonRate | 가격 비교 비율 | 18% | percent | 가격/가성비 비교 검색 비율 |
| visitIntentRatio | 방문 의도 비율 | 22% | percent | 매장 방문 의도 검색 비율 |
| reviewInfluenceRate | 리뷰 영향률 | 28% | percent | 후기/리뷰 기반 검색 비율 |
| avgClusterCount | 평균 클러스터 수 | 5 | count | 시드키워드당 평균 클러스터 수 |

### FINANCE (금융)

| 메트릭 | 라벨 | 기준값 | 단위 | 설명 |
|--------|------|--------|------|------|
| comparisonSearchRate | 비교 검색 비율 | 35% | percent | 조건/금리 비교 검색 비율 |
| procedureQueryRate | 절차 문의 비율 | 20% | percent | 가입/해지 절차 문의 비율 |
| trustSignalPresence | 신뢰 시그널 비율 | 15% | percent | 신뢰/안전 관련 검색 비율 |
| rateComparisonFrequency | 금리 비교 빈도 | 25% | percent | 금리/이자율 비교 검색 비율 |
| riskAwarenessRate | 리스크 인식 비율 | 12% | percent | 위험/손실 관련 검색 비율 |
| faqFrequency | FAQ 비중 | 28% | percent | FAQ 형태 검색 비율 (금융은 높음) |
| regulatoryMentionRate | 규제 언급률 | 8% | percent | 규제/법적 관련 검색 비율 |
| avgClusterCount | 평균 클러스터 수 | 7 | count | 시드키워드당 평균 클러스터 수 |

### ENTERTAINMENT (엔터테인먼트)

| 메트릭 | 라벨 | 기준값 | 단위 | 설명 |
|--------|------|--------|------|------|
| buzzDecayHours | 버즈 감소 시간 | 48 | hours | 이슈 후 검색량 50% 감소까지 시간 |
| fanEngagementRate | 팬 참여율 | 40% | percent | 팬덤 관련 검색/참여 비율 |
| spreadVelocity | 확산 속도 점수 | 0.65 | score | 콘텐츠 확산 속도 (0~1) |
| socialSearchCrossover | 소셜-검색 교차율 | 35% | percent | 소셜에서 시작된 검색 비율 |
| merchandiseSearchRate | 굿즈 검색 비율 | 15% | percent | 굿즈/MD/공연 관련 검색 비율 |
| contentTypeVariety | 콘텐츠 유형 다양성 | 0.70 | score | 검색 콘텐츠 유형 다양성 (0~1) |
| viralPotentialScore | 바이럴 잠재력 | 0.55 | score | 바이럴/밈 관련 검색 잠재력 (0~1) |
| avgClusterCount | 평균 클러스터 수 | 5 | count | 시드키워드당 평균 클러스터 수 |

## 3. 비교 판정 규칙

| 편차 | 판정 |
|------|------|
| +15% 초과 | ABOVE (업종 평균 상회) |
| ±15% 이내 | AVERAGE (업종 평균 수준) |
| -15% 미만 | BELOW (업종 평균 하회) |

## 4. 해석 문장 생성

```
ABOVE → "{업종} 업종 평균({기준값}) 대비 {메트릭}이(가) {실제값}로 높은 편입니다."
AVERAGE → "{메트릭}이(가) {실제값}로 {업종} 업종 평균({기준값}) 수준입니다."
BELOW → "{업종} 업종 평균({기준값}) 대비 {메트릭}이(가) {실제값}로 낮은 편입니다."
```

## 5. 전체 점수

overallScore = mean(ABOVE=1.0, AVERAGE=0.5, BELOW=0.0)
- 0.7 이상: 전반적으로 양호
- 0.4~0.7: 평균 수준
- 0.4 미만: 개선 필요

## 6. VerticalDocumentProfile.benchmarkBaseline 연결

4개 업종 template 프로필에 `benchmarkBaseline: Record<string, number>` 데이터가 채워짐.
BenchmarkBaselineService는 동일한 데이터를 서비스 레이어에서도 관리.
