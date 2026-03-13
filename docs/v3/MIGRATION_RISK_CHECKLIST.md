# MIGRATION_RISK_CHECKLIST — 마이그레이션 리스크 및 단계별 실행 체크리스트

> 작성일: 2026-03-10
> 상태: 확정
> 기준: PRISMA_SCHEMA_DRAFT.md

---

## 1. 리스크 등급 정의

| 등급        | 의미      | 기준                                                    |
| ----------- | --------- | ------------------------------------------------------- |
| 🟢 LOW      | 안전      | 신규 테이블 생성, default 있는 nullable 필드 추가       |
| 🟡 MEDIUM   | 주의      | Enum 값 추가, 인덱스 추가, 기존 필드에 default 추가     |
| 🔴 HIGH     | 위험      | 기존 필드 변경, NOT NULL 추가, 데이터 마이그레이션 필요 |
| ⚫ CRITICAL | 중단 위험 | 테이블/컬럼 삭제, FK 변경, 대량 데이터 리라이트         |

---

## 2. 변경별 리스크 분석

### 2.1 신규 모델 생성

| #   | 변경                        | 리스크 | 설명                                   |
| --- | --------------------------- | ------ | -------------------------------------- |
| 1   | CREATE TABLE faq_candidates | 🟢 LOW | 빈 테이블 생성. 기존 데이터 영향 없음. |
| 2   | CREATE TABLE risk_signals   | 🟢 LOW | 빈 테이블 생성. 기존 데이터 영향 없음. |
| 3   | CREATE TABLE notifications  | 🟢 LOW | 빈 테이블 생성. 기존 데이터 영향 없음. |

### 2.2 기존 모델 필드 추가

| #   | 변경                                                 | 리스크 | 설명                          |
| --- | ---------------------------------------------------- | ------ | ----------------------------- |
| 4   | Workspace + maxChannels (Int @default(3))            | 🟢 LOW | default 존재. 기존 행 자동 3. |
| 5   | Workspace + maxContentsPerMonth (Int @default(500))  | 🟢 LOW | 동일.                         |
| 6   | Workspace + maxCommentsPerMonth (Int @default(1000)) | 🟢 LOW | 동일.                         |
| 7   | Workspace + maxAiTokensPerDay (Int @default(5000))   | 🟢 LOW | 동일.                         |
| 8   | Workspace + maxMembers (Int @default(1))             | 🟢 LOW | 동일.                         |
| 9   | Workspace + maxReportsPerMonth (Int @default(3))     | 🟢 LOW | 동일.                         |
| 10  | Workspace + canExportData (Boolean @default(false))  | 🟢 LOW | 동일.                         |
| 11  | Workspace + canAccessApi (Boolean @default(false))   | 🟢 LOW | 동일.                         |
| 12  | Workspace + maxVerticalPacks (Int @default(0))       | 🟢 LOW | 동일.                         |
| 13  | ScheduledJob + durationMs (Int?)                     | 🟢 LOW | nullable. 기존 행 NULL.       |
| 14  | ScheduledJob + jobGroup (String?)                    | 🟢 LOW | nullable. 기존 행 NULL.       |
| 15  | UsageMetric + aiCostUsd (Float @default(0))          | 🟢 LOW | default 0.                    |
| 16  | UsageMetric + reportCount (Int @default(0))          | 🟢 LOW | default 0.                    |
| 17  | UsageMetric + exportCount (Int @default(0))          | 🟢 LOW | default 0.                    |

### 2.3 Enum 확장

| #   | 변경                                                  | 리스크    | 설명                                                              |
| --- | ----------------------------------------------------- | --------- | ----------------------------------------------------------------- |
| 18  | JobType + FAQ_EXTRACT, RISK_DETECT, NOTIFICATION_SEND | 🟡 MEDIUM | 새 값 추가만. 기존 코드에서 exhaustive switch 있으면 컴파일 에러. |
| 19  | InsightType + RISK_REPORT, FAQ_REPORT                 | 🟡 MEDIUM | 동일.                                                             |
| 20  | DataSourceType + FAQ_CANDIDATE, RISK_SIGNAL           | 🟡 MEDIUM | 동일.                                                             |
| 21  | SourceModule + FAQ_ENGINE, RISK_ENGINE                | 🟡 MEDIUM | 동일.                                                             |
| 22  | ExplorerDataType + FAQ, RISK_SIGNAL                   | 🟡 MEDIUM | 동일.                                                             |
| 23  | FAQStatus (신규 enum)                                 | 🟢 LOW    | 신규.                                                             |
| 24  | RiskSignalStatus (신규 enum)                          | 🟢 LOW    | 신규.                                                             |
| 25  | NotificationType (신규 enum)                          | 🟢 LOW    | 신규.                                                             |
| 26  | NotificationPriority (신규 enum)                      | 🟢 LOW    | 신규.                                                             |

