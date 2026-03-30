# Sometrend Coverage Scorecard

> Date: 2026-03-16

## 기능 축별 상태

| # | 썸트렌드 기능 축 | x2 대응 | 상태 | 반영률 |
|---|-----------------|---------|------|--------|
| **1** | **키워드 추이 분석** | benchmarkTrend (일별 시계열) + periodData | **부분 구현** | ~50% |
| | 일별/주별/월별 추이 | benchmarkTrend (일별만) | 부분 — 주별/월별 집계 없음 |
| | 채널별 추이 | providerStatuses (provider별 카운트) | 부분 — 채널별 시계열 없음 |
| | 시계열 차트 | BenchmarkTrendChart (Recharts) | **완료** |
| **2** | **연관어 분석** | topicTaxonomy + cluster + Pathfinder/RoadView | **부분 구현** | ~40% |
| | 연관어 변화 | — | 미구현 |
| | 연관어 맵 | IntelligenceRadialGraph (SVG) | 부분 — 정적 |
| | 카테고리/TPO/브랜드 | taxonomyMapping (카테고리만) | 부분 |
| | 검색 경로 분석 | Pathfinder/RoadView 페이지 존재 | 부분 — stub 가능성 |
| **3** | **긍부정/감성 분석** | MentionSentimentAnalysisService | **구현+검증** | ~70% |
| | 긍/부/중 분류 | POSITIVE/NEGATIVE/NEUTRAL/MIXED/UNCLASSIFIED | **완료** |
| | 감성 연관어 | — | 미구현 |
| | 속성별 강점/약점 | signalFusion (부분) | 부분 |
| **4** | **키워드 비교 분석** | intelligence.compare (3모드) | **구현+검증** | ~85% |
| | keyword vs keyword | **완료** — DifferenceCard + score |
| | 기간 비교 | **완료** — period_vs_period + date picker |
| | current vs previous | **완료** — CurrentVsPreviousPanel |
| | 차이 하이라이트 | **완료** — 5차원 비교 + ActionDelta |
| **5** | **커뮤니티/소셜 모니터링** | LiveSocialMentionBridge + scheduled collection | **부분 구현** | ~45% |
| | 채널별 모니터링 | providerStatuses (4개 provider) | 부분 — 채널별 대시보드 없음 |
| | 실시간 시간별 추이 | — | 미구현 (일별만) |
| | 이슈 히스토리 | — | 미구현 |
| | 실시간 키워드 관찰 | liveMentions (60초 polling) | **완료** |
| **6** | **유튜브 분석** | YouTubeDataApiAdapter + Channel/Content/Comment 모델 | **부분 구현** | ~50% |
| | 동영상 수 | ContentMetricDaily 모델 존재 | 부분 — 집계 UI 없음 |
| | 조회수/좋아요/댓글 수 | DB 스키마 있음 (viewCount/likeCount/commentCount) | 부분 — 대시보드 없음 |
| | 채널 랭킹 | — | 미구현 |
| | 관련 유튜브 분석 | liveMentions에서 YouTube 댓글 수집 | 부분 |
| **7** | **다운로드/리포트화** | Export 서비스 (Word/PPT/PDF) | **부분 구현** | ~40% |
| | 차트 다운로드 | — | 미구현 |
| | 엑셀 다운로드 | DataExportJob 모델 + ExportFormat 존재 | 부분 — 연결 미확인 |
| | 보고서 근거 추출 | EvidenceBundleService | 부분 |
| **8** | **원문/증거 정보** | EvidenceSidePanel + rawSocialMention | **부분 구현** | ~50% |
| | 원문 보기 | liveMentions (text + platform + url) | **완료** |
| | 관련 게시물 근거 | EvidenceSidePanel (drill-down) | 부분 |
| **9** | **API/데이터 연동** | tRPC 12+ endpoints + BullMQ | **구현+검증** | ~70% |
| | 외부 시스템 연동 | tRPC (내부), webhook delivery | 부분 — public API 없음 |
| | 데이터 연동 구조 | 12+ intelligence endpoints | **완료** |
| **10** | **실사용 UX/운영성** | /intelligence + /notifications + Bell + Settings | **구현+검증** | ~80% |
| | 전용 진입점 | /intelligence 8탭 | **완료** |
| | 비교 UX | /intelligence/compare 3모드 카드 | **완료** |
| | 필터/검색 | /notifications 5필터 + 검색 | **완료** |
| | 저장/최근 키워드 | DB 연동 + 북마크 | **완료** |
| | 알림/모니터링 | Bell + /notifications + alert prefs | **완료** |
