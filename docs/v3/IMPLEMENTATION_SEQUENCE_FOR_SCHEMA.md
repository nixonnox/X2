# IMPLEMENTATION_SEQUENCE_FOR_SCHEMA — DB 스키마 적용 순서

> 작성일: 2026-03-10
> 상태: 확정
> 기준: PRISMA_SCHEMA_DRAFT.md, MIGRATION_RISK_CHECKLIST.md

---

## 1. 적용 우선순위 분류

### 1.1 분류 기준

| 구분           | 기준                                          | 적용 시기 |
| -------------- | --------------------------------------------- | --------- |
| **1차 (즉시)** | 현재 기능에 필요하거나, 다른 모든 변경의 기반 | Phase 0~1 |
| **2차 (단기)** | Path 3 (댓글 시작형) 핵심 기능, 운영 기반     | Phase 2   |
| **3차 (중기)** | 분석 품질 향상, 모니터링 강화                 | Phase 3~4 |
| **보류**       | Enterprise 전용, 대규모 구조 변경             | Phase 8+  |

---

## 2. 1차 적용 (Phase 0~1)

> 인프라 기반. 다른 모든 변경의 전제 조건.

### 적용 항목

| #   | 변경                         | 이유                                          |
| --- | ---------------------------- | --------------------------------------------- |
| 1   | Workspace 역량 필드 9개 추가 | 플랜별 기능 제한 — 모든 API 호출의 guard 조건 |
| 2   | UsageMetric 확장 3개 필드    | 사용량 추적 강화 — 빌링/관제 기반             |
| 3   | ScheduledJob 확장 2개 필드   | 파이프라인 모니터링 기반                      |
| 4   | Content 인덱스 추가          | 채널별 최신 콘텐츠 조회 성능                  |

### 의존 관계

```
Workspace 역량 필드
  └─→ tRPC middleware에서 제한 검사
  └─→ 채널 추가 / 멤버 초대 / AI 호출 가드

ScheduledJob 확장
  └─→ BullMQ Worker에서 duration 기록
  └─→ Admin 대시보드 모니터링
```

### 마이그레이션 명령

```bash
# 1. schema.prisma 수정 (Workspace, UsageMetric, ScheduledJob, Content 인덱스)
# 2. 마이그레이션 생성
DATABASE_URL="..." DIRECT_URL="..." \
  npx --package=prisma@6 prisma migrate dev --name phase0_workspace_capabilities

# 3. 데이터 보정
# Workspace plan별 올바른 역량 값 설정 (SQL 스크립트)
```

### 코드 변경

| 영역             | 변경                                          |
| ---------------- | --------------------------------------------- |
| `packages/api`   | workspace 관련 tRPC에 제한 검사 미들웨어 추가 |
| `packages/queue` | Worker에서 ScheduledJob.durationMs 기록       |
| `apps/web`       | 채널 추가 UI에 제한 도달 시 업그레이드 유도   |

---

## 3. 2차 적용 (Phase 2)

> Path 3 (댓글 시작형) 핵심 + 운영 알림 기반.

### 적용 항목

| #   | 변경                                                             | 이유                                   |
| --- | ---------------------------------------------------------------- | -------------------------------------- |
| 5   | FAQCandidate 모델 + FAQStatus enum                               | 반복 질문 식별/관리 — Path 3 핵심      |
| 6   | RiskSignal 모델 + RiskSignalStatus enum                          | 리스크 감지/에스컬레이션 — Path 3 핵심 |
| 7   | Notification 모델 + NotificationType + NotificationPriority enum | 알림 시스템 — 운영 관제 기반           |
| 8   | User.notifications 관계                                          | Notification FK                        |
| 9   | Project.faqCandidates, Project.riskSignals 관계                  | FK                                     |
| 10  | JobType + FAQ_EXTRACT, RISK_DETECT, NOTIFICATION_SEND            | 새 Job 타입                            |
| 11  | InsightType + RISK_REPORT, FAQ_REPORT                            | 새 리포트 타입                         |
| 12  | SourceModule + FAQ_ENGINE, RISK_ENGINE                           | 새 출처 모듈                           |

### 의존 관계

```
FAQCandidate
  ├─→ COMMENT_ANALYZE Job 완료 후 → FAQ_EXTRACT Job 트리거
  ├─→ tRPC router (CRUD + 목록/필터)
  ├─→ UI: FAQ 대시보드 (Path 3)
  └─→ InsightAction 생성 (CONTENT_CREATE)

RiskSignal
  ├─→ COMMENT_ANALYZE Job 완료 후 → RISK_DETECT Job 트리거
  ├─→ Notification 자동 생성 (severity HIGH/CRITICAL)
  ├─→ tRPC router (CRUD + 상태 관리)
  ├─→ UI: 리스크 대시보드
  └─→ InsightAction 생성 (RISK_MITIGATE)

Notification
  ├─→ RiskSignal 생성 시 자동 트리거
  ├─→ ScheduledJob 실패 시 자동 트리거
  ├─→ tRPC router (목록, 읽음 처리)
  └─→ UI: 알림 벨 (TopBar)
```

### 마이그레이션 명령

```bash
DATABASE_URL="..." DIRECT_URL="..." \
  npx --package=prisma@6 prisma migrate dev --name phase2_faq_risk_notification
```

### 코드 변경

| 영역             | 변경                                                   |
| ---------------- | ------------------------------------------------------ |
| `packages/api`   | faqRouter, riskRouter, notificationRouter 추가         |
| `packages/queue` | FAQ_EXTRACT, RISK_DETECT, NOTIFICATION_SEND Job 핸들러 |
| `packages/ai`    | FAQ 클러스터링, 리스크 감지 프롬프트                   |
| `apps/web`       | FAQ 대시보드, 리스크 대시보드, 알림 벨 UI              |

