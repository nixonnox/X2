# X2 실데이터 연동 전환 준비 상태 점검

> 작성일: 2026-03-09

---

## 1. 전체 현황 요약

```
전체 데이터 영역: 15개
실데이터 연동 가능:  2개 (13%)
Mock/하드코딩:     11개 (74%)
부분 준비:          2개 (13%)
```

---

## 2. 영역별 상세 점검

### 카테고리 A: 실데이터 연동 가능 (API 통합 완료)

| #   | 영역                       | 상태          | 설명                                             |
| --- | -------------------------- | ------------- | ------------------------------------------------ |
| 1   | 채널 정보 수집 (YouTube)   | API 통합 완료 | YouTube Data API v3, API 키만 설정하면 즉시 사용 |
| 2   | 채널 정보 수집 (Instagram) | API 통합 완료 | Instagram Graph API, 액세스 토큰 필요            |
| 3   | 채널 정보 수집 (TikTok)    | API 통합 완료 | TikTok Display API, 액세스 토큰 필요             |
| 4   | 채널 정보 수집 (X)         | API 통합 완료 | X API v2, Bearer 토큰 필요                       |

**필요 조건:**

- `.env.local`에 각 플랫폼 API 키 설정
- `syncChannel()` 호출 시 실데이터 수집됨
- 현재는 인메모리 저장 (서버 재시작 시 소실)

**수집되는 데이터:**

- 채널명, 구독자/팔로워 수, 콘텐츠 수, 썸네일
- 최근 콘텐츠 30개 (제목, 조회수, 좋아요, 댓글수)
- 참여율 계산
- 일일 스냅샷 생성

---

### 카테고리 B: 부분 준비 (코드 있으나 연결 안됨)

| #   | 영역             | 상태                    | 설명                                            |
| --- | ---------------- | ----------------------- | ----------------------------------------------- |
| 5   | AI 분석          | 코드 완성, Mock 사용 중 | 13가지 태스크, 멀티 프로바이더, 프롬프트 템플릿 |
| 6   | Intent 분석 엔진 | 코드 완성, UI 미연결    | 키워드 확장, 볼륨 수집, 의도 분류, 그래프       |

**AI 분석 전환 방법:**

```bash
# .env.local에 추가
ANTHROPIC_API_KEY="sk-ant-..."  # 또는
OPENAI_API_KEY="sk-..."
AI_DEV_MODE="false"              # Mock → 실제 전환
AI_DEFAULT_PROVIDER="anthropic"  # 또는 "openai"
```

**Intent 엔진 전환 방법:**

- `/api/intent/analyze` API 라우트는 이미 존재
- 키워드 페이지에서 이 API를 호출하는 코드 추가 필요
- SSE 스트리밍도 구현되어 있음

---

### 카테고리 C: Mock/하드코딩 (전환 필요)

| #   | 영역             | 현재 상태                          | 전환 필요 사항                 |
| --- | ---------------- | ---------------------------------- | ------------------------------ |
| 7   | 대시보드 KPI     | `lib/mock-data.ts` 하드코딩        | 등록된 채널 스냅샷에서 집계    |
| 8   | 채널 인사이트    | `mock-data.ts` 하드코딩            | AI 분석 결과 연결              |
| 9   | 댓글 데이터      | `lib/comments/` 하드코딩           | 플랫폼 API로 댓글 수집         |
| 10  | 경쟁 채널 데이터 | `lib/competitors/` 하드코딩        | DB 저장 + 동일 sync 파이프라인 |
| 11  | 키워드 트렌드    | `TRENDING_KEYWORDS` 하드코딩       | Intent 엔진 연결               |
| 12  | 리포트 내용      | `reports/mock-data.ts` 하드코딩    | AI 생성 + DB 저장              |
| 13  | 이메일 발송      | Mock 프로바이더                    | Resend/SendGrid 연동           |
| 14  | 결제/구독        | 미구현                             | Stripe Checkout + Webhook      |
| 15  | 수집 작업 이력   | `collection/mock-data.ts` 하드코딩 | 실제 작업 로그                 |
| 16  | 업로드 빈도 차트 | `Math.random()`                    | 콘텐츠 publishedAt 기반 계산   |
| 17  | 채널 시계열      | 1회 수집 = 1포인트                 | 매일 cron으로 스냅샷 축적      |

