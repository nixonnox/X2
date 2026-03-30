# Sometrend 100% Phase 3 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `components/intelligence/RankingPanel.tsx` | 채널/콘텐츠 랭킹 (탭 전환, 화제성 점수) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 2개 endpoint: `channelRanking`, `contentRanking` |
| `intelligence/page.tsx` | RankingPanel import + 2개 query + 트렌드 탭 배치 |

## 새 tRPC Endpoints

### channelRanking
- **정렬:** views / engagement / growth / virality(기본)
- **Virality score:** `views×0.4 + engagement×0.3 + growth×0.2 + subscribers×0.1` (0-100)
- **Growth:** 최근 2개 snapshot의 subscriber 변화율
- **데이터:** Channel + ChannelSnapshot (latest 2)

### contentRanking
- **정렬:** views / likes / comments / engagement(기본)
- **Engagement score:** `(likes + comments×2 + shares×3) / views × 100`
- **데이터:** Content + ContentMetricDaily (latest)
- **기간 필터:** publishedAt >= startDate

## 화제성 지표 정책

### 채널 Virality Score (0-100)
```
viewScore = min(100, totalViews / 10000) × 0.4
engScore = min(100, avgEngagement × 100) × 0.3
growthScore = min(100, max(0, growth×5 + 50)) × 0.2
subScore = min(100, subscriberCount / 10000) × 0.1
viralityScore = round(sum)
```

### 콘텐츠 Engagement Score (%)
```
engagementScore = (likes + comments×2 + shares×3) / views × 100
```
- comments는 2배 가중 (깊은 참여)
- shares는 3배 가중 (확산 영향)

## 트렌드 탭 최종 구성 (13개 섹션)

```
1. 시간별 추이 + spike detection
2. 이슈 히스토리 타임라인
3. 소셜 반응 추이 (일/주/월)
4. 채널별 반응 추이
5. 연관어 맵
6. 연관어 변화
7. 감성 연관어
8. 속성별 강점/약점
9. 데이터 내려받기 (CSV 4종)
10. YouTube 분석
11. 랭킹 (채널/콘텐츠)    ← 신규
12. 기준 비교 트렌드
13. 키워드 기록
```
