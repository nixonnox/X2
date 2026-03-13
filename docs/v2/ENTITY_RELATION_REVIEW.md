# X2 — Entity Relation Review (v2.1)

> 작성일: 2026-03-10
> 상태: 검토용 문서 — PRISMA_SCHEMA_DRAFT.md 기반 관계 분석
> 목적: FK 제약, Cascade 동작, 순환 참조, 다대다 설계 검증

---

## 1. 관계 그래프 개요

```
Workspace (루트)
├── WorkspaceMember ── User
├── Project (핵심 컨테이너)
│   ├── Channel ── ChannelConnection
│   │   ├── ChannelSnapshot
│   │   ├── Content ── ContentMetricDaily
│   │   │   └── Comment ── CommentAnalysis
│   │   ├── InfluencerProfile ── CampaignCreator
│   │   └── CampaignCreator
│   ├── CompetitorChannel (레거시 — ChannelType으로 대체 예정)
│   ├── Keyword ── KeywordMetricDaily
│   ├── InsightReport ── ReportSection ── EvidenceAsset
│   │   └── InsightAction ──? Campaign
│   ├── IntentQuery ── IntentKeywordResult
│   ├── TrendKeywordAnalytics
│   ├── RawSocialMention
│   ├── AeoKeyword ── AeoSnapshot
│   ├── Campaign
│   │   ├── CampaignCreator ── CampaignContent ── PostMeasurement
│   │   ├── CampaignMetric
│   │   └── RoiCalculation
│   ├── CitationReadyReportSource
│   ├── SavedFilter
│   └── DataExportJob
├── Subscription
├── UsageMetric
├── ScheduledJob
└── WorkspaceVerticalPack ── VerticalPack ── ReportTemplate
```

---

## 2. FK 제약 및 Cascade 동작 분석

### 2.1 Cascade Delete 체인 (현재 + 제안)

| 삭제 트리거        | Cascade 경로                                                               | 깊이  | 위험도       |
| ------------------ | -------------------------------------------------------------------------- | ----- | ------------ |
| Workspace 삭제     | → Project → Channel → Content → Comment → CommentAnalysis                  | 6단계 | **CRITICAL** |
| Workspace 삭제     | → Project → Campaign → CampaignCreator → CampaignContent → PostMeasurement | 6단계 | **CRITICAL** |
| Project 삭제       | → Channel → ChannelSnapshot, Content → Comment                             | 4단계 | HIGH         |
| Project 삭제       | → IntentQuery → IntentKeywordResult                                        | 3단계 | MEDIUM       |
| Project 삭제       | → AeoKeyword → AeoSnapshot                                                 | 3단계 | MEDIUM       |
| Project 삭제       | → Campaign → CampaignCreator → CampaignContent → PostMeasurement           | 5단계 | HIGH         |
| Channel 삭제       | → Content → ContentMetricDaily, Comment → CommentAnalysis                  | 4단계 | HIGH         |
| Channel 삭제       | → InfluencerProfile → (CampaignCreator는 Cascade 아님)                     | 2단계 | MEDIUM       |
| InsightReport 삭제 | → ReportSection → EvidenceAsset                                            | 3단계 | MEDIUM       |
| Campaign 삭제      | → CampaignCreator → CampaignContent → PostMeasurement                      | 4단계 | HIGH         |
| Campaign 삭제      | → CampaignMetric, RoiCalculation                                           | 2단계 | LOW          |
| User 삭제          | → Account, Session, WorkspaceMember                                        | 2단계 | MEDIUM       |

### 2.2 Cascade 안전성 권고

```
[CRITICAL] Workspace, Project 삭제 시 연쇄 삭제 깊이 최대 6단계
→ 권고: Workspace/Project에는 hard delete 금지.
        deletedAt 소프트 삭제 도입 후, 30일 보존 후 배치 정리.
        또는 Prisma middleware에서 Workspace/Project DELETE 차단.

[HIGH] Campaign 삭제 시 측정 데이터까지 연쇄 삭제
→ 권고: Campaign에 deletedAt 이미 설계됨. hard delete는 배치 전용.

[MEDIUM] Channel 삭제 시 InfluencerProfile 연쇄 삭제
→ 권고: Channel.deletedAt 소프트 삭제로 실질적 삭제 방지.
        InfluencerProfile은 Channel과 Cascade이므로 Channel이 삭제되면 같이 삭제.
        CampaignCreator.channelId는 optional + Cascade 아님 → 안전.
```

