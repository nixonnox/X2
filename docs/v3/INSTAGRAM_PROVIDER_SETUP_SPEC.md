# Instagram Provider Setup Spec

> Date: 2026-03-16
> Status: ADAPTER 구현 완료, 토큰 발급 필요

## 현재 상태

| 항목 | 상태 |
|------|------|
| Adapter 구현 | DONE — `instagram-graph-api.adapter.ts` |
| Registry 등록 | DONE — `LiveSocialMentionBridgeService`에서 자동 등록 |
| 토큰 | **미발급** — `INSTAGRAM_ACCESS_TOKEN` 환경변수 비어있음 |
| 실제 API 호출 | **불가** — 토큰 없음 |
| isConfigured() | `false` |
| testConnection() | `{ ok: false, error: "INSTAGRAM_ACCESS_TOKEN 미설정" }` |

## 토큰 발급 절차

### 1단계: Facebook 개발자 앱 생성
1. https://developers.facebook.com 접속
2. "앱 만들기" → "비즈니스" 유형 선택
3. Instagram Graph API 제품 추가

### 2단계: Instagram Business 계정 연결
1. Instagram 앱에서 "프로페셔널 계정으로 전환" (Business 또는 Creator)
2. Facebook Page와 Instagram Business 계정 연결
3. 개발자 앱에서 "Instagram 계정 추가"

### 3단계: Access Token 발급
1. Graph API Explorer (https://developers.facebook.com/tools/explorer)
2. 앱 선택 → 권한 추가:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `pages_show_list`
   - `pages_read_engagement`
3. "Generate Access Token" → Short-lived Token 발급 (1시간)
4. Long-lived Token으로 교환:
   ```
   GET /oauth/access_token?grant_type=fb_exchange_token
     &client_id={app-id}
     &client_secret={app-secret}
     &fb_exchange_token={short-lived-token}
   ```
5. Long-lived Token (60일 유효)을 `.env.local`에 설정:
   ```
   INSTAGRAM_ACCESS_TOKEN="EAAxxxxxxx..."
   ```

### 4단계: 토큰 갱신 (60일마다)
- Long-lived Token은 60일 후 만료
- 만료 전에 갱신 필요:
  ```
  GET /oauth/access_token?grant_type=fb_exchange_token
    &client_id={app-id}
    &client_secret={app-secret}
    &fb_exchange_token={current-long-lived-token}
  ```
- **현재 자동 갱신 미구현** (S2 과제)

## API 엔드포인트

| 엔드포인트 | 용도 | Rate Limit |
|-----------|------|-----------|
| `GET /me/accounts` | IG Business Account ID 조회 | — |
| `GET /ig_hashtag_search` | 해시태그 ID 조회 | 30/user/7days |
| `GET /{hashtagId}/recent_media` | 최근 미디어 조회 (7일) | 30/user/7days |

## 제약사항

| 제약 | 내용 |
|------|------|
| 계정 유형 | Business 또는 Creator 계정만 |
| Facebook Page | 반드시 연결 필요 |
| 데이터 범위 | 최근 7일만 |
| 해시태그 검색 | 7일 내 30회 제한 |
| 작성자 정보 | Hashtag search에서는 미제공 |
| API 버전 | v19.0 (6개월마다 deprecation 체크 필요) |
