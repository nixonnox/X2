# Prisma Migration Apply Report

> Date: 2026-03-15
> Status: APPLIED

## 1. Migration 실행 내역

| Migration | Timestamp | Status |
|-----------|-----------|--------|
| `20260315132456_init` | 2026-03-15 13:24:56 | Applied |

## 2. 적용 방식

- **방식:** `prisma migrate dev --name init`
- **이유:** 최초 migration. 기존 migration 디렉토리에 빈 폴더 + manual SQL만 존재하여 정리 후 clean migration 수행.
- `prisma generate` 자동 실행 완료 (Prisma Client v6.19.2)

## 3. 생성된 테이블 (62개)

### Intelligence 관련
| Table | Purpose |
|-------|---------|
| `intelligence_analysis_runs` | 분석 실행 결과 (signalQuality, fusionResult, confidence 등) |
| `intelligence_keywords` | 사용자별 키워드 히스토리 (isSaved, analysisCount, lastConfidence) |
| `intelligence_comparison_runs` | A/B 비교 및 기간 비교 결과 |
| `benchmark_snapshots` | 벤치마크 비교 스냅샷 |
| `social_mention_snapshots` | 소셜 멘션 집계 스냅샷 |

### Notification 관련
| Table | Purpose |
|-------|---------|
| `notifications` | 알림 히스토리 (type, priority, isRead, channels) |
| `user_alert_preferences` | 사용자 알림 설정 (임계값, 쿨다운, 일일 최대) |
| `delivery_logs` | 외부 채널 배달 이력 (email, webhook) |
| `automation_rules` | 자동화 트리거 규칙 |
| `automation_executions` | 자동화 실행 로그 |

### Keyword / History 관련
| Table | Purpose |
|-------|---------|
| `keywords` | 추적 키워드 마스터 |
| `keyword_metrics_daily` | 일별 키워드 메트릭 (volume, trend, changeRate) |
| `keyword_cluster_results` | 키워드 클러스터 분석 결과 |
| `intent_queries` | 검색 의도 쿼리 |
| `intent_keyword_results` | 의도 분석 결과 |

### Auth / Core
| Table | Purpose |
|-------|---------|
| `users`, `accounts`, `sessions` | Auth.js 인증 |
| `workspaces`, `workspace_members` | 워크스페이스 |
| `projects` | 프로젝트 |
| `channels`, `channel_connections`, `channel_snapshots` | 채널 관리 |

## 4. manual SQL 백업

- `prisma/manual_backup/add_listening_mind_models.sql` — 기존 manual migration 백업 보관
- 향후 필요 시 별도 migration으로 통합 가능

## 5. 다음 migration 실행 방법

```bash
cd packages/db
pnpm migrate:dev --name <migration_name>
```