### 2.4 인덱스 추가

| #   | 변경                                             | 리스크    | 설명                                                            |
| --- | ------------------------------------------------ | --------- | --------------------------------------------------------------- |
| 27  | CommentAnalysis + @@index([sentiment, isRisk])   | 🟡 MEDIUM | 대량 테이블. 인덱스 생성 시 잠시 lock 가능 (CONCURRENTLY 권고). |
| 28  | RawSocialMention + @@index([sentiment])          | 🟡 MEDIUM | 대량 테이블. 동일.                                              |
| 29  | InsightAction + @@index([sourceModule])          | 🟢 LOW    | 소량 테이블.                                                    |
| 30  | Content + @@index([channelId, publishedAt DESC]) | 🟡 MEDIUM | 대량 테이블.                                                    |
| 31  | ScheduledJob + @@index([jobGroup])               | 🟢 LOW    | 소량 테이블.                                                    |

### 2.5 Relation 추가

| #   | 변경                                    | 리스크 | 설명                              |
| --- | --------------------------------------- | ------ | --------------------------------- |
| 32  | User.notifications (relation 필드만)    | 🟢 LOW | Prisma 관계 선언만. DB 변경 없음. |
| 33  | Project.faqCandidates (relation 필드만) | 🟢 LOW | 동일.                             |
| 34  | Project.riskSignals (relation 필드만)   | 🟢 LOW | 동일.                             |

---

## 3. 코드 영향 분석

### 3.1 Enum 확장에 따른 코드 수정 필요

| Enum             | 영향 파일                       | 수정 내용                           |
| ---------------- | ------------------------------- | ----------------------------------- |
| JobType          | `packages/queue/` (미구현)      | 새 Job 타입 핸들러 추가             |
| InsightType      | `apps/web/lib/insights/`        | 새 리포트 타입 처리 추가            |
| DataSourceType   | `apps/web/components/reports/`  | EvidenceAsset 렌더링에 새 타입 추가 |
| SourceModule     | `apps/web/lib/insights/`        | 새 출처 모듈 표시                   |
| ExplorerDataType | `apps/web/lib/` (Data Explorer) | 새 데이터 타입 필터 추가            |

### 3.2 새 모델에 필요한 코드

| 모델         | 필요 구현                                                       |
| ------------ | --------------------------------------------------------------- |
| FAQCandidate | tRPC router, FAQ 추출 Job (BullMQ), UI 컴포넌트                 |
| RiskSignal   | tRPC router, 리스크 감지 Job (BullMQ), UI 컴포넌트, 알림 트리거 |
| Notification | tRPC router, WebSocket(향후), UI 알림 벨, 이메일 발송           |

### 3.3 Workspace 역량 필드에 따른 코드 수정

| 변경                | 영향                             |
| ------------------- | -------------------------------- |
| maxChannels         | 채널 추가 시 제한 검사 추가      |
| maxContentsPerMonth | 콘텐츠 수집 시 제한 검사         |
| maxAiTokensPerDay   | AI 분석 호출 전 제한 검사        |
| maxMembers          | 멤버 초대 시 제한 검사           |
| canExportData       | 데이터 내보내기 버튼 조건부 표시 |
| canAccessApi        | API 엔드포인트 가드              |

---

## 4. 데이터 충돌 분석

| 충돌 시나리오                                                                | 리스크 | 대응                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 기존 Workspace에 maxChannels=3 적용 → PRO 플랜 워크스페이스에 이미 10개 채널 | 🔴     | 마이그레이션 스크립트에서 plan별 올바른 값 설정. 3으로 두면 기존 사용자 제한 걸림.                                                         |
| 기존 Workspace의 plan=PRO인데 maxMembers=1 적용                              | 🔴     | 동일. 마이그레이션 시 plan 기반으로 올바른 값 세팅 필수.                                                                                   |
| Enum 추가 후 기존 코드의 exhaustive switch                                   | 🟡     | TypeScript 컴파일 에러로 감지. 배포 전 수정.                                                                                               |
| 대량 테이블 인덱스 추가 시 락                                                | 🟡     | PostgreSQL `CREATE INDEX CONCURRENTLY` 사용. Prisma는 기본적으로 이를 사용하지 않으므로, 수동 SQL 마이그레이션 또는 큰 테이블은 별도 처리. |