---

## 3. 플랫폼별 API 연동 상세

### YouTube Data API v3

| 항목           | 상태                             | 설명                                               |
| -------------- | -------------------------------- | -------------------------------------------------- |
| API 키 발급    | 사용자 필요                      | Google Cloud Console → API & Services              |
| 채널 정보 조회 | 구현 완료                        | `channels.list` (1 unit)                           |
| 콘텐츠 목록    | 구현 완료                        | `search.list` (100 units) + `videos.list` (1 unit) |
| 댓글 수집      | 미구현                           | `commentThreads.list` (1 unit) — 추가 필요         |
| 일일 할당량    | 10,000 units                     | 채널 정보 1회 = ~102 units                         |
| 비용           | 무료                             | 할당량 내 무료                                     |
| 법적 제약      | 없음                             | 공식 API, ToS 준수                                 |
| 구현 파일      | `packages/social/src/youtube.ts` | 356줄                                              |

### Instagram Graph API

| 항목           | 상태                               | 설명                                                      |
| -------------- | ---------------------------------- | --------------------------------------------------------- |
| 토큰 발급      | 사용자 필요                        | Meta Business Suite → Business 계정 필요                  |
| 채널 정보 조회 | 구현 완료                          | `/{user-id}?fields=...`                                   |
| 콘텐츠 목록    | 구현 완료                          | `/{user-id}/media`                                        |
| 댓글 수집      | 미구현                             | `/{media-id}/comments` — 추가 필요                        |
| Rate Limit     | 200 calls/hour                     |                                                           |
| 비용           | 무료                               | Business 계정 필요                                        |
| 법적 제약      | 주의                               | Business 계정 소유자만 자기 데이터 접근, 타인 데이터 제한 |
| 구현 파일      | `packages/social/src/instagram.ts` | 364줄                                                     |

### TikTok Display/Research API

| 항목           | 상태                            | 설명                                                |
| -------------- | ------------------------------- | --------------------------------------------------- |
| 토큰 발급      | 사용자 필요                     | TikTok Developer Portal                             |
| 채널 정보 조회 | 구현 완료                       | User Info API                                       |
| 콘텐츠 목록    | 구현 완료                       | User Videos API                                     |
| 댓글 수집      | 미구현                          | Comments API — 추가 필요                            |
| Rate Limit     | 플랫폼별 상이                   |                                                     |
| 비용           | 무료 (Display), 유료 (Research) |                                                     |
| 법적 제약      | 주의                            | Display API는 본인 계정만, Research API는 별도 심사 |
| 구현 파일      | `packages/social/src/tiktok.ts` | 230줄                                               |

### X (Twitter) API v2

| 항목           | 상태                             | 설명                               |
| -------------- | -------------------------------- | ---------------------------------- |
| 토큰 발급      | 사용자 필요                      | developer.x.com, Basic tier 이상   |
| 채널 정보 조회 | 구현 완료                        | `users/by/username`                |
| 콘텐츠 목록    | 구현 완료                        | `users/{id}/tweets`                |
| 댓글 수집      | 미구현                           | Search API로 멘션/리플 — 추가 필요 |
| Rate Limit     | 15 requests/15min (Basic)        |                                    |
| 비용           | $100/월 (Basic), $5,000/월 (Pro) |                                    |
| 법적 제약      | 주의                             | 데이터 재판매 금지, 사용 목적 제한 |
| 구현 파일      | `packages/social/src/x.ts`       | 225줄                              |

---

## 4. 공개 웹 수집(크롤링) 검토

