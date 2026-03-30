# Naver / News / Community Feasibility

> Date: 2026-03-16

## 소스별 Feasibility

### 1. 네이버 블로그 검색 API ✅ 바로 연결 가능

| 항목 | 값 |
|------|-----|
| API | `https://openapi.naver.com/v1/search/blog.json` |
| 인증 | Client ID + Secret (무료) |
| 일일 한도 | 25,000건 |
| 제공 데이터 | 제목, 설명(snippet), 블로거명, 날짜, 링크 |
| 제약 | 전문 아닌 검색 결과만. 댓글/좋아요 미제공 |
| Adapter | **구현 완료** — `NaverBlogSearchAdapter` |
| 설정 | `NAVER_CLIENT_ID` + `NAVER_CLIENT_SECRET` |

### 2. 네이버 뉴스 검색 API ✅ 바로 연결 가능

| 항목 | 값 |
|------|-----|
| API | `https://openapi.naver.com/v1/search/news.json` |
| 인증 | 동일 (블로그와 같은 key) |
| 제공 데이터 | 제목, 설명, 원문 링크, 날짜 |
| Adapter | **구현 완료** — `NaverNewsSearchAdapter` |

### 3. 네이버 카페 ⚠️ 법적 검토 필요

| 항목 | 상태 |
|------|------|
| 공식 API | 없음 (카페 검색 API 폐지됨) |
| 크롤링 | 법적 리스크 (로그인 필요, robots.txt 차단) |
| 판단 | **보류** — 합법적 경로 없음 |

### 4. 뉴스 API (NewsAPI.org 등) ⚠️ 구조 준비

| 항목 | 상태 |
|------|------|
| API | newsapi.org, bigkinds.or.kr 등 |
| 인증 | API key (무료/유료) |
| 데이터 | 영문 뉴스 + 일부 한국어 |
| 한국어 뉴스 | BigKinds (KINDS) — 공공 뉴스 DB |
| 판단 | **구조 준비** — adapter scaffold 가능 |

### 5. 커뮤니티 (디시/에펨/루리웹 등) ❌ 보류

| 항목 | 상태 |
|------|------|
| 공식 API | 없음 |
| 크롤링 | 법적/기술 리스크 높음 |
| 약관 | 대부분 크롤링 금지 |
| 판단 | **보류** — 합법적 경로 없음 |

## 요약

| 소스 | 상태 | 필요한 것 |
|------|------|----------|
| **네이버 블로그** | ✅ 바로 연결 | NAVER_CLIENT_ID/SECRET |
| **네이버 뉴스** | ✅ 바로 연결 | 동일 key |
| 네이버 카페 | ❌ 보류 | 합법적 API 없음 |
| 뉴스 API (글로벌) | ⚠️ 구조 준비 | newsapi.org key |
| 커뮤니티 | ❌ 보류 | 합법적 경로 없음 |