### 4.1 Workspace 역량 필드 마이그레이션 스크립트 (필수)

```sql
-- 마이그레이션 후 실행 (prisma migrate 이후)
UPDATE workspaces SET
  "maxChannels" = CASE plan
    WHEN 'FREE' THEN 3
    WHEN 'PRO' THEN 50
    WHEN 'BUSINESS' THEN 200
  END,
  "maxContentsPerMonth" = CASE plan
    WHEN 'FREE' THEN 500
    WHEN 'PRO' THEN 10000
    WHEN 'BUSINESS' THEN 50000
  END,
  "maxCommentsPerMonth" = CASE plan
    WHEN 'FREE' THEN 1000
    WHEN 'PRO' THEN 50000
    WHEN 'BUSINESS' THEN 200000
  END,
  "maxAiTokensPerDay" = CASE plan
    WHEN 'FREE' THEN 5000
    WHEN 'PRO' THEN 100000
    WHEN 'BUSINESS' THEN 500000
  END,
  "maxMembers" = CASE plan
    WHEN 'FREE' THEN 1
    WHEN 'PRO' THEN 5
    WHEN 'BUSINESS' THEN 999
  END,
  "maxReportsPerMonth" = CASE plan
    WHEN 'FREE' THEN 3
    WHEN 'PRO' THEN 999
    WHEN 'BUSINESS' THEN 999
  END,
  "canExportData" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END,
  "canAccessApi" = CASE WHEN plan = 'BUSINESS' THEN true ELSE false END,
  "maxVerticalPacks" = CASE plan
    WHEN 'FREE' THEN 0
    WHEN 'PRO' THEN 1
    WHEN 'BUSINESS' THEN 999
  END;
```

---

## 5. 마이그레이션 실행 순서

### Step 1: Enum 추가 (안전)

```
1. 신규 enum 4개 생성 (FAQStatus, RiskSignalStatus, NotificationType, NotificationPriority)
2. 기존 enum 5개에 새 값 추가 (JobType, InsightType, DataSourceType, SourceModule, ExplorerDataType)
```

### Step 2: 신규 테이블 생성 (안전)

```
3. CREATE TABLE faq_candidates (+ 인덱스)
4. CREATE TABLE risk_signals (+ 인덱스)
5. CREATE TABLE notifications (+ 인덱스)
```

### Step 3: 기존 테이블 필드 추가 (안전)

```
6. ALTER TABLE workspaces ADD COLUMN maxChannels, ... (9개 필드, 모두 default)
7. ALTER TABLE scheduled_jobs ADD COLUMN durationMs, jobGroup (nullable)
8. ALTER TABLE usage_metrics ADD COLUMN aiCostUsd, reportCount, exportCount (default)
```

### Step 4: Workspace 데이터 보정 (필수)

```
9. UPDATE workspaces SET maxChannels = ... (plan별 올바른 값)
```

### Step 5: 인덱스 보강 (주의)

```
10. CREATE INDEX on comment_analysis (sentiment, isRisk)
11. CREATE INDEX on raw_social_mentions (sentiment)
12. CREATE INDEX on insight_actions (sourceModule)
13. CREATE INDEX on contents (channelId, publishedAt DESC)
14. CREATE INDEX on scheduled_jobs (jobGroup)
```

### Step 6: Relation 선언 (Prisma만, DB 변경 없음)

```
15. User.notifications, Project.faqCandidates, Project.riskSignals (schema.prisma만)
```

---

## 6. 롤백 전략

| Step   | 롤백 방법                                            |
| ------ | ---------------------------------------------------- |
| Step 1 | Enum 값 제거 (사용 중인 행 없으면 안전)              |
| Step 2 | DROP TABLE (데이터 없으면 안전)                      |
| Step 3 | ALTER TABLE DROP COLUMN (데이터 유실 가능 — 백업 후) |
| Step 4 | 역방향 UPDATE 불필요 (기존 기본값으로 복원)          |
| Step 5 | DROP INDEX (안전)                                    |

---

## 7. 검증 체크리스트

- [ ] `prisma validate` 통과
- [ ] `prisma format` 실행
- [ ] 기존 tRPC 라우터 정상 동작 (TypeScript 컴파일)
- [ ] Enum 확장에 따른 exhaustive switch 수정
- [ ] Workspace 역량 필드 데이터 보정 스크립트 검증
- [ ] 대량 테이블 인덱스 추가 시 `CONCURRENTLY` 확인
- [ ] 개발 환경에서 전체 마이그레이션 테스트
- [ ] seed.ts 업데이트 (새 모델 반영)
