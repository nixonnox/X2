# Verify: Naver/News/Community Status

> Date: 2026-03-16

## 네이버 블로그

| 항목 | 상태 |
|------|------|
| API URL | `openapi.naver.com/v1/search/blog.json` |
| 인증 | X-Naver-Client-Id + Secret |
| isConfigured() | env 체크 |
| testConnection() | 실제 API 호출 |
| fetchMentions() | keyword 검색 → SocialMention 변환 |
| HTML strip | stripHtml() 유틸 |
| Mock | **아님** — 실제 네이버 API |

## 네이버 뉴스

| 항목 | 상태 |
|------|------|
| API URL | `openapi.naver.com/v1/search/news.json` |
| 구조 | 블로그와 동일 패턴 |
| 원문 링크 | originallink 우선, link fallback |

## 커뮤니티

| 소스 | 상태 | 이유 |
|------|------|------|
| 디시인사이드 | 보류 | robots.txt 차단, 약관 크롤링 금지 |
| 에펨코리아 | 보류 | 동일 |
| 루리웹 | 보류 | 동일 |
| 클리앙 | 보류 | 동일 |
