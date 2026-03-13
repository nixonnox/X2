# MIGRATION_PRECHECK_FINAL — 마이그레이션 전 최종 체크리스트

> 작성일: 2026-03-10
> 대상: schema.prisma v3 변경사항
> 상태: migration 미실행 (schema 수정만 완료)

---

## 1. 현재 상태

- [x] schema.prisma 수정 완료 (additive only)
- [x] `prisma format` 성공
- [x] `prisma validate` 성공
- [ ] `prisma migrate dev` 미실행
- [ ] `prisma db push` 미실행
- [ ] PostgreSQL DB 연결 미확인

---

## 2. Migration 전 필수 체크 항목

### 2.1 DB 환경

- [ ] PostgreSQL 인스턴스 실행 중
- [ ] DATABASE_URL 환경변수 정확히 설정
- [ ] DIRECT_URL 환경변수 정확히 설정 (Prisma 6 필수)
- [ ] DB에 기존 데이터 존재 여부 확인
- [ ] DB 백업 완료 (데이터가 있는 경우)

### 2.2 기존 데이터 영향

| 테이블           | 변경                     | 기존 데이터 영향           | 필요 조치                                          |
| ---------------- | ------------------------ | -------------------------- | -------------------------------------------------- |
| `workspaces`     | +12 컬럼 (모두 @default) | 기존 행에 FREE 기본값 적용 | **마이그레이션 후** plan별 보정 스크립트 실행 필수 |
| `scheduled_jobs` | +2 컬럼 (nullable)       | 기존 행에 NULL 적용        | 없음                                               |
| `usage_metrics`  | +3 컬럼 (@default(0))    | 기존 행에 0 적용           | 없음                                               |
| `faq_candidates` | 신규 테이블              | 없음                       | 없음                                               |
| `risk_signals`   | 신규 테이블              | 없음                       | 없음                                               |
| `notifications`  | 신규 테이블              | 없음                       | 없음                                               |

### 2.3 Workspace 데이터 보정 (🔴 필수)

기존 Workspace가 있는 경우, 마이그레이션 직후 아래 SQL 실행 필수:

```sql
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
  END,
  "geoAeoEnabled" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END,
  "influencerExecutionEnabled" = CASE WHEN plan IN ('PRO', 'BUSINESS') THEN true ELSE false END
WHERE plan IS NOT NULL;
```

**이 스크립트를 실행하지 않으면**: 기존 PRO/BUSINESS 워크스페이스에 FREE 기본값이 적용되어 채널 제한(3개), 멤버 제한(1명) 등이 걸림.

### 2.4 인덱스 생성 주의

대량 데이터가 있는 테이블의 인덱스:

| 테이블                | 인덱스                          | 주의                                                                    |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| `comment_analysis`    | `[sentiment, isRisk]`           | 데이터 많으면 Prisma migrate 대신 수동 `CREATE INDEX CONCURRENTLY` 권고 |
| `raw_social_mentions` | `[sentiment]`                   | 동일                                                                    |
| `contents`            | `[channelId, publishedAt DESC]` | 동일                                                                    |

데이터가 적은 초기 단계에서는 Prisma 기본 migrate로 충분.

---

## 3. Enum 확장에 따른 코드 영향

### 3.1 즉시 수정 필요 (TypeScript 컴파일 에러 가능)

| Enum             | 추가 값 | 영향 코드                                  | 수정 내용                      |
| ---------------- | ------- | ------------------------------------------ | ------------------------------ |
| JobType          | +3      | `packages/queue/` (미구현이므로 영향 없음) | 향후 핸들러 추가               |
| InsightType      | +2      | exhaustive switch가 있다면                 | default case 또는 새 case 추가 |
| DataSourceType   | +2      | EvidenceAsset 렌더링                       | 새 타입 처리 추가              |
| SourceModule     | +2      | InsightAction 표시                         | 새 모듈 표시 추가              |
| ExplorerDataType | +2      | Data Explorer 필터                         | 새 데이터 타입 추가            |

### 3.2 확인 방법

