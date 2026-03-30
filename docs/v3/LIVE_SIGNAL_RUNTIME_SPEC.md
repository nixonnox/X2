# Live Signal Runtime Spec

## 개요

검색/소셜/댓글 실시간 신호의 런타임 연결 구조

## 데이터 소스 3개

### 1. Comment (comment.sentimentStats + comment.listByProject)

- 감성 분포, 토픽 추출, 리스크 감지, FAQ 후보

### 2. Listening (listening.getMentionFeed)

- 소셜 멘션, 플랫폼별 데이터, engagement rate

### 3. Search Intelligence (cluster, pathfinder, roadview, persona)

- 클러스터 패턴, 검색 경로, 여정 단계

## 프론트엔드 수집 흐름

```
useCurrentProject() → projectId
→ comment.sentimentStats (감성 통계)
→ comment.listByProject (댓글 상세)
→ listening.getMentionFeed (소셜 멘션)
→ socialDataPayload 변환:
  - sentiment: { total, positive, neutral, negative, topNegativeTopics, topPositiveTopics }
  - commentTopics: [{ topic, count, sentiment, isQuestion, isRisk, riskLevel }]
  - recentMentions: [{ platform, text, sentiment, topics, engagementRate, publishedAt }]
→ apply mutation에 socialData로 전달
```

## Signal Fusion 처리

- **VerticalSignalFusionService**가 3개 소스 통합
- **VerticalSocialCommentIntegrationService**가 업종별 해석
- 결과: additionalEvidence, additionalInsights, additionalWarnings

## 업종별 해석 차이

- **BEAUTY**: INGREDIENT_INTEREST, 트러블 경고
- **FNB**: MENU_INTEREST, 위생 경고
- **FINANCE**: CONDITION_ANALYSIS, 사기 경고
- **ENTERTAINMENT**: BUZZ_TIMING, 논란 경고

## freshness/coverage 처리

- signalQuality.hasSocialData, hasClusterData, hasBenchmarkData
- overallRichness:
  - **RICH**: 3개 모두
  - **MODERATE**: 1-2개
  - **MINIMAL**: 0개
