# Sometrend 100% Phase 5 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `naver-search-api.adapter.ts` | 네이버 블로그 + 뉴스 검색 API adapter (2개 클래스) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `schema.prisma` | SocialPlatform enum에 NAVER_BLOG/NAVER_NEWS/NEWS_API/COMMUNITY 추가 |
| `live-social-mention-bridge.service.ts` | NaverBlogSearchAdapter + NaverNewsSearchAdapter 등록 |

## 네이버 API 설정 방법

```bash
# 1. https://developers.naver.com 접속
# 2. 애플리케이션 등록 → 검색 API 사용
# 3. Client ID + Client Secret 발급

# .env.local에 추가
NAVER_CLIENT_ID="your-naver-client-id"
NAVER_CLIENT_SECRET="your-naver-client-secret"
```

## Provider 현황 (8개)

| Provider | 코드 | 연결 | 비용 |
|----------|------|------|------|
| YouTube | 완전 | Key 설정 시 | 무료 |
| Instagram | 완전 | Token 필요 | 무료 |
| TikTok | Scaffold | 승인 필요 | 무료 |
| X | 완전 | $100/월 | 유료 |
| **네이버 블로그** | **완전 (신규)** | **ID/Secret 설정 시** | **무료** |
| **네이버 뉴스** | **완전 (신규)** | **동일 key** | **무료** |
| News API | 미구현 | — | — |
| Community | 미구현 | — | — |
