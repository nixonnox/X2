# Persistence Smoke Test Report

> Date: 2026-03-15
> Status: ALL PASSED

## 테스트 환경

- DB: PostgreSQL 16 (Docker `x2-postgres`)
- Database: `x2` on `localhost:5432`
- 방법: SQL INSERT → SELECT 검증 → DELETE cleanup

## 테스트 결과

### Intelligence

| Test | Table | Operation | Result |
|------|-------|-----------|--------|
| 분석 결과 저장 | `intelligence_analysis_runs` | INSERT + SELECT | PASS |
| 키워드 히스토리 저장 | `intelligence_keywords` | INSERT + SELECT | PASS |
| A/B 비교 저장 | `intelligence_comparison_runs` | INSERT + SELECT | PASS |

**검증 데이터:**
- seedKeyword: `스킨케어`, industryType: `BEAUTY`, confidence: `0.85`
- JSONB 필드 (signalQuality, fusionResult, comparisonResult) 정상 저장/조회

### Notification

| Test | Table | Operation | Result |
|------|-------|-----------|--------|
| 알림 저장 | `notifications` | INSERT + SELECT | PASS |
| 알림 설정 저장 | `user_alert_preferences` | INSERT + SELECT | PASS |

**검증 데이터:**
- type: `RISK_DETECTED`, priority: `HIGH`, isRead: `false`
- channelInApp: `true`, maxAlertsPerDay: `20`, globalCooldownMinutes: `60`

### Foreign Key 무결성

| Relation | Status |
|----------|--------|
| `intelligence_analysis_runs` → `projects` | OK (CASCADE) |
| `intelligence_keywords` → `projects` | OK (CASCADE) |
| `notifications` → `users` | OK (CASCADE) |
| `user_alert_preferences` → `users` | OK (UNIQUE) |
| `delivery_logs` → `automation_executions` | OK (CASCADE) |

## 서비스 레이어 Persistence 현황

| Service | Prisma 사용 | Mock 여부 |
|---------|------------|-----------|
| IntelligencePersistenceService | YES | NO |
| IntelligenceAlertService | YES | NO |
| NotificationRepository | YES | NO |
| NotificationService | YES (via repo) | NO |
| KeywordRepository | YES | NO |
| BaseRepository | YES (abstract) | NO |
| **ChannelDispatchService** | **NO** | **YES (in-memory log)** |

> ChannelDispatchService는 외부 배달 오케스트레이션용이며, delivery_logs 테이블과 연결되지 않음.
> 이것은 향후 연결이 필요한 blocker로 기록.

## Cleanup

모든 smoke test 데이터는 테스트 완료 후 삭제됨.
