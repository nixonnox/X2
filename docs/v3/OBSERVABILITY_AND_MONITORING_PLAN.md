# Observability & Monitoring Plan (Phase 10)

## 현재 로깅 상태

| 영역            | 로깅 방식                    | 저장소                  | 문제점              |
| --------------- | ---------------------------- | ----------------------- | ------------------- |
| 수집 파이프라인 | `CollectionLogStore`         | in-memory (최대 500건)  | 서버 재시작 시 유실 |
| 분석 엔진       | `AnalyticsExecutionLog`      | in-memory (최대 1000건) | 서버 재시작 시 유실 |
| 자동화 실행     | `AutomationExecution` 테이블 | PostgreSQL              | ✅ 영속 저장        |
| 발송 기록       | `DeliveryLog` 테이블         | PostgreSQL              | ✅ 영속 저장        |
| 서비스 로그     | `consoleLogger`              | stdout                  | 구조화 미적용       |

---

## 관제 포인트

### 1. 수집 건강 상태

| 지표                 | 소스                                         | 확인 방법                 |
| -------------------- | -------------------------------------------- | ------------------------- |
| 최근 수집 시각       | `ScheduledJob.lastRunAt`                     | ops-monitoring.service.ts |
| 수집 성공률          | `CollectionLogStore`                         | 최근 100건 중 성공 비율   |
| 실패 파이프라인 수   | `ScheduledJob` (status=FAILED)               | DB 직접 조회              |
| Circuit Breaker 상태 | `HealthTracker`                              | in-memory (API 필요)      |
| 커넥터 건강          | YouTube ✅ / Instagram ⚠️ / TikTok ⚠️ / X ⚠️ | 3개 플랫폼 스텁           |

### 2. 분석 품질 상태

| 지표                   | 소스                    | 확인 방법                 |
| ---------------------- | ----------------------- | ------------------------- |
| 엔진별 confidence 분포 | `AnalyticsExecutionLog` | 평균/최소 confidence      |
| low confidence 비율    | Quality Flags           | `needsHumanReview` 카운트 |
| 엔진 실행 시간         | `AnalyticsExecutionLog` | P95 응답 시간             |
| fallback 사용 비율     | Quality Flags           | `usedFallback` 카운트     |

### 3. 자동화 실행 상태

| 지표              | 소스                            | 확인 방법                       |
| ----------------- | ------------------------------- | ------------------------------- |
| 실행 성공/실패 수 | `AutomationExecution`           | `getExecutionStats()`           |
| 중복 방지 건수    | `AutomationExecution` (SKIPPED) | status별 카운트                 |
| 재시도 큐 크기    | `AutomationExecution`           | status=FAILED, nextRetryAt 미래 |
| 비활성화된 규칙   | `AutomationRule`                | isEnabled=false 카운트          |

### 4. 발송 상태

| 지표           | 소스                    | 확인 방법                   |
| -------------- | ----------------------- | --------------------------- |
| 발송 성공률    | `DeliveryLog`           | DELIVERED / 전체 비율       |
| 실패 발송 수   | `DeliveryLog` (FAILED)  | 채널별 분류                 |
| 재시도 대기 수 | `DeliveryLog`           | retryCount < 3, nextRetryAt |
| BOUNCED 수     | `DeliveryLog` (BOUNCED) | 수신자별 분류               |

### 5. 사용량/과금 상태

| 지표                | 소스                            | 확인 방법             |
| ------------------- | ------------------------------- | --------------------- |
| 월간 리포트 생성 수 | `InsightReport`                 | 워크스페이스별 카운트 |
| 월간 자동화 실행 수 | `AutomationExecution`           | 워크스페이스별 카운트 |
| 플랜 한도 초과 수   | `AutomationExecution` (SKIPPED) | reason 필터           |

---

## 개선 권장 사항

### 단기 (출시 전)

1. 수집/분석 로그를 DB로 전환 (in-memory → PostgreSQL 테이블)
2. `consoleLogger`를 구조화 로거(pino)로 교체
3. admin 대시보드에 위 관제 포인트 요약 화면 추가

### 중기 (출시 후 1개월)

1. Sentry 또는 동등한 에러 트래킹 서비스 연동
2. Vercel Analytics / Web Vitals 연동
3. Uptime monitoring (수집 cron, API 엔드포인트)

### 장기 (출시 후 3개월)

1. Grafana + PostgreSQL 대시보드 (실행 통계, 수집 건강)
2. PagerDuty/Slack 알림 연동 (CRITICAL 장애 자동 에스컬레이션)
3. Log aggregation (CloudWatch, Datadog 등)
