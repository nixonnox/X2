# X2 Next Priority Source Backlog

이미 완료된 소스/구조는 제외. 남은 작업만 정리.

---

## P0 — 즉시 연결 가능 (코드 완료, 키만 설정)

| # | 소스 | 필요한 것 | 효과 |
|---|------|----------|------|
| 1 | **YouTube Data API** | YOUTUBE_API_KEY 1개 | 영상/댓글/채널 실데이터 수집 |
| 2 | **Anthropic Claude** | ANTHROPIC_API_KEY 1개 | LLM 인사이트 해석 활성화 |
| 3 | **DataForSEO Sandbox** | LOGIN/PASSWORD (무료) | 검색량/CPC/SERP 종합 데이터 |

## P1 — 단기 구현 (1일 이내)

| # | 소스 | 작업 | 효과 |
|---|------|------|------|
| 4 | **네이버 웹문서** | NaverWebDocAdapter 추가 (같은 키) | 웹문서 검색 결과 |
| 5 | **Reddit API** | RedditAdapter 신규 (무료) | 글로벌 커뮤니티 데이터 |
| 6 | **GDELT Geo 시각화** | 국가별 히트맵 UI 연결 | 글로벌 이슈 확산 시각화 |

## P2 — 중기 (API 키 발급 절차 필요)

| # | 소스 | 작업 | 효과 |
|---|------|------|------|
| 7 | **X (Twitter) API** | X_API_BEARER_TOKEN 발급 ($100/월) | 실시간 트윗 분석 |
| 8 | **Instagram Graph** | Meta Business 앱 심사 | 해시태그 미디어 분석 |
| 9 | **TikTok Research** | TikTok 리서치 API 신청 | 영상/댓글 분석 |
| 10 | **Google Ads** | 광고 계정 + Standard Access | 절대 검색량/CPC |

## P3 — 장기/검토 필요

| # | 소스 | 비고 |
|---|------|------|
| 11 | Perplexity API | GEO/AEO 실데이터 (유료) |
| 12 | 사용자 데이터 업로드 (CSV) | CRM/리뷰 분석용 |
| 13 | 국내 커뮤니티 크롤링 | 법적 검토 필요 |
| 14 | Wikipedia API | 지식 맥락 보강 |

---

## 제외 (이미 완료)

- 네이버 블로그/뉴스/카페/지식iN — 완료+검증
- 네이버 DataLab (트렌드+인구통계) — 완료+검증
- SerpAPI — 완료+검증
- NewsAPI — 완료+검증
- GDELT — 이번 작업에서 추가
- 정규화 스키마 — 완료
- Evidence 파이프라인 — 완료
- Export 5포맷 — 완료
