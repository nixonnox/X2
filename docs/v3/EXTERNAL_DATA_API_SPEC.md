# External Data API Spec

> Date: 2026-03-16

## Endpoint

```
GET /api/v1/intelligence?action={action}&keyword={keyword}&days={days}
```

## 인증

```
Authorization: Bearer {api_key}
```

## Actions

### trend — 소셜 반응 추이
```
GET /api/v1/intelligence?action=trend&keyword=스킨케어&days=30
```
```json
{
  "keyword": "스킨케어",
  "days": 30,
  "data": [
    { "date": "2026-03-01", "totalCount": 45, "positive": 20, "negative": 5, "neutral": 15, "buzzLevel": "MODERATE" }
  ],
  "count": 30
}
```

### mentions — 원문 리스트
```
GET /api/v1/intelligence?action=mentions&keyword=스킨케어&days=7&limit=10
```
```json
{
  "data": [
    { "platform": "YOUTUBE", "text": "...", "author": "...", "sentiment": "POSITIVE", "url": "..." }
  ]
}
```

### sentiment — 감성 분포
```
GET /api/v1/intelligence?action=sentiment&keyword=스킨케어&days=30
```
```json
{
  "data": { "total": 150, "positive": 80, "negative": 20, "neutral": 50 }
}
```

## 에러 응답

| Status | Code | 설명 |
|--------|------|------|
| 401 | UNAUTHORIZED | Bearer token 없음/잘못됨 |
| 403 | PLAN_RESTRICTED | API 접근 불가 플랜 |
| 400 | MISSING_PARAM | keyword 누락 |
| 400 | INVALID_ACTION | 잘못된 action |
| 500 | INTERNAL_ERROR | 서버 오류 |

## Rate Limit (향후)

| 플랜 | 일일 한도 |
|------|----------|
| FREE | 0 (API 비활성) |
| PRO | 1,000 |
| BUSINESS | 10,000 |
