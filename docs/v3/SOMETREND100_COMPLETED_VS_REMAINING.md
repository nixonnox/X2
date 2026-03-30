# Sometrend 100%: Completed vs Remaining

> Date: 2026-03-16

## 완료 + 검증 완료 (제외 가능)

| Phase | 기능 | 구현 | 검증 |
|-------|------|------|------|
| Base | DB/History/Compare/Bell/UX/Alert/Retention/Backfill | ✅ | ✅ |
| S-1 | 주별/월별 추이 + 채널별 시계열 + YouTube 대시보드 | ✅ | ✅ |
| S-2 | 연관어 맵 + CSV 다운로드 | ✅ | ✅ |
| S100-1 | 시간별 추이 + spike detection + 이슈 히스토리 | ✅ | ✅ |
| S100-2 | 연관어 변화 + 감성 연관어 + 속성 분석 | ✅ | ✅ |
| S100-3 | 채널/콘텐츠 랭킹 + 화제성 지표 | ✅ | ✅ |
| S100-4 | 원문 drill-down + evidence | ✅ | ✅ |
| S100-5 | 네이버 블로그/뉴스 adapter | ✅ | ✅ |
| S100-6 | 외부 REST API + 플랜 게이트 | ✅ | ✅ |
| Alert | maxAlertsPerDay + channel prefs + retry(BullMQ) + audit | ✅ | ✅ |

## 아직 남은 것

| 항목 | 수준 | 이유 |
|------|------|------|
| 네이버 카페 데이터 | 보류 | API 폐지, 합법적 경로 없음 |
| 커뮤니티(디시/에펨) | 보류 | 크롤링 금지 |
| 차트 이미지 캡처 다운로드 | S3 | SVG→PNG export 미구현 |
| API key 발급/관리 UI | S2 | 간단 인증만 |
| Rate limit middleware | S2 | Redis sliding window 미구현 |
| Stripe 실제 결제 | S2 | 필드만 존재 |
| 연관어 기간 선택기 UI | S3 | 7일 고정 |
| 업종별 속성 차별화 | S3 | 5속성 동일 적용 |
| 기간별 랭킹 변동 추적 | S3 | 단일 시점만 |
| 차트 포인트→원문 직접 연결 | S3 | 탭 이동으로 우회 |
| Settings UI 프로젝트 드롭다운 | S2 | API는 지원 |
| EmptyState 공통 컴포넌트 | S3 | 문구는 적용, 추출 미완 |
