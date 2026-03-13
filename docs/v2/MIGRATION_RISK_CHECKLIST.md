# X2 — Migration Risk Checklist (v2.1)

> 작성일: 2026-03-10
> 상태: 실행 전 사전 검토 — migration 실행 금지
> 목적: PRISMA_SCHEMA_DRAFT.md의 변경사항을 실제 적용하기 전 위험 요소 정리

---

## 위험도 범례

| 등급        | 의미                         | 조치                                    |
| ----------- | ---------------------------- | --------------------------------------- |
| 🔴 CRITICAL | 데이터 손실/서비스 중단 가능 | 반드시 수동 마이그레이션 + 백업 후 진행 |
| 🟡 HIGH     | 기존 코드 변경 필요          | 관련 코드 선수정 후 migration           |
| 🟢 LOW      | 추가만 (Additive) — 안전     | 순서 무관 적용 가능                     |

---

## 1. Breaking Changes (기존 모델 변경)

### 1.1 🔴 InsightAction.reportId: non-nullable → nullable

**현재**:

```prisma
reportId String
report   InsightReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
```

**변경**:

```prisma
reportId String?
report   InsightReport? @relation(fields: [reportId], references: [id], onDelete: SetNull)
```

**위험**:

- `onDelete: Cascade → SetNull` 변경은 FK constraint 재생성 필요
- 기존 코드에서 `action.reportId`를 non-null로 가정하는 곳 모두 수정 필요
- TypeScript 타입이 `string` → `string | null`로 변경 → 컴파일 에러 발생

**마이그레이션 절차**:

1. 코드에서 `action.reportId` 참조하는 모든 위치 검색 + nullable 대응
2. `prisma migrate dev` 실행 (ALTER TABLE insight_actions ALTER COLUMN reportId DROP NOT NULL)
3. FK constraint 재생성 (Prisma가 자동 처리)
4. 기존 데이터: 영향 없음 (기존 값은 유지, 새 레코드만 null 허용)

**영향 범위 조사 필요**:

```bash
grep -r "reportId" apps/web/src/ packages/api/src/ --include="*.ts" --include="*.tsx"
grep -r "InsightAction" apps/web/src/ packages/api/src/ --include="*.ts" --include="*.tsx"
```

---

### 1.2 🟡 ChannelStatus enum 확장: PENDING, ARCHIVED 추가

**현재**: `ACTIVE | SYNCING | ERROR | PAUSED`
**변경**: `PENDING | ACTIVE | SYNCING | ERROR | PAUSED | ARCHIVED`

**위험**:

- PostgreSQL enum에 값 추가는 `ALTER TYPE ... ADD VALUE`로 처리 (Prisma 자동)
- 기본값 변경: `@default(ACTIVE) → @default(PENDING)` — 신규 채널 생성 코드 영향
- 기존 채널 생성 로직에서 ACTIVE를 명시적으로 설정하는지 확인 필요
- UI의 status 표시 컴포넌트에서 PENDING/ARCHIVED 처리 추가 필요

**마이그레이션 절차**:

1. UI에 PENDING, ARCHIVED 상태 표시 추가
2. 채널 생성 API에서 기본 status 로직 확인
3. `prisma migrate dev` 실행
4. 기존 데이터: 영향 없음 (기존 채널은 ACTIVE 상태 유지)

---

### 1.3 🟡 Channel 모델 필드 추가

**신규 필드**:

- `channelType ChannelType @default(OWNED)` — 기존 채널 자동으로 OWNED
- `lastSyncStatus SyncStatus?` — nullable, 안전
- `syncErrorMessage String?` — nullable, 안전
- `deletedAt DateTime?` — nullable, 안전

**위험**:

- `channelType` 추가 자체는 안전 (DEFAULT 있음)
- 단, CompetitorChannel과의 중복 해결은 별도 데이터 마이그레이션 필요 (§3 참조)
- Prisma Client 재생성 후 새 필드 타입 반영

---

### 1.4 🟢 ChannelSnapshot 필드 추가

`avgViewsPerContent`, `followerGrowth`, `followerGrowthRate`, `estimatedReach`, `rawMetrics` — 전부 nullable. 안전.

**인덱스 변경**:

- `@@index([date])` → `@@index([channelId, date(sort: Desc)])` — 기존 인덱스 DROP + 새 인덱스 CREATE
- 데이터량에 따라 수 초~수 분 소요 가능 (채널 수 × 365일)

---

### 1.5 🟢 CommentAnalysis 필드 추가

