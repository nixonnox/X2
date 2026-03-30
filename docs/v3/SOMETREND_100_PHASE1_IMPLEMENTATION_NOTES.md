# Sometrend 100% Phase 1 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `components/intelligence/HourlyTrendChart.tsx` | 시간별 추이 (Bar + spike 하이라이트 + 급증 기준선) |
| `components/intelligence/IssueTimeline.tsx` | 이슈 히스토리 타임라인 (spike/drop/sentiment_shift/peak) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `intelligence.ts` router | 2개 endpoint 추가: `hourlyTrend`, `issueTimeline` |
| `intelligence/page.tsx` | 2개 컴포넌트 import + query + 트렌드 탭 맨 위에 배치 |

## 새 tRPC Endpoints

### hourlyTrend
- **입력:** projectId, keyword, hours(1~168, 기본 24)
- **데이터:** rawSocialMention.publishedAt 기준 시간별 그루핑
- **출력:** `{ dataPoints: [{ hour, count, positive, negative, isSpike }], spikes, stats }`
- **Spike detection:** mean + 2σ, 최소 3건 이상

### issueTimeline
- **입력:** projectId, keyword, days(1~90, 기본 30)
- **데이터:** socialMentionSnapshot 일별 비교
- **이벤트 유형:**
  - `spike` — 전일 대비 100%+ 증가
  - `drop` — 전일 대비 50%+ 감소
  - `sentiment_shift` — 부정 비율 20%p+ 변화
  - `new_peak` — 기간 최고치 갱신
- **severity:** high (3배+/25%+) / medium / low

## Spike Detection 정책

```
mean = 평균 멘션수/시간
stddev = 표준편차
spikeThreshold = mean + 2 * stddev
count > spikeThreshold && count >= 3 → isSpike
```

- 노이즈 방지: 최소 3건
- 시각화: 급증 바 amber 색상 + ReferenceLine
- 알림 연동: 향후 SPIKE alert 조건으로 재사용 가능

## 트렌드 탭 정보 계층 (상→하)

```
1. 시간별 추이 (HourlyTrendChart) — 지금 상황
2. 이슈 히스토리 (IssueTimeline) — 최근 이벤트
3. 소셜 반응 추이 (MentionTrendChart) — 일/주/월
4. 채널별 추이 (ChannelTrendChart) — platform별
5. 연관어 맵 (RelatedKeywordMap) — 키워드 맥락
6. 데이터 내려받기 (ExportButtons) — 활용
7. YouTube 분석 (YouTubeSummaryPanel) — YouTube 전용
8. 기준 비교 트렌드 (BenchmarkTrendChart) — benchmark
9. 키워드 기록 (KeywordHistoryPanel) — 이력
```
