# X2 Data Source Expansion Audit

## 현재 소스 상태 감사

### 완료 + 검증 완료

| 소스 | 어댑터 | API 키 | 실데이터 검증 |
|------|--------|--------|-------------|
| 네이버 블로그 | NaverBlogSearchAdapter | **설정됨** | 9.9M건 응답 확인 |
| 네이버 뉴스 | NaverNewsSearchAdapter | **설정됨** | 5.9M건 응답 확인 |
| 네이버 카페 | NaverCafeSearchAdapter | **설정됨** | 4.5M건 응답 확인 |
| 네이버 지식iN | NaverKinSearchAdapter | **설정됨** | 795K건 응답 확인 |
| 네이버 DataLab | NaverDatalabAdapter | **설정됨** | 트렌드+성별/연령 확인 |
| SerpAPI (Google) | SerpAdapter | **설정됨** | SERP 결과 확인 |
| NewsAPI (글로벌) | GlobalNewsApiAdapter | **설정됨** | 142K건 응답 확인 |
| NewsAPI Headlines | GlobalNewsHeadlinesAdapter | **설정됨** | 국가별 뉴스 확인 |

### 완료 + 검증 미완료 (API 키 미설정)

| 소스 | 어댑터 | 필요 키 | 코드 상태 |
|------|--------|---------|----------|
| YouTube Data API | YouTubeDataApiAdapter | YOUTUBE_API_KEY | REAL — v3 댓글/영상/채널 |
| X (Twitter) API | XApiAdapter | X_API_BEARER_TOKEN | REAL — v2 최근 검색 |
| Instagram Graph | InstagramGraphApiAdapter | INSTAGRAM_ACCESS_TOKEN | REAL — 해시태그 미디어 |
| TikTok Research | TikTokResearchApiAdapter | TIKTOK_ACCESS_TOKEN | REAL — 영상/댓글 검색 |
| Google Ads | GoogleAdsAdapter | 5개 키 필요 | REAL — 검색량/CPC |
| DataForSEO | DataForSeoAdapter | LOGIN/PASSWORD | REAL — 종합 SEO |
| Google Trends | GoogleTrendsAdapter | SERP_API_KEY (공유) | REAL — SerpAPI 경유 |
| Perplexity | GEO/AEO Router | PERPLEXITY_API_KEY | REAL — Sonar API |
| Anthropic Claude | InsightInterpreter | ANTHROPIC_API_KEY | REAL — Claude Sonnet |

### 신규 추가 (이번 작업)

| 소스 | 어댑터 | API 키 | 상태 |
|------|--------|--------|------|
| GDELT | GdeltNewsAdapter | **불필요** (무료) | 구현 완료 |

### 미착수

| 소스 | 가능성 | 비고 |
|------|--------|------|
| 네이버 웹문서 검색 | 높음 | 같은 API 키, `/v1/search/webkr.json` |
| Reddit API | 높음 | 무료, 글로벌 커뮤니티 |
| Wikipedia API | 높음 | 무료, 지식 맥락 |
| Google Alerts | 낮음 | 공식 API 없음 |
| 국내 커뮤니티 (디시/루리웹) | 낮음 | 공식 API 없음, 크롤링 필요 |
