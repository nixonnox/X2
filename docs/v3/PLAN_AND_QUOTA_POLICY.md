# Plan & Quota Policy

> Date: 2026-03-16

## 기존 플랜 구조 (DB에 이미 존재)

| 필드 | FREE | PRO | BUSINESS |
|------|------|-----|----------|
| maxChannels | 3 | 10+ | 50+ |
| maxContentsPerMonth | 500 | 5000 | 50000 |
| maxCommentsPerMonth | 1000 | 10000 | 100000 |
| maxAiTokensPerDay | 5000 | 50000 | 500000 |
| maxMembers | 1 | 5 | 20 |
| maxReportsPerMonth | 3 | 30 | 무제한 |
| canExportData | ❌ | ✅ | ✅ |
| **canAccessApi** | **❌** | **❌** | **✅** |
| maxVerticalPacks | 0 | 3 | 10 |

## API 접근 정책

- `canAccessApi = true` → External API 사용 가능
- `canAccessApi = false` → 401/403 거부
- 현재: BUSINESS 플랜만 API 접근

## 다운로드 정책

- CSV 다운로드: `canExportData = true` (PRO+)
- API 데이터 추출: `canAccessApi = true` (BUSINESS)
- 차트 이미지: 모든 플랜 (클라이언트 캡처)

## 향후 확장

| 항목 | 설명 |
|------|------|
| API key 발급/관리 UI | /settings/api-keys |
| Rate limit 미들웨어 | Redis 기반 sliding window |
| Usage tracking | 일별 API 호출 수 기록 |
| Webhook 고급 관리 | 이벤트 타입별 웹훅 |