### 크롤링이 필요할 수 있는 영역

| 영역                 | 필요성      | 대안                        | 법적 검토          |
| -------------------- | ----------- | --------------------------- | ------------------ |
| 네이버 블로그 트렌드 | 키워드 볼륨 | 네이버 검색 API (공식)      | 공식 API 우선 사용 |
| YouTube 자막         | 콘텐츠 분석 | YouTube Captions API (공식) | 공식 API 사용      |
| 경쟁 채널 공개 지표  | 비교 분석   | 각 플랫폼 공식 API          | API 범위 내에서만  |

### 크롤링 원칙

1. **공식 API가 있으면 반드시 API를 우선 사용**
2. **robots.txt 준수** — 크롤링 전 반드시 확인
3. **서비스 약관 준수** — 각 플랫폼 ToS 검토
4. **요청 빈도 제한** — 과도한 요청 금지
5. **개인정보 수집 금지** — 공개 데이터만

### 현재 크롤링 코드 상태

- `lib/collection/connectors/generic-crawler.ts` 존재
- 실제 사용되지 않음
- robots.txt 체크 로직 없음 → **추가 필요**

---

## 5. 법적/정책적 검토 필요 대상

| 대상                       | 위험도 | 설명                                                                                 | 조치                          |
| -------------------------- | ------ | ------------------------------------------------------------------------------------ | ----------------------------- |
| Instagram 타인 계정 데이터 | 높음   | Graph API는 본인 계정만 접근 가능, 타인 공개 데이터는 Basic Display API (deprecated) | OAuth 연결 방식으로 전환 필요 |
| TikTok Research API        | 보통   | 대규모 데이터 수집 시 별도 심사 필요                                                 | 사용량 제한 내에서 시작       |
| X API 가격                 | 보통   | Basic $100/월, Pro $5,000/월                                                         | 사용자에게 비용 안내 필요     |
| 댓글 내 개인정보           | 보통   | 댓글 작성자 이름/프로필이 개인정보에 해당                                            | 개인정보 처리방침 명시        |
| AI 분석 데이터 보호        | 보통   | 사용자 데이터가 AI 프로바이더로 전송됨                                               | 데이터 처리 동의 필요         |
| GDPR/개인정보보호법        | 보통   | EU 사용자 데이터 처리 시                                                             | 개인정보 처리방침 업데이트    |

---

## 6. 실데이터 연결 시 깨질 수 있는 UI/UX

| 영역          | 문제               | 설명                                                 |
| ------------- | ------------------ | ---------------------------------------------------- |
| 대시보드 KPI  | 숫자 형식          | 목업은 `125,400`인데 실데이터는 `0`이거나 매우 큰 수 |
| 차트 시계열   | 데이터 포인트 부족 | 1일차는 점 1개, 차트가 무의미                        |
| 참여율        | 0% 표시            | 신규 채널은 데이터 부족으로 0%                       |
| 콘텐츠 테이블 | 빈 테이블          | 콘텐츠가 없는 채널                                   |
| 댓글 분석     | 전면 빈 화면       | 댓글 수집 전에는 데이터 0                            |
| 경쟁 분석     | 비교 불가          | 내 채널 데이터와 경쟁 데이터 동시 필요               |
| 키워드 트렌드 | 빈 차트            | 키워드 등록/수집 전                                  |
| 인사이트      | 빈 카드            | AI 분석 전에는 인사이트 없음                         |
| 리포트        | 빈 리포트          | 데이터 없으면 리포트 생성 불가                       |

### 대응 방안

- **모든 빈 상태에 Empty State 컴포넌트 표시**
- **최소 데이터 기준 안내**: "차트를 보려면 최소 7일 이상 데이터가 필요합니다"
- **점진적 공개**: 데이터가 축적되면 기능 활성화
- **숫자 포맷 통일**: `formatCount()` 유틸리티 확인/보강

---

## 7. Mock → Real 전환 우선순위

