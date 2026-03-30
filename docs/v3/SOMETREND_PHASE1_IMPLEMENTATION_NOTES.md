# Sometrend Phase 1 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `components/intelligence/MentionTrendChart.tsx` | 소셜 반응 추이 차트 (일별/주별/월별 전환) |
| `components/intelligence/ChannelTrendChart.tsx` | 채널별 반응 추이 (stacked bar) |
| `components/intelligence/YouTubeSummaryPanel.tsx` | YouTube 화제성 카드 + 인기 콘텐츠 |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 3개 endpoint 추가: `mentionTrend`, `channelTrend`, `youtubeSummary` |
| `intelligence/page.tsx` | 3개 컴포넌트 import + query hook + 트렌드 탭에 연결 |

## 새 tRPC Endpoints

| Endpoint | 입력 | 출력 | 데이터 소스 |
|----------|------|------|-----------|
| `mentionTrend` | keyword, days, granularity | 집계된 period별 카운트 | socialMentionSnapshot |
| `channelTrend` | keyword, days | platform별 일별 카운트 | rawSocialMention |
| `youtubeSummary` | keyword, days | 영상수/조회수/좋아요/댓글 + top 10 | rawSocialMention (YOUTUBE) |

## 집계 로직

### mentionTrend (주별/월별)
- Daily: 그대로 (date key)
- Weekly: ISO week Monday 기준 rollup
- Monthly: YYYY-MM 기준 rollup
- 빈 구간: 자연스럽게 누락 (차트에서 gap)

### channelTrend
- rawSocialMention에서 platform + publishedAt 기준 그루핑
- sentiment 포함 (positive/negative)

### youtubeSummary
- platform="YOUTUBE" 필터
- viewCount/likeCount/commentCount 합산
- 조회수 기준 상위 10개 콘텐츠