`sentimentReason`, `topicConfidence`, `isQuestion`, `questionType`, `isRisk`, `riskLevel`, `suggestedReply`, `analyzerModel` — 전부 nullable 또는 default 있음. 안전.

신규 인덱스 3개 추가: `[isRisk]`, `[isQuestion]`, `[sentiment]`

---

### 1.6 🟢 InsightReport 필드 추가

`shareToken String? @unique`, `templateId String?` — nullable. 안전.
`sections ReportSection[]` — 관계 필드만 추가.

---

### 1.7 🟢 InsightType, JobType enum 확장

- InsightType: +5개 값 (CAMPAIGN_REPORT, COMPETITOR_REPORT, INTENT_REPORT, AEO_REPORT, FAQ_EXTRACTION)
- JobType: +6개 값 (COMMENT_ANALYZE, AEO_CRAWL, INTENT_ANALYZE, CAMPAIGN_METRIC_SYNC, DATA_EXPORT, REPORT_GENERATE)

PostgreSQL enum ADD VALUE는 안전. Prisma 자동 처리.

---

### 1.8 🟡 Workspace 필드 추가

- `planTier PlanTier @default(STANDARD)` — DEFAULT 있으므로 데이터 안전
- `industryType IndustryType?` — nullable. 안전
- `verticalPacks WorkspaceVerticalPack[]` — 관계 필드만

**위험**: `PlanTier`와 기존 `Plan` enum의 역할 구분을 코드에서 명확히 해야 함. `plan`은 결제 등급, `planTier`는 기능 계층.

---

### 1.9 🟡 Project 관계 필드 추가

8개 새 관계 추가 (intentQueries, aeoKeywords, campaigns 등). 관계 필드만이므로 DB 레벨 변경 없음. 안전.
단, Prisma Client 재생성 후 타입 변경 → 기존 select/include에 영향 없음.

---

## 2. 신규 모델 추가 (21개)

### 2.1 Phase별 migration 순서

신규 모델은 독립적으로 추가 가능하나 **의존성 순서** 준수 필요:

```
Phase 2 (먼저):
  RawSocialMention     — Project에만 의존
  SavedFilter          — Project에만 의존
  DataExportJob        — Project에만 의존

Phase 3:
  IntentQuery          — Project에만 의존
  IntentKeywordResult  — IntentQuery에 의존 (같이 추가)
  TrendKeywordAnalytics — Project에만 의존

Phase 4:
  AeoKeyword           — Project에만 의존
  AeoSnapshot          — AeoKeyword에 의존 (같이 추가)
  CitationReadyReportSource — Project에만 의존, AeoEngine enum 필요

Phase 5:
  ReportSection        — InsightReport에 의존
  EvidenceAsset        — ReportSection에 의존 (같이 추가)
  ReportTemplate       — VerticalPack에 의존 (Phase 8과 교차)

Phase 6:
  InfluencerProfile    — Channel에 의존
  Campaign             — Project에 의존
  CampaignCreator      — Campaign, Channel, InfluencerProfile에 의존 (같이 추가)
  CampaignContent      — Campaign, CampaignCreator에 의존 (같이 추가)

Phase 7:
  CampaignMetric       — Campaign에 의존
  PostMeasurement      — CampaignContent에 의존
  RoiCalculation       — Campaign에 의존

Phase 8:
  VerticalPack         — 독립
  WorkspaceVerticalPack — Workspace, VerticalPack에 의존
```

### 2.2 🟡 ReportTemplate ↔ VerticalPack 교차 의존

`ReportTemplate.verticalPackId → VerticalPack`이므로 Phase 5에 ReportTemplate을 추가하려면 Phase 8의 VerticalPack이 먼저 필요.

**해결 방안**:

- VerticalPack을 Phase 5와 동시에 생성 (빈 테이블로)
- 또는 ReportTemplate.verticalPackId를 Phase 8까지 추가 보류

---

## 3. 데이터 마이그레이션

### 3.1 🟡 CompetitorChannel → Channel(type=COMPETITOR) 전환

**현재 상태**: `CompetitorChannel` 별도 모델 존재 (12필드)
**목표**: Channel.channelType = COMPETITOR로 통합

**마이그레이션 스크립트**:

```sql
-- 1. Channel에 channelType 필드 추가 (migration으로 처리)
-- 2. CompetitorChannel 데이터를 Channel로 복사
INSERT INTO channels (
  id, platform, "platformChannelId", name, url, "thumbnailUrl",
  "subscriberCount", "contentCount", "connectionType", status,
  "lastSyncedAt", "createdAt", "updatedAt", "projectId", "channelType"
)
SELECT
  id, platform, "platformChannelId", name, url, "thumbnailUrl",
  "subscriberCount", "contentCount", 'BASIC', 'ACTIVE',
  "lastSyncedAt", "createdAt", "updatedAt", "projectId", 'COMPETITOR'
FROM competitor_channels
ON CONFLICT ("projectId", platform, "platformChannelId") DO NOTHING;

-- 3. 코드에서 CompetitorChannel 참조 제거 확인 후
-- 4. CompetitorChannel 테이블 DROP (별도 migration)
```

**위험**:

- Unique constraint 충돌 가능: 같은 채널이 Channel과 CompetitorChannel 양쪽에 이미 있을 수 있음
- `ON CONFLICT DO NOTHING`으로 충돌 시 skip
- 중복 데이터는 수동 확인 필요

### 3.2 🟢 기존 InsightAction 기본값 채우기

InsightAction.reportId가 nullable로 변경되더라도 기존 데이터에는 모두 reportId가 존재하므로 데이터 마이그레이션 불필요.

신규 필드 (actionType, sourceModule 등)은 nullable이므로 기존 행에 영향 없음.

---

## 4. Enum 호환성

### 4.1 PostgreSQL Enum 특성

- **값 추가**: `ALTER TYPE enum_name ADD VALUE 'NEW'` — 트랜잭션 내에서 불가 (PostgreSQL 제한)
- Prisma는 이를 인지하고 enum ADD VALUE를 트랜잭션 밖에서 실행
- **값 제거/이름 변경**: 매우 위험 — 기존 행 참조 시 에러. 이번 변경에서는 해당 없음

### 4.2 신규 Enum 21개

| Enum                  | 사용 모델                              | 비고 |
| --------------------- | -------------------------------------- | ---- |
| PlanTier              | Workspace                              | 신규 |
| IndustryType          | Workspace, VerticalPack                | 신규 |
| ChannelType           | Channel                                | 신규 |
| SyncStatus            | Channel                                | 신규 |
| RiskLevel             | CommentAnalysis                        | 신규 |
| InsightActionType     | InsightAction                          | 신규 |
| SourceModule          | InsightAction                          | 신규 |
| AnalysisJobStatus     | IntentQuery                            | 신규 |
| IntentCategory        | IntentKeywordResult                    | 신규 |
| GapType               | IntentKeywordResult                    | 신규 |
| MentionMediaType      | RawSocialMention                       | 신규 |
| MentionMatchType      | RawSocialMention                       | 신규 |
| InfluencerTier        | InfluencerProfile                      | 신규 |
| CampaignType          | Campaign                               | 신규 |
| CampaignStatus        | Campaign                               | 신규 |
| OutreachStatus        | CampaignCreator                        | 신규 |
| CompensationType      | CampaignCreator                        | 신규 |
| CampaignContentStatus | CampaignContent                        | 신규 |
| AeoEngine             | AeoSnapshot, CitationReadyReportSource | 신규 |
| CitationSourceType    | CitationReadyReportSource              | 신규 |
| EvidenceType          | EvidenceAsset                          | 신규 |
| DataSourceType        | EvidenceAsset                          | 신규 |
| ExplorerDataType      | SavedFilter, DataExportJob             | 신규 |
| ExportFormat          | DataExportJob                          | 신규 |
| ExportJobStatus       | DataExportJob                          | 신규 |

모두 신규 추가이므로 기존 데이터에 영향 없음.

---

## 5. 성능 영향

### 5.1 대량 테이블 생성 시 주의

| 테이블           | 예상 성장률                | 파티셔닝 고려                 |
| ---------------- | -------------------------- | ----------------------------- |
| RawSocialMention | 프로젝트당 수천~수만 행/일 | 월별 파티셔닝 고려 (향후)     |
| Comment          | 채널당 수백 행/동기화      | 현재 규모에서는 불필요        |
| AeoSnapshot      | 키워드×엔진×일             | 현재 규모에서는 불필요        |
| PostMeasurement  | 캠페인 콘텐츠×일           | 캠페인 수 제한적이므로 불필요 |

### 5.2 인덱스 생성 비용

신규 테이블의 인덱스는 빈 테이블에 생성되므로 비용 없음.
기존 테이블 인덱스 변경 (ChannelSnapshot): 데이터량에 비례한 시간 소요.

### 5.3 Migration 실행 시간 예측

