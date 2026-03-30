# Sometrend 100% Final Coverage Re-audit

> Date: 2026-03-16
> Router: 2,160줄 / Components: 24개 / Endpoints: 26개 / Adapters: 5개

## 축별 최종 반영률

| 축 | 썸트렌드 기능 | x2 반영 | 반영률 |
|----|-------------|---------|--------|
| **1. 키워드 추이** | 일/주/월/시간별/채널별 | mentionTrend(일/주/월) + channelTrend + hourlyTrend + benchmarkTrend | **~85%** |
| **2. 연관어 분석** | 맵/변화/TPO/감성연관 | relatedKeywords(맵) + relatedKeywordChange(변화) + sentimentTerms(감성) | **~80%** |
| **3. 감성 분석** | 긍부중/감성연관/속성해석 | sentiment pipeline + sentimentTerms + attributeAnalysis | **~85%** |
| **4. 키워드 비교** | keyword/기간/currentVsPrev | compare 3모드 + DifferenceCard + ActionDelta | **~90%** |
| **5. 소셜 모니터링** | 채널별/실시간/이슈히스토리 | liveMentions + hourlyTrend + issueTimeline + channelTrend | **~80%** |
| **6. YouTube 분석** | 영상수/조회수/채널랭킹 | youtubeSummary + channelRanking + contentRanking | **~85%** |
| **7. 다운로드/리포트** | 차트/엑셀/보고서 | exportData(CSV 4종) + Export서비스(Word/PPT/PDF 구조) | **~65%** |
| **8. 원문/증거** | 원문보기/drill-down | rawMentions + EvidenceSidePanel + RawMentionList | **~80%** |
| **9. API/연동** | 외부API/데이터연동 | /api/v1/intelligence(REST) + tRPC 26개 | **~70%** |
| **10. UX/운영** | 진입점/필터/알림/설정 | 8탭+Bell+/notifications+settings+해요체 | **~85%** |
| **데이터 소스** | 네이버/뉴스/커뮤니티/유튜브/인스타 | YouTube+Naver(블로그/뉴스)+IG+TikTok(scaffold)+X | **~65%** |

## **전체 가중 평균: ~80%**
(데이터 소스 폭 가중 반영 — 네이버 카페/커뮤니티 미지원이 큰 gap)
