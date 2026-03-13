# Launch Readiness Checklist (Phase 10)

## 핵심 유저저니

- [x] 로그인/로그아웃 (Google, Kakao, Naver OAuth)
- [x] 워크스페이스 생성 및 멤버 초대
- [x] 질문형 시작 허브 (`/start`)
- [x] 3경로 분리 (소셜/리스닝/댓글)
- [x] YouTube 채널 연결 및 데이터 수집
- [ ] 대시보드 실데이터 KPI 표시 (현재 Mock)
- [x] 인사이트/액션/리포트 한 흐름
- [x] 리포트 생성 및 섹션 구성
- [ ] 리포트 이메일 발송 (현재 Mock)

## 실데이터 수집

- [x] YouTube Provider 완전 동작
- [x] 수집 파이프라인 (CollectionRunner, PlatformAdapter)
- [x] Circuit Breaker (5회 실패 시 차단)
- [x] Retry 정책 (지수 백오프, 최대 3회)
- [ ] Instagram Provider (스텁)
- [ ] TikTok Provider (스텁)
- [ ] X(Twitter) Provider (스텁)
- [ ] BullMQ 큐 연동

## 분석 엔진

- [x] Confidence Scoring 프레임워크
- [x] Quality Flags 체계
- [x] 규칙 기반 분석 엔진 동작
- [ ] AI/LLM 기반 분석 (Claude Haiku 미연동)
- [ ] LLM fallback 체인 실동작
- [x] 엔진 실행 로깅

## 리포트 생성/전달

- [x] InsightReport 생성 + 섹션 구성
- [x] Evidence 연결 (채널 스냅샷, 리스크, FAQ, 댓글)
- [x] DRAFT → PUBLISHED 자동 전이
- [x] DeliveryLog 생성
- [ ] 실제 이메일 발송 (SendGrid/Resend)
- [ ] PDF/PPT 내보내기

## 자동화 시스템

- [x] AutomationRule CRUD
- [x] 멱등성 키 기반 중복 방지
- [x] 쿨다운 기반 과잉 실행 방지
- [x] 플랜별 접근 제어 (FREE/PRO/BUSINESS)
- [x] 실행 이력 기록 (AutomationExecution)
- [x] 발송 재시도 (지수 백오프, 3회)
- [ ] BullMQ 워커 연결 (스케줄 트리거)
- [ ] WebSocket 실시간 알림
- [ ] Slack 웹훅 실연동

## Admin/Ops 관제

- [x] 수집 상태 확인 가능 (ops-monitoring.service.ts)
- [x] 자동화 실행 통계 조회 가능
- [x] 발송 상태 추적 가능
- [ ] 관제 대시보드 UI
- [ ] 에러 알림 자동 발송

## 보안/권한

- [x] OAuth 인증 (3 providers)
- [x] Role-based access control (4 roles)
- [x] Plan-based automation control
- [x] AUTH_DEV_LOGIN NODE_ENV 가드 ✅
- [x] CRON_SECRET 프로덕션 필수화 ✅
- [x] API Rate Limiting ✅ Edge middleware IP 기반 rate limiter 추가
- [x] 하드코딩된 시크릿 없음
- [x] Workspace isolation

## 한국어 UX

- [x] 알림 메시지 한국어 (⚠️, 📊, ❓, 🔴, 📉 접두어)
- [x] 서비스 로그 한국어
- [x] 시작 허브 질문형 한국어 문구
- [ ] 에러 메시지 한국어 표준화

## 데이터 품질 표시

- [x] DataStatusBar 컴포넌트 (부분 실패, low confidence)
- [x] stale data 표시 구조
- [x] "데모 데이터" 배너 (Mock 사용 화면) ✅ DemoBanner 컴포넌트 추가

## Rollback 준비

- [x] Vercel 이전 deployment 롤백 가능
- [x] Feature flag로 자동화 비활성화 가능
- [x] DB migration 독립적 (기존 기능 영향 없음)

---

## 오픈 판정

| 항목          | 상태                     | 판정                  |
| ------------- | ------------------------ | --------------------- |
| 핵심 유저저니 | 부분 완료 (Mock 데이터)  | ⚠️ 제한 오픈          |
| YouTube 수집  | 완전 동작                | ✅ 오픈 가능          |
| 분석 엔진     | 규칙 기반만 동작         | ⚠️ 제한 오픈          |
| 자동화        | 구조 완성, 인프라 미연결 | ❌ 비활성화 상태 오픈 |
| 보안          | CRITICAL 수정 완료       | ✅ 오픈 가능          |
| 관제          | 데이터만 있고 UI 없음    | ⚠️ 제한 오픈          |

**종합 판정**: YouTube 수집 + 규칙 기반 분석 + 리포트 생성 범위로 **Alpha/Beta 제한 오픈 가능**
