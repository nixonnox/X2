# Release & Rollback Strategy (Phase 10)

## 점진적 오픈 전략

### Phase A: 내부 테스트 (Alpha)

**대상**: 개발팀 + QA
**범위**:

- YouTube 채널 연결 및 수집
- 규칙 기반 분석 (AI 미사용)
- 대시보드 기본 화면
- 리포트 생성 (발송 제외)

**Feature Flags**:

```
automationEnabled: false
alertAutomationEnabled: false
webhookIntegrationEnabled: false
geoAeoEnabled: false
competitorTrackingEnabled: false
```

### Phase B: 제한 오픈 (Beta)

**대상**: 초대 사용자 (10~30명)
**추가 범위**:

- 자동화 규칙 (PRO 플랜)
- IN_APP 알림
- 리포트 자동 생성 + 이메일 발송
- GEO/AEO 기본 점수 표시

**Feature Flags**:

```
automationEnabled: true
alertAutomationEnabled: true
geoAeoEnabled: true
```

### Phase C: 공개 오픈 (GA)

**대상**: 전체
**추가 범위**:

- BUSINESS 플랜 기능
- Slack 웹훅
- 캠페인 자동화
- 경쟁사 추적

---

## 기능 활성화 순서

```
1. DB Migration 적용
   ├─ AutomationRule, AutomationExecution, DeliveryLog 테이블
   └─ Workspace 자동화 필드 추가

2. 수집 파이프라인 활성화
   ├─ YouTube (이미 동작)
   └─ 다른 플랫폼은 API 준비 후 개별 활성화

3. 분석 엔진 활성화
   ├─ 규칙 기반 엔진 (즉시)
   └─ AI 기반 엔진 (LLM API 연동 후)

4. 자동화 활성화
   ├─ ScheduleRegistry (규칙 CRUD)
   ├─ TriggerEvaluation (조건 평가)
   ├─ ReportAutomation (리포트)
   ├─ AlertAutomation (알림)
   └─ 나머지 도메인 서비스 (순차 활성화)

5. 발송 채널 활성화
   ├─ IN_APP (즉시)
   ├─ EMAIL (SendGrid 연동 후)
   ├─ SLACK_WEBHOOK (연동 후)
   └─ CUSTOM_WEBHOOK (BUSINESS 플랜 전용)
```

---

## Rollback 시나리오

### DB Migration Rollback

- Prisma migrate 기반: `prisma migrate resolve --rolled-back`
- Phase 9 테이블은 독립적이므로 기존 기능에 영향 없음
- rollback 시 자동화 데이터 유실 가능 → 백업 필수

### Feature Rollback

- `Workspace.automationEnabled = false` → 자동화 전체 비활성화
- `AutomationRule.isEnabled = false` → 개별 규칙 비활성화
- 즉시 적용, DB 변경만으로 rollback 가능

### 코드 Rollback

- Vercel 배포: 이전 deployment로 즉시 롤백 가능
- Git tag 기반: `git checkout v0.9.x` → 재배포

### 수집 Rollback

- `ScheduledJob` 비활성화로 수집 중단
- 기존 수집 데이터는 보존
- Circuit Breaker가 자동으로 문제 있는 커넥터 차단

---

## 부분 배포 전략

### Vercel Preview Deployments

- PR별 프리뷰 환경에서 개별 기능 테스트
- 프로덕션과 동일한 DB 스키마 (staging DB 사용)

### Environment 분리

```
development → local DB, AUTH_DEV_LOGIN=true
staging     → staging DB, 실제 OAuth, YouTube API
production  → production DB, 모든 시크릿 설정
```

---

## 배포 체크리스트

- [ ] DB migration 적용 확인
- [ ] 환경변수 모두 설정 확인 (특히 AUTH_SECRET, CRON_SECRET)
- [ ] AUTH_DEV_LOGIN이 설정되지 않았음을 확인
- [ ] YouTube API 키 유효성 확인
- [ ] 수집 cron 작업 정상 동작 확인
- [ ] 대시보드 로딩 정상 확인
- [ ] 로그인/로그아웃 정상 확인
- [ ] Vercel 이전 deployment 롤백 경로 확인