| 작업                                 | 예상 시간   | 비고                   |
| ------------------------------------ | ----------- | ---------------------- |
| 신규 테이블 21개 CREATE              | < 1초       | 빈 테이블              |
| 신규 Enum 21개 CREATE                | < 1초       |                        |
| 기존 Enum 값 추가                    | < 1초       | ALTER TYPE ADD VALUE   |
| InsightAction.reportId nullable 변경 | < 1초       | ALTER COLUMN           |
| Channel 필드 추가                    | < 1초       | ALTER TABLE ADD COLUMN |
| ChannelSnapshot 인덱스 재구성        | 1~10초      | 데이터량 의존          |
| CompetitorChannel 마이그레이션       | 수동 (§3.1) | 별도 실행              |

---

## 6. 코드 영향 분석

### 6.1 Prisma Client 재생성

모든 변경 후 `npx prisma generate` 필요. 새 모델/필드에 대한 TypeScript 타입이 생성됨.

### 6.2 기존 코드 수정 필수 항목

| 영향                            | 파일/패턴                             | 작업                                        |
| ------------------------------- | ------------------------------------- | ------------------------------------------- |
| InsightAction.reportId nullable | `packages/api/` 내 InsightAction CRUD | null 체크 추가                              |
| ChannelStatus.PENDING 기본값    | Channel 생성 로직                     | PENDING → ACTIVE 전환 로직 추가             |
| Channel.channelType 추가        | 채널 목록 쿼리                        | `where: { channelType: 'OWNED' }` 필터 추가 |
| CompetitorChannel deprecation   | CompetitorChannel 참조 코드           | Channel(type=COMPETITOR)로 전환             |

### 6.3 tRPC Router 추가 필요

신규 모델 21개에 대한 CRUD router가 필요. Phase별로 점진적 추가.

- Phase 2: `mentionRouter`, `filterRouter`, `exportRouter`
- Phase 3: `intentRouter`, `trendRouter`
- Phase 4: `aeoRouter`, `citationRouter`
- Phase 5: `reportSectionRouter`, `evidenceRouter`, `templateRouter`
- Phase 6: `influencerRouter`, `campaignRouter`
- Phase 7: `measurementRouter`, `roiRouter`
- Phase 8: `verticalPackRouter`

---

## 7. 실행 전 체크리스트

### Migration 실행 전 반드시 확인:

- [ ] **DB 백업 완료** — `pg_dump` 또는 클라우드 스냅샷
- [ ] **InsightAction.reportId 참조 코드 수정 완료** (🔴 §1.1)
- [ ] **ChannelStatus 기본값 변경 영향 확인** (🟡 §1.2)
- [ ] **CompetitorChannel 마이그레이션 계획 수립** (🟡 §3.1)
- [ ] **Prisma migrate dev --create-only로 SQL 미리 확인**
- [ ] **개발 DB에서 먼저 테스트**
- [ ] **CI/CD 파이프라인에서 Prisma generate 포함 확인**

### Migration 실행 후 확인:

- [ ] `npx prisma generate` 성공
- [ ] TypeScript 컴파일 에러 없음
- [ ] 기존 테스트 통과
- [ ] 기존 API 엔드포인트 정상 동작
- [ ] 새 테이블 생성 확인 (`\dt` 또는 Prisma Studio)

---

## 8. 권장 Migration 실행 순서

```
Step 1: 기존 모델 변경 (하나의 migration)
  - Workspace 필드 추가
  - Channel 필드 추가 + ChannelType enum
  - ChannelSnapshot 필드/인덱스 변경
  - CommentAnalysis 필드 추가
  - InsightReport 필드 추가
  - InsightAction nullable 변경 ← 코드 선수정 필수
  - Enum 확장 (ChannelStatus, InsightType, JobType)
  - 신규 Enum 생성

Step 2: Phase 2 신규 모델
  - RawSocialMention, SavedFilter, DataExportJob

Step 3: Phase 3 신규 모델
  - IntentQuery, IntentKeywordResult, TrendKeywordAnalytics

Step 4: Phase 4 신규 모델
  - AeoKeyword, AeoSnapshot, CitationReadyReportSource

Step 5: Phase 5 + 8 (VerticalPack 선행)
  - VerticalPack, WorkspaceVerticalPack
  - ReportSection, EvidenceAsset, ReportTemplate

Step 6: Phase 6 신규 모델
  - InfluencerProfile, Campaign, CampaignCreator, CampaignContent

Step 7: Phase 7 신규 모델
  - CampaignMetric, PostMeasurement, RoiCalculation

Step 8: 데이터 마이그레이션 (수동)
  - CompetitorChannel → Channel(type=COMPETITOR) 전환
  - CompetitorChannel 모델 제거 (확인 후)
```