---

## 4. 3차 적용 (Phase 3~4)

> 분석 품질 향상, 대량 데이터 대응.

### 적용 항목

| #   | 변경                                            | 이유                            |
| --- | ----------------------------------------------- | ------------------------------- |
| 13  | CommentAnalysis 복합 인덱스 [sentiment, isRisk] | 부정+리스크 교차 필터 성능      |
| 14  | RawSocialMention 인덱스 [sentiment]             | 감성별 필터 성능                |
| 15  | InsightAction 인덱스 [sourceModule]             | 출처별 조회 성능                |
| 16  | DataSourceType + FAQ_CANDIDATE, RISK_SIGNAL     | EvidenceAsset에서 FAQ/Risk 참조 |
| 17  | ExplorerDataType + FAQ, RISK_SIGNAL             | Data Explorer 확장              |

### 주의 사항

- CommentAnalysis, RawSocialMention은 **대량 테이블** (수만~수십만 행)
- 인덱스 생성 시 PostgreSQL `CREATE INDEX CONCURRENTLY` 사용 권고
- Prisma의 기본 마이그레이션은 CONCURRENTLY를 사용하지 않으므로:

  ```sql
  -- 수동 SQL 마이그레이션
  CREATE INDEX CONCURRENTLY idx_comment_analysis_sentiment_risk
    ON comment_analysis (sentiment, "isRisk");

  CREATE INDEX CONCURRENTLY idx_raw_social_mentions_sentiment
    ON raw_social_mentions (sentiment);
  ```

---

## 5. 보류 항목 (Phase 8+)

| 항목                       | 이유                            | 조건                                          |
| -------------------------- | ------------------------------- | --------------------------------------------- |
| AuditLog 모델              | Enterprise 전용                 | Enterprise 고객 확보 시                       |
| CustomDashboardConfig 모델 | Enterprise 전용                 | 대시보드 빌더 설계 후                         |
| Permission 모델 (RBAC)     | 현재 WorkspaceRole 3단계로 충분 | 세분화 요구 시                                |
| CompetitorChannel 제거     | 데이터 마이그레이션 필요        | Channel.channelType=COMPETITOR로 완전 이관 후 |
| IntentCluster 모델 분리    | 현재 JSON으로 충분              | 클러스터별 독립 검색 기능 필요 시             |
| CitationLog 모델 분리      | 현재 JSON으로 충분              | URL별 시간축 검색 기능 필요 시                |
| Plan/PlanTier 통합         | 현재 둘 다 사용 가능            | 빌링 시스템 고도화 시                         |

---

## 6. 전체 타임라인

```
Phase 0~1 (1차)
  ┌─────────────────────────────────────────────┐
  │ Workspace 역량 필드                          │
  │ UsageMetric 확장                             │
  │ ScheduledJob 확장                            │
  │ Content 인덱스                               │
  └─────────────────────────────────────────────┘
       │
       ▼
Phase 2 (2차)
  ┌─────────────────────────────────────────────┐
  │ FAQCandidate + FAQStatus                     │
  │ RiskSignal + RiskSignalStatus                │
  │ Notification + NotificationType/Priority     │
  │ User/Project 관계 확장                        │
  │ JobType/InsightType/SourceModule enum 확장    │
  └─────────────────────────────────────────────┘
       │
       ▼
Phase 3~4 (3차)
  ┌─────────────────────────────────────────────┐
  │ 대량 테이블 인덱스 보강                       │
  │ DataSourceType/ExplorerDataType enum 확장    │
  └─────────────────────────────────────────────┘
       │
       ▼
Phase 8+ (보류)
  ┌─────────────────────────────────────────────┐
  │ AuditLog, CustomDashboardConfig              │
  │ Permission, CompetitorChannel 제거           │
  │ JSON→모델 승격 (조건부)                      │
  └─────────────────────────────────────────────┘
```

---

## 7. tRPC 라우터 추가 계획

| Phase   | 라우터                   | 주요 Procedure                               |
| ------- | ------------------------ | -------------------------------------------- |
| Phase 2 | `faqRouter`              | list, getById, updateStatus, dismiss         |
| Phase 2 | `riskRouter`             | list, getById, assign, updateStatus, resolve |
| Phase 2 | `notificationRouter`     | list, markRead, markAllRead, getUnreadCount  |
| Phase 2 | `workspaceRouter` (확장) | getCapabilities, checkLimit                  |

---

## 8. Schema Draft Summary

```
[Schema Draft Summary]

1. 신규 모델: FAQCandidate, RiskSignal, Notification (3개)
2. 모델 확장: Workspace(+9), UsageMetric(+3), ScheduledJob(+2), User(+relation), Project(+relations)
3. 신규 Enum: FAQStatus, RiskSignalStatus, NotificationType, NotificationPriority (4개)
4. Enum 확장: JobType(+3), InsightType(+2), DataSourceType(+2), SourceModule(+2), ExplorerDataType(+2)
5. 인덱스: 신규 테이블 인덱스 + 기존 4개 보강
6. 적용 순서: Phase 0~1 (Workspace 역량) → Phase 2 (FAQ/Risk/Notification) → Phase 3~4 (인덱스 보강)

총 변경: +3 모델, +4 enum, 5개 모델 확장, 5개 enum 확장, 5개 인덱스 보강
리스크: 대부분 🟢 LOW. Workspace 역량 필드 데이터 보정(🔴)만 주의.
```