```bash
# Prisma client 재생성 후 TypeScript 빌드
npx --package=prisma@6 prisma generate
npx turbo build
```

컴파일 에러가 나면 exhaustive switch에 새 enum 값 추가.

---

## 4. 릴리즈 순서 제안

### Phase 3-A: 인프라 기반 (1차 migrate)

```
1. prisma migrate dev --name v3_workspace_capabilities
   - Workspace +12 필드
   - ScheduledJob +2 필드
   - UsageMetric +3 필드
   - Content, InsightAction 인덱스
2. Workspace 데이터 보정 SQL 실행
3. tRPC에 workspace 제한 검사 미들웨어 추가
4. 검증: 기존 채널/멤버/기능 정상 동작 확인
```

### Phase 3-B: Intelligence 모델 (2차 migrate)

```
5. prisma migrate dev --name v3_faq_risk_notification
   - FAQCandidate + FAQStatus enum
   - RiskSignal + RiskSignalStatus enum
   - Notification + NotificationType + NotificationPriority enum
   - JobType/InsightType/SourceModule/DataSourceType/ExplorerDataType 확장
   - CommentAnalysis, RawSocialMention 인덱스
6. tRPC router 추가 (faq, risk, notification)
7. BullMQ Job 핸들러 추가 (FAQ_EXTRACT, RISK_DETECT, NOTIFICATION_SEND)
8. UI 컴포넌트 추가 (FAQ 대시보드, 리스크 대시보드, 알림 벨)
```

### 1차/2차 분리 이유

- 1차는 기존 기능 강화 (제한 검사). 코드 변경 최소.
- 2차는 새 기능 추가. tRPC/BullMQ/UI 구현이 동반되어야 의미 있음.
- 분리하면 1차만 먼저 배포하고, 2차는 코드 준비 후 배포 가능.

---

## 5. Rollback 주의사항

| 변경               | Rollback 방법                                                           | 위험도 |
| ------------------ | ----------------------------------------------------------------------- | ------ |
| 신규 테이블 3개    | `DROP TABLE` — 데이터 없으면 안전                                       | 🟢     |
| Workspace +12 필드 | `ALTER TABLE DROP COLUMN` — 데이터 보정 후 rollback 시 보정 데이터 유실 | 🟡     |
| Enum 확장          | 사용 중인 행이 없으면 제거 가능. 있으면 먼저 해당 행 업데이트 필요.     | 🟡     |
| 인덱스 추가        | `DROP INDEX` — 항상 안전                                                | 🟢     |

**핵심**: 모든 변경이 additive이므로, rollback 시 "추가한 것을 제거"하면 됨. 기존 데이터를 변경하지 않았으므로 기존 기능에 영향 없음.

---

## 6. Migration 실행 명령

```bash
# 프로젝트 디렉토리에서
cd packages/db

# 1. 환경변수 설정
export DATABASE_URL="postgresql://user:pass@host:5432/x2"
export DIRECT_URL="postgresql://user:pass@host:5432/x2"

# 2. Prisma 6 사용 (프로젝트 버전)
npx --package=prisma@6 prisma migrate dev --name v3_schema_expansion

# 3. 클라이언트 재생성
npx --package=prisma@6 prisma generate

# 4. Workspace 데이터 보정 (기존 데이터가 있는 경우)
# → 위 §2.3 SQL 스크립트 실행

# 5. TypeScript 빌드 검증
cd ../..
npx turbo build
```

---

## 7. 검증 체크리스트 (Migration 후)

- [ ] 기존 User 로그인 정상
- [ ] 기존 Workspace 조회 정상
- [ ] 기존 Channel/Content/Comment 조회 정상
- [ ] Workspace 역량 필드 plan별 올바른 값 확인
- [ ] 신규 테이블 (faq_candidates, risk_signals, notifications) 존재 확인
- [ ] Prisma Client 타입에 새 모델 포함 확인
- [ ] TypeScript 빌드 에러 없음
- [ ] seed.ts 실행 정상 (필요 시 업데이트)
