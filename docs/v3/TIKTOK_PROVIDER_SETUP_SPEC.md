# TikTok Provider Setup Spec

> Date: 2026-03-16
> Status: ADAPTER 구현 완료 (SCAFFOLD), Research API 승인 필요

## 현재 상태

| 항목 | 상태 |
|------|------|
| Adapter 구현 | DONE (SCAFFOLD) — `tiktok-research-api.adapter.ts` |
| Registry 등록 | DONE — 자동 등록됨 |
| 토큰 | **미발급** — Research API 승인 필요 |
| 실제 API 호출 | **불가** — 승인 + 토큰 없음 |
| isConfigured() | `false` |

## API 선택지

| API | 용도 | 키워드 검색 | 승인 필요 |
|-----|------|-----------|----------|
| **Research API** | 영상/댓글 키워드 검색 | **가능** | 별도 승인 (학술/상업) |
| Display API | 자체 콘텐츠 조회 | 불가 | OAuth만 |
| Content Posting API | 게시 | 불가 | OAuth |

**X2에는 Research API가 필요합니다** (키워드 검색 필수).

## Research API 승인 절차

### 1단계: TikTok 개발자 계정
1. https://developers.tiktok.com 접속
2. 개발자 계정 등록 (비즈니스 이메일)

### 2단계: Research API 신청
1. "Research API" 제품 신청
2. 신청 양식:
   - **Organization**: 회사명
   - **Use Case**: "Social listening and brand intelligence for Korean market"
   - **Data Usage**: "Keyword-based mention collection for brand monitoring"
   - **Expected Volume**: "~1000 queries/day"
3. 승인 대기 (보통 2~4주)

### 3단계: 토큰 발급 (승인 후)
1. 앱 생성 → Client Key + Client Secret 발급
2. Client Credentials 방식으로 Access Token 발급:
   ```
   POST https://open.tiktokapis.com/v2/oauth/token/
   Content-Type: application/x-www-form-urlencoded

   client_key={client_key}
   &client_secret={client_secret}
   &grant_type=client_credentials
   ```
3. `.env.local`에 설정:
   ```
   TIKTOK_ACCESS_TOKEN="act.xxxxxxx..."
   ```

### 4단계: 토큰 갱신
- Client Credentials Token은 자동 갱신 가능 (서버 간 통신)
- 만료 시 재발급 (동일 API 호출)

## API 엔드포인트 (Research API)

| 엔드포인트 | 용도 | Rate Limit |
|-----------|------|-----------|
| `POST /v2/research/video/query` | 키워드 기반 영상 검색 | 100/min |
| `POST /v2/research/video/comment/list` | 영상별 댓글 | 100/min |

## 제약사항

| 제약 | 내용 |
|------|------|
| API 승인 | **Research API 별도 신청 필수** (가장 큰 blocker) |
| 데이터 범위 | 최근 30일 |
| 검색 언어 | 지정 가능 (한국어 "ko") |
| 댓글 접근 | 영상 ID별 조회 (검색 결과에서 추출) |
| Display API | 키워드 검색 불가 — X2에 부적합 |
