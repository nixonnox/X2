# Backlog Dedup Master Audit

> Date: 2026-03-16
> 전체 작업 수: 42개 (기능 축 10개로 묶음)

## 기능 축별 작업 묶음

### 축 1: Intelligence Persistence / History / Compare
| # | 작업 | 중복? |
|---|------|-------|
| 1.1 | PostgreSQL 연결 + Prisma migration | — |
| 1.2 | History UI 연결 (AnalysisHistoryPanel) | — |
| 1.3 | CurrentVsPrevious 비교 패널 | 1.2와 같은 구현 세션 |
| 1.4 | Compare 페이지 period_vs_period | 1.2와 같은 구현 세션 |
| 1.5 | History query 종속성 수정 (S1) | 1.2 검증에서 발견→수정 |

### 축 2: Social Provider Runtime
| # | 작업 | 중복? |
|---|------|-------|
| 2.1 | YouTube adapter | 이전에 구현됨 (세션 이전) |
| 2.2 | Instagram adapter | 이전에 구현됨 (토큰 미발급) |
| 2.3 | TikTok adapter (scaffold) | 이전에 구현됨 (승인 필요) |
| 2.4 | X adapter | 이전에 구현됨 ($100/월 필요) |
| 2.5 | Provider coverage 확장 문서화 | 이번 세션 |

### 축 3: Alert Engine / Cooldown / Threshold / Prefs
| # | 작업 | 중복? |
|---|------|-------|
| 3.1 | maxAlertsPerDay 일일 한도 | 이미 구현됨 확인 + UTC 수정 + 보수적 처리 |
| 3.2 | Channel prefs → dispatch 연결 | 구현 + 검증 |
| 3.3 | IntelligenceAlertService prefs 연동 | 구현 + 검증 |
| 3.4 | DEFAULT_COOLDOWNS → DEFAULT_TYPE_COOLDOWNS | 3.3의 일부 |
| 3.5 | Cooldown/dedup/daily cap 정합성 | 3.1-3.3 통합 검증 |
| **중복:** 3.3과 3.4는 동일 작업. 3.5는 3.1-3.3의 통합 검증 |

### 축 4: Notification UI / Bell / History Page
| # | 작업 | 중복? |
|---|------|-------|
| 4.1 | Bell dropdown | 이전에 구현됨 (세션에서 확인) |
| 4.2 | /notifications 페이지 | 이전에 구현됨 |
| 4.3 | /settings/notifications | 이전에 구현됨 |
| 4.4 | Bell UX 문구 개선 | 이번 세션 |

### 축 5: Delivery / Email / Webhook / Retry / Log
| # | 작업 | 중복? |
|---|------|-------|
| 5.1 | ChannelDispatchService prisma 주입 | 구현 |
| 5.2 | Persistent delivery log | 구현 (structured log + emailSentAt) |
| 5.3 | External delivery retry (5/15/60분) | 구현 |
| 5.4 | Webhook test POST | 구현 |
| 5.5 | delivery_logs FK 제약 | **미해결 S1** |
| 5.6 | setTimeout → BullMQ delayed | **미해결 S1** |

### 축 6: UX Policy / Writing / Empty State / Card Selection
| # | 작업 | 중복? |
|---|------|-------|
| 6.1 | 전역 UX 정책 파일 (5개) | ~/.claude/ |
| 6.2 | X2 프로젝트 UX 문서 (6개) | docs/shared/ |
| 6.3 | Intelligence 메인 문구 교체 | 13개 파일 |
| 6.4 | Compare 비교 타입 카드 선택 | 구현 |
| 6.5 | 업종 선택 카드 | 구현 |
| 6.6 | IntelligenceStatePanel 문구 | 구현 |
| 6.7 | LiveMentionStatusPanel 문구 | 구현 |
| 6.8 | BenchmarkTrendChart 문구 | 구현 |
| 6.9 | /notifications 문구 | 구현 |
| 6.10 | /settings/notifications 문구 | 구현 |
| 6.11 | Dashboard 문구 | 구현 |

### 축 7: Scheduled Collection / Snapshot Auto-gen
| # | 작업 | 중복? |
|---|------|-------|
| 7.1 | BullMQ queue 패키지 | 구현 |
| 7.2 | Collection worker | 구현 |
| 7.3 | Snapshot worker | 구현 |
| 7.4 | Scheduler (cron 등록) | 구현 |
| 7.5 | JobType enum 불일치 | **미해결 S1** |

### 축 8: Retention / Backfill
| # | 작업 | 중복? |
|---|------|-------|
| 8.1 | 90일 retention policy | 구현 |
| 8.2 | Retention cleanup job | 구현 |
| 8.3 | Backfill service | 구현 |
| 8.4 | Backfill worker | 구현 |

### 축 9: Project-Scoped Settings / Audit
| # | 작업 | 중복? |
|---|------|-------|
| 9.1 | UserAlertPreference projectId 추가 | DB push 완료 |
| 9.2 | prisma generate | **미완료** (dev 서버 잠금) |
| 9.3 | notification router projectId 파라미터 | **미구현** |
| 9.4 | 설정 변경 감사 로그 | 구현 |

### 축 10: Sentiment / AI
| # | 작업 | 중복? |
|---|------|-------|
| 10.1 | @x2/ai 패키지 (Anthropic SDK) | 구현 |
| 10.2 | MentionSentimentAnalysisService | 구현 |
| 10.3 | LiveMentionBridge 연동 | 구현 |