### Phase 1: 핵심 데이터 파이프라인 (1-2주)

| 순서 | 작업                                 | 의존성                |
| ---- | ------------------------------------ | --------------------- |
| 1-1  | PostgreSQL + Prisma 설정 완료        | Docker 또는 Supabase  |
| 1-2  | channel-service.ts → Prisma DB 전환  | DB 연결               |
| 1-3  | 채널 등록 → 자동 데이터 수집 트리거  | sync-service          |
| 1-4  | Cron 설정 (일일 스냅샷 수집)         | Vercel Cron 또는 로컬 |
| 1-5  | 대시보드 KPI → 등록 채널 집계로 전환 | 스냅샷 데이터         |

### Phase 2: AI + 댓글 (2-3주)

| 순서 | 작업                             | 의존성        |
| ---- | -------------------------------- | ------------- |
| 2-1  | AI_DEV_MODE=false 전환           | API 키        |
| 2-2  | 댓글 수집 파이프라인 구현        | 플랫폼 API    |
| 2-3  | 댓글 → AI 감성 분석 연결         | AI 프로바이더 |
| 2-4  | 채널 인사이트 → AI 생성으로 전환 | AI 프로바이더 |
| 2-5  | Intent 엔진 → 키워드 페이지 연결 | UI 작업       |

### Phase 3: 부가 기능 (3-4주)

| 순서 | 작업                         | 의존성        |
| ---- | ---------------------------- | ------------- |
| 3-1  | 경쟁 채널 저장 + 데이터 수집 | DB + sync     |
| 3-2  | 리포트 AI 생성 + DB 저장     | AI + DB       |
| 3-3  | 이메일 발송 연동 (Resend)    | Resend 계정   |
| 3-4  | Stripe 결제 연동             | Stripe 계정   |
| 3-5  | 사용량 추적/제한             | DB + 미들웨어 |

### Phase 4: 운영 안정화 (4-6주)

| 순서 | 작업                       | 의존성      |
| ---- | -------------------------- | ----------- |
| 4-1  | Redis + BullMQ 비동기 작업 | Redis 서버  |
| 4-2  | 리포트 스케줄러 실제 동작  | BullMQ      |
| 4-3  | 관리자 대시보드 실데이터   | DB 집계     |
| 4-4  | 알림 시스템                | 이메일 + DB |
| 4-5  | 모니터링/로깅              | 운영 도구   |

---

## 8. API 키 설정 가이드 (사용자용)

### YouTube (가장 쉬움, 무료)

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성
3. "API & Services" → "YouTube Data API v3" 활성화
4. "Credentials" → "API Key" 생성
5. `.env.local`에 `YOUTUBE_API_KEY="AIza..."` 추가

### Instagram (Business 계정 필요)

1. [Meta for Developers](https://developers.facebook.com) 접속
2. 앱 생성 → Instagram Graph API 추가
3. Business 계정 연동
4. 액세스 토큰 발급 (60일 유효, 갱신 필요)
5. `.env.local`에 `INSTAGRAM_ACCESS_TOKEN="EAA..."` 추가

### TikTok (개발자 계정 필요)

1. [TikTok Developer Portal](https://developers.tiktok.com) 접속
2. 앱 생성 → Display API 신청
3. 심사 통과 후 토큰 발급
4. `.env.local`에 `TIKTOK_ACCESS_TOKEN="..."` 추가

### X/Twitter (유료, $100/월~)

1. [developer.x.com](https://developer.x.com) 접속
2. Basic 이상 플랜 구독 ($100/월)
3. 프로젝트 생성 → Bearer Token 발급
4. `.env.local`에 `X_API_BEARER_TOKEN="AAA..."` 추가

### AI (OpenAI 또는 Anthropic)

1. [OpenAI](https://platform.openai.com) 또는 [Anthropic](https://console.anthropic.com)
2. API 키 발급
3. `.env.local`에 키 추가 + `AI_DEV_MODE="false"` 설정