### 2.3 SetNull 관계 (의도적으로 참조 유지)

| FK                                                      | 동작                     | 이유                                 |
| ------------------------------------------------------- | ------------------------ | ------------------------------------ |
| InsightReport.generatedBy → User                        | SetNull                  | 사용자 탈퇴해도 보고서 보존          |
| InsightAction.reportId → InsightReport                  | **SetNull (변경 필요)**  | 리포트 없이 독립 액션 허용           |
| InsightAction.campaignId → Campaign                     | (미지정 — 권고: SetNull) | 캠페인 삭제돼도 액션 히스토리 보존   |
| CampaignCreator.channelId → Channel                     | (미지정 — 권고: SetNull) | 채널 삭제돼도 캠페인 이력 보존       |
| CampaignCreator.influencerProfileId → InfluencerProfile | (미지정 — 권고: SetNull) | 프로필 삭제돼도 협업 이력 보존       |
| CampaignContent.campaignCreatorId → CampaignCreator     | (미지정 — 권고: SetNull) | 크리에이터 매핑 해제돼도 콘텐츠 보존 |
| ReportTemplate.verticalPackId → VerticalPack            | (미지정 — 권고: SetNull) | 팩 삭제돼도 템플릿 보존              |

**권고**: 위 (미지정) 항목들은 schema draft에서 `onDelete` 명시 필요. 기본값은 Prisma에서 에러를 발생시키므로 반드시 지정해야 함.

---

## 3. 관계 유형 분석

### 3.1 1:1 관계

| 모델 A  | 모델 B            | FK 위치                              | 근거              |
| ------- | ----------------- | ------------------------------------ | ----------------- |
| Comment | CommentAnalysis   | CommentAnalysis.commentId (unique)   | 댓글당 분석 1건   |
| Channel | InfluencerProfile | InfluencerProfile.channelId (unique) | 채널당 프로필 1건 |

### 3.2 1:N 관계 (핵심)

| Parent          | Child                 | FK                        | 비고                        |
| --------------- | --------------------- | ------------------------- | --------------------------- |
| Workspace       | Project               | projectId                 | 워크스페이스 → 프로젝트     |
| Project         | Channel               | projectId                 |                             |
| Project         | Campaign              | projectId                 | 신규                        |
| Project         | IntentQuery           | projectId                 | 신규                        |
| Project         | AeoKeyword            | projectId                 | 신규                        |
| Project         | RawSocialMention      | projectId                 | 신규 — **대량 데이터 주의** |
| Project         | TrendKeywordAnalytics | projectId                 | 신규                        |
| Channel         | Content               | channelId                 |                             |
| Channel         | ChannelSnapshot       | channelId                 |                             |
| Content         | Comment               | contentId                 |                             |
| Content         | ContentMetricDaily    | contentId                 |                             |
| Campaign        | CampaignCreator       | campaignId                | 신규                        |
| Campaign        | CampaignContent       | campaignId                | 신규                        |
| Campaign        | CampaignMetric        | campaignId                | 신규                        |
| Campaign        | RoiCalculation        | campaignId                | 신규                        |
| CampaignContent | PostMeasurement       | campaignContentId         | 신규                        |
| InsightReport   | InsightAction         | reportId (nullable)       | **변경**                    |
| InsightReport   | ReportSection         | reportId                  | 신규                        |
| ReportSection   | EvidenceAsset         | sectionId                 | 신규                        |
| AeoKeyword      | AeoSnapshot           | keywordId                 | 신규                        |
| IntentQuery     | IntentKeywordResult   | queryId                   | 신규                        |
| VerticalPack    | ReportTemplate        | verticalPackId (nullable) | 신규                        |

### 3.3 M:N 관계

| 모델 A    | 모델 B                    | 조인 테이블           | 비고                                      |
| --------- | ------------------------- | --------------------- | ----------------------------------------- |
| Workspace | VerticalPack              | WorkspaceVerticalPack | 신규 — 명시적 조인                        |
| User      | Workspace                 | WorkspaceMember       | 기존                                      |
| Campaign  | Channel/InfluencerProfile | CampaignCreator       | 신규 — 풍부한 조인 (보상, 상태, 요구사항) |

---

## 4. 순환 참조 / 교차 참조 분석

### 4.1 InsightAction ↔ Campaign 교차 참조

```
InsightAction.campaignId → Campaign   (액션 → 캠페인)
Campaign.actions → InsightAction[]    (캠페인 → 액션 목록)
```

