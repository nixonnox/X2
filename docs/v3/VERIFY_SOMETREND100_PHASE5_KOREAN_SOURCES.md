# Verify: Korean Data Sources

> Date: 2026-03-16
> Status: 완료 (2개 연결 + 2개 보류)

## 소스별 상태

| 소스 | 상태 | Adapter | Registry 등록 | DB enum | 필요한 것 |
|------|------|---------|-------------|---------|----------|
| **네이버 블로그** | **완료** | `NaverBlogSearchAdapter` | ✓ bridge:89 | NAVER_BLOG | NAVER_CLIENT_ID/SECRET |
| **네이버 뉴스** | **완료** | `NaverNewsSearchAdapter` | ✓ bridge:90 | NAVER_NEWS | 동일 key |
| News API | 미착수 | — | — | NEWS_API (enum만) | adapter 구현 필요 |
| 커뮤니티 | **보류** | — | — | COMMUNITY (enum만) | 합법적 경로 없음 |
| 네이버 카페 | **보류** | — | — | — | API 폐지됨 |