**문제 없음**: 단방향 FK (InsightAction → Campaign). 양방향은 Prisma 관계 필드로만 표현.

### 4.2 CampaignCreator 이중 참조

```
CampaignCreator.channelId → Channel
CampaignCreator.influencerProfileId → InfluencerProfile
InfluencerProfile.channelId → Channel
```

**잠재 이슈**: CampaignCreator가 Channel과 InfluencerProfile 모두 참조할 때, 두 참조가 같은 채널을 가리키는지 검증 필요.

**권고**: 애플리케이션 레벨 검증 추가:

```typescript
// CampaignCreator 생성 시
if (channelId && influencerProfileId) {
  const profile = await db.influencerProfile.findUnique({
    where: { id: influencerProfileId },
  });
  assert(profile.channelId === channelId, "Channel mismatch");
}
```

### 4.3 CompetitorChannel vs Channel.channelType 중복

```
CompetitorChannel (기존 레거시 모델)
  - projectId → Project
  - platform, platformChannelId (동일 구조)

Channel.channelType = COMPETITOR (신규 설계)
```

**중복 확인**: 동일 채널이 `CompetitorChannel`과 `Channel(type=COMPETITOR)` 양쪽에 존재할 수 있음.

**권고**:

1. Phase 1 시작 시 CompetitorChannel → Channel(type=COMPETITOR) 마이그레이션 스크립트 작성
2. CompetitorChannel 모델은 deprecate 마킹 후, 마이그레이션 완료 시 제거
3. 전환 기간 중 쓰기는 Channel로만, 읽기는 양쪽 모두 지원

---

## 5. 인덱스 전략 분석

### 5.1 대량 데이터 테이블 인덱스 (필수)

| 테이블              | 예상 행 수             | 필수 인덱스                                                       | 이유                    |
| ------------------- | ---------------------- | ----------------------------------------------------------------- | ----------------------- |
| RawSocialMention    | 수십만~수백만/프로젝트 | `[projectId, publishedAt DESC]`, `[matchedKeyword]`, `[platform]` | Data Explorer 필터/정렬 |
| Comment             | 수만~수십만/채널       | `[contentId]`, `[publishedAt]`                                    | 기존 인덱스 충분        |
| ChannelSnapshot     | 채널당 365행/년        | `[channelId, date DESC]`                                          | 시계열 쿼리             |
| ContentMetricDaily  | 콘텐츠당 365행/년      | `[contentId, date]`                                               | 기존 인덱스             |
| AeoSnapshot         | 키워드×엔진×일         | `[keywordId, date DESC]`                                          | 최신 스냅샷 조회        |
| PostMeasurement     | 콘텐츠×일              | `[campaignContentId, date]`                                       | 일별 추적               |
| IntentKeywordResult | 쿼리당 수백 행         | `[queryId]`                                                       | 결과 조회               |

### 5.2 복합 인덱스 권고 (추가)

```prisma
// RawSocialMention — Data Explorer 핵심 쿼리
@@index([projectId, platform, publishedAt(sort: Desc)])  // 플랫폼별 최신순
@@index([projectId, sentiment])                          // 감성 필터

// Campaign — 대시보드 쿼리
@@index([projectId, status, startDate])                  // 활성 캠페인 조회

// InsightAction — 칸반 보드 쿼리
@@index([reportId, status])                              // 리포트별 액션 상태
@@index([campaignId, status])                            // 캠페인별 액션 상태

// EvidenceAsset — 리포트 렌더링
@@index([sectionId, order])                              // 이미 설계됨 ✓
```

### 5.3 Unique Constraint 검증

| 모델                  | Unique                                     | 위험                                  |
| --------------------- | ------------------------------------------ | ------------------------------------- |
| Channel               | `[projectId, platform, platformChannelId]` | ✓ 적절                                |
| RawSocialMention      | `[projectId, platform, platformPostId]`    | ✓ 적절                                |
| ChannelSnapshot       | `[channelId, date]`                        | ✓ 적절                                |
| CampaignMetric        | `[campaignId, date]`                       | ✓ 적절                                |
| AeoSnapshot           | `[keywordId, date, engine]`                | ✓ 적절 — 엔진별 일일 1회              |
| CampaignCreator       | `[campaignId, channelId]`                  | ⚠ channelId nullable — null 중복 가능 |
| IntentKeywordResult   | `[queryId, keyword]`                       | ✓ 적절                                |
| TrendKeywordAnalytics | `[projectId, keyword, locale, period]`     | ✓ 적절                                |

**CampaignCreator unique 이슈**: `channelId`가 nullable이므로 PostgreSQL에서 `[campaignId, null]` 조합은 unique 제약을 통과함. channelId 없이 influencerProfileId만으로 연결하는 경우를 허용해야 하므로 이 동작이 의도적인지 확인 필요.

**권고**: `[campaignId, influencerProfileId]`에 대한 별도 unique도 추가 고려.

---

## 6. 데이터 무결성 규칙

### 6.1 필수 비즈니스 규칙 (앱 레벨 검증)

| 규칙                      | 설명                                            | 검증 위치          |
| ------------------------- | ----------------------------------------------- | ------------------ |
| Campaign 날짜             | `startDate <= endDate`                          | tRPC mutation      |
| Campaign 예산             | `spentBudget <= totalBudget`                    | Metric sync worker |
| CampaignCreator 최소 참조 | `channelId OR influencerProfileId` 중 하나 이상 | tRPC mutation      |
| EvidenceAsset 실데이터    | `dataEntityIds.length > 0` (Mock 금지 원칙)     | Report builder     |
| AeoSnapshot 일일 제한     | 같은 keyword+engine 조합 하루 1회               | AEO crawl worker   |
| InsightAction 완료        | `status = COMPLETED → completedAt NOT NULL`     | tRPC mutation      |
| RoiCalculation 양수       | `totalCost > 0`                                 | ROI calc service   |

### 6.2 Soft Delete 대상 모델

| 모델          | deletedAt 필드 | 이유                          |
| ------------- | -------------- | ----------------------------- |
| Channel       | ✓ (설계됨)     | 연쇄 삭제 방지, 히스토리 보존 |
| Campaign      | ✓ (설계됨)     | 성과 데이터 보존              |
| Workspace     | ✗ (추가 필요)  | CRITICAL cascade 방지         |
| Project       | ✗ (추가 필요)  | CRITICAL cascade 방지         |
| InsightReport | ✗ (추가 고려)  | 보고서 이력 보존              |

---

## 7. 관계 설계 결정 기록

### 7.1 왜 Campaign이 Project 하위인가? (Workspace 아닌 이유)

캠페인은 특정 프로젝트의 채널/키워드에 대해 실행되므로 Project 스코프가 적절. 여러 프로젝트에 걸친 캠페인이 필요하면 향후 `workspaceId` FK를 추가하고 `projectId`를 nullable로 변경.

### 7.2 왜 InfluencerProfile이 Channel의 1:1인가?

인플루언서 = 소셜 채널 운영자. 채널 없이 인플루언서만 존재하는 경우는 없음 (최소 1개 채널 필요). 여러 채널을 운영하는 인플루언서는 각 채널에 별도 InfluencerProfile. 향후 `Influencer` 상위 엔티티로 묶을 수 있으나 현재는 과설계.

### 7.3 왜 EvidenceAsset이 직접 데이터를 저장하지 않는가?

`dataSourceType` + `dataEntityIds` + `dataQuery`로 원본 데이터를 참조. Mock 데이터 금지 원칙에 의해 EvidenceAsset은 항상 실제 데이터 레코드를 가리켜야 함. 스냅샷 시점은 `snapshotDate`로 기록.

### 7.4 왜 CompetitorChannel을 바로 제거하지 않는가?

기존 코드에서 CompetitorChannel을 참조하는 쿼리/컴포넌트가 있을 수 있음. Channel.channelType으로 마이그레이션 후 제거. 전환 기간 중 양쪽 모두 읽기 지원.

---

## 8. 요약 체크리스트

- [x] 모든 FK에 `onDelete` 동작 명시 여부 확인 → **7개 미지정 발견 (§2.3)**
- [x] Cascade 체인 깊이 6단계 이하 확인 → **Workspace/Project 경로 6단계 (§2.1)**
- [x] 순환 참조 없음 확인 → **순환 없음 ✓ (§4)**
- [x] CampaignCreator 이중 참조 무결성 → **앱 레벨 검증 필요 (§4.2)**
- [x] CompetitorChannel 중복 해결 방안 → **마이그레이션 계획 수립 (§4.3)**
- [x] 대량 데이터 테이블 인덱스 → **RawSocialMention 추가 인덱스 권고 (§5.2)**
- [x] Unique constraint nullable 이슈 → **CampaignCreator 확인 필요 (§5.3)**
- [x] Soft delete 대상 → **Workspace, Project 추가 필요 (§6.2)**
