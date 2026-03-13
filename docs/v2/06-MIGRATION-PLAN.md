# X2 v2 — Migration Plan (MVP → Production)

> 작성일: 2026-03-10
> 상태: Draft

---

## 0. 불변 원칙

1. **Mock/Hardcoded 데이터 전면 금지** — Fallback 전용만 허용
2. **공식 API 우선** — 웹 수집 시 robots.txt + 공개 범위 준수
3. **GEO/AEO Citation 추적 필수** — 인용 트래킹 + 출처 우선순위 관리
4. **점진적 전환** — 한번에 전체 교체하지 않고 모듈별 순차 전환

---

## 1. 전환 단계 개요

```
Phase 0: 인프라 기반                        ← 지금 여기
  DB 연결, Redis 연결, Worker 기본 구조

Phase 1: Social Intelligence 실데이터       ← 최우선
  인메모리 → DB, Social API 수집 파이프라인

Phase 2: Comment Intelligence
  댓글 수집 + AI 감성/토픽 분석 파이프라인

Phase 3: Search Intent 정식화
  기존 intent-engine DB 연결 + 결과 영속화

Phase 4: GEO/AEO 신규 모듈
  AI 검색엔진 크롤링 + Citation 추적

Phase 5: Action Automation
  인사이트 → 액션 생성 + 자동화 규칙
```

---

## 2. Phase 0: 인프라 기반

### 작업 목록

| #   | 작업                       | 영향 범위      | 비고                           |
| --- | -------------------------- | -------------- | ------------------------------ |
| 0.1 | PostgreSQL 로컬 실행 확인  | DB             | docker-compose 또는 로컬 설치  |
| 0.2 | Prisma schema v2 필드 추가 | packages/db    | 기존 필드 유지 + nullable 확장 |
| 0.3 | `prisma migrate dev` 실행  | packages/db    | 마이그레이션 생성              |
| 0.4 | Redis 로컬 실행 확인       | BullMQ         | docker 또는 로컬               |
| 0.5 | BullMQ Worker 기본 루프    | packages/queue | 큐 소비 → 로그만               |
| 0.6 | Admin 파이프라인 헬스 API  | apps/web       | `/api/admin/pipeline/health`   |

### 완료 기준

- [x] `prisma db push` 성공
- [x] Redis 연결 확인
- [x] Worker 프로세스 시작 → 로그 출력
- [x] `/api/health` 에서 DB + Redis 상태 확인 가능

---

## 3. Phase 1: Social Intelligence 실데이터

### 핵심 전환: 인메모리 → DB

```
현재: channelService (globalThis in-memory store)
     → channel-service.ts 의 listChannels(), getSnapshot() 등

목표: channelService → Prisma 쿼리 래퍼
     → 동일 인터페이스, 내부 구현만 DB로 교체
```

### 작업 목록

| #    | 작업                                                              | 파일               | 비고                         |
| ---- | ----------------------------------------------------------------- | ------------------ | ---------------------------- |
| 1.1  | channelService.listChannels → `db.channel.findMany()`             | channel-service.ts | 인터페이스 유지              |
| 1.2  | channelService.getSnapshot → `db.channelSnapshot.findFirst()`     | channel-service.ts |                              |
| 1.3  | channelService.addChannel → `db.channel.create()` + sync job 등록 | channel-service.ts |                              |
| 1.4  | Channel Sync Worker 구현                                          | packages/queue     | Social API → DB              |
| 1.5  | Content Sync Worker 구현                                          | packages/queue     | Social API → DB              |
| 1.6  | 채널 등록 시 첫 수집 트리거                                       | apps/web API       | 등록 → sync job              |
| 1.7  | 대시보드 KPI → DB 집계 쿼리                                       | dashboard/page.tsx |                              |
| 1.8  | 채널 상세 → DB 쿼리                                               | channels/[id]      |                              |
| 1.9  | 수집 상태 표시 UI                                                 | 채널 목록/상세     | PENDING, SYNCING, ERROR 상태 |
| 1.10 | "데이터 없음" 빈 상태 UI                                          | 전체               | 스켈레톤 → 빈 상태 분기      |

### 전환 전략: Adapter 패턴

```typescript
// 1단계: 인터페이스 추출
interface IChannelService {
  listChannels(projectId: string): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | null>;
  getSnapshot(channelId: string): Promise<ChannelSnapshot | null>;
  getSnapshotSeries(
    channelId: string,
    days: number,
  ): Promise<ChannelSnapshot[]>;
  getContents(channelId: string): Promise<Content[]>;
  addChannel(input: AddChannelInput): Promise<Channel>;
  deleteChannel(id: string): Promise<void>;
}

// 2단계: DB 구현체 작성
class PrismaChannelService implements IChannelService {
  constructor(private db: PrismaClient) {}

  async listChannels(projectId: string) {
    return this.db.channel.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }
  // ...
}

// 3단계: DI로 교체
// 환경에 따라 인메모리 또는 DB 선택 (전환 기간 중)
const channelService: IChannelService = process.env.DATABASE_URL
  ? new PrismaChannelService(db)
  : new InMemoryChannelService(); // 레거시 fallback
```

---

## 4. Phase 2: Comment Intelligence

### 작업 목록

| #   | 작업                    | 비고                               |
| --- | ----------------------- | ---------------------------------- |
| 2.1 | Comment Sync Worker     | Social API getComments → DB        |
| 2.2 | Comment AI Batch Worker | 미분석 댓글 → AI → CommentAnalysis |
| 2.3 | 댓글 대시보드 → DB 쿼리 | 감성 분포, 트렌드 차트             |
| 2.4 | 토픽 클러스터 UI        | CommentAnalysis.topics 집계        |
| 2.5 | FAQ 추출 배치           | 주 1회 AI 작업                     |
| 2.6 | 리스크 알림             | isRisk=true → 알림 트리거          |

---

## 5. Phase 3: Search Intent 정식화

### 작업 목록

| #   | 작업                                          | 비고                           |
| --- | --------------------------------------------- | ------------------------------ |
| 3.1 | IntentQuery / IntentKeywordResult 모델 활성화 | DB 마이그레이션                |
| 3.2 | intent-engine → DB 결과 저장                  | 현재 인메모리/캐시만           |
| 3.3 | 분석 이력 UI                                  | 과거 분석 결과 목록/상세       |
| 3.4 | 갭 분석 UI 고도화                             | BLUE_OCEAN 키워드 하이라이트   |
| 3.5 | 프로젝트별 관리                               | 워크스페이스 내 분석 결과 격리 |

---

## 6. Phase 4: GEO/AEO 모듈 (신규)

### 작업 목록

| #   | 작업                               | 비고                       |
| --- | ---------------------------------- | -------------------------- |
| 4.1 | AeoKeyword / AeoSnapshot 모델 생성 | DB 마이그레이션            |
| 4.2 | AEO Crawler 구현                   | SerpAPI / Perplexity API   |
| 4.3 | Citation 파서                      | AI 답변에서 인용 소스 추출 |
| 4.4 | 가시성 점수 계산 로직              | 규칙 기반                  |
| 4.5 | AI 가시성 대시보드 UI              | 추적 키워드 + 점수 차트    |
| 4.6 | 경쟁 비교 UI                       | 우리 vs 경쟁사 가시성      |
| 4.7 | AEO Sync Worker                    | 일 1회 크롤링              |
| 4.8 | GEO 최적화 제안 AI                 | 전략 가이드 생성           |

---

## 7. Phase 5: Action Automation

### 작업 목록

| #   | 작업                                         | 비고                  |
| --- | -------------------------------------------- | --------------------- |
| 5.1 | InsightAction 확장 (sourceModule, 실행 추적) | DB 마이그레이션       |
| 5.2 | 크로스 모듈 인사이트 합성                    | AI (Premium)          |
| 5.3 | Action Center UI                             | 액션 목록 + 상태 관리 |
| 5.4 | AutomationRule 모델 + UI                     | 규칙 CRUD             |
| 5.5 | Automation Worker                            | 규칙 매칭 → 자동 실행 |
| 5.6 | Slack/Email 웹훅 연동                        | 알림 전달             |
| 5.7 | 콘텐츠 캘린더 UI                             | 발행 스케줄 + AI 제안 |

---

## 8. 제거 대상 (기존 코드)

### 즉시 제거 가능

| 파일/코드                   | 이유             | 대체                 |
| --------------------------- | ---------------- | -------------------- |
| `src/lib/mock-data.ts`      | Mock 데이터 소스 | DB 쿼리              |
| `globalThis.__channelStore` | 인메모리 스토어  | Prisma               |
| `Math.random()` 기반 지표   | 가짜 데이터      | 실계산 또는 빈 상태  |
| hardcoded AI_INSIGHTS       | Mock 인사이트    | AI 생성 또는 빈 상태 |

### Phase 1 완료 후 제거

| 파일/코드                                | 이유                          |
| ---------------------------------------- | ----------------------------- |
| `InMemoryChannelService`                 | DB 전환 완료                  |
| `/api/channels/route.ts` (인메모리 CRUD) | tRPC + DB로 교체              |
| 채널 상세의 하드코딩 차트 데이터         | ChannelSnapshot 시계열로 교체 |

---

## 9. 기존 코드와 v2 매핑

### 재사용 가능한 기존 코드

| 기존                                        | v2 위치                  | 재사용도 |
| ------------------------------------------- | ------------------------ | -------- |
| `packages/social/` Provider 인터페이스      | 그대로 사용              | 높음     |
| `packages/auth/` 설정                       | 그대로 사용              | 높음     |
| `packages/db/` Prisma 설정                  | 스키마 확장              | 높음     |
| `packages/api/` tRPC 구조                   | 라우터 확장              | 높음     |
| `src/lib/intent-engine/`                    | DB 연결 추가             | 중간     |
| `src/lib/ai/` 실행 프레임워크               | Provider/Executor 재사용 | 높음     |
| `src/lib/channels/url/` URL 파서            | 그대로 사용              | 높음     |
| `src/components/layout/`                    | UI 유지                  | 높음     |
| `src/components/shared/` KpiCard, ChartCard | 재사용                   | 높음     |

### 재작성 필요

| 기존                            | 이유          | v2 대체               |
| ------------------------------- | ------------- | --------------------- |
| `channel-service.ts` (인메모리) | DB 전환       | PrismaChannelService  |
| 대시보드 page.tsx (동기 호출)   | async DB 쿼리 | Server Component + DB |
| 댓글 page.tsx (하드코딩)        | 실데이터 필요 | DB 쿼리 + AI 분석     |
| 인사이트 page.tsx (목업)        | 실데이터 필요 | InsightReport DB      |

---

## 10. 우선순위 결정 기준

```
[최우선] 사용자가 즉시 체감하는 변화
  → Phase 0 + Phase 1 (채널 실데이터)

[높음] 핵심 차별화 기능
  → Phase 2 (Comment Intelligence)
  → Phase 4 (GEO/AEO — 시장에 유사 제품 적음)

[보통] 기존 기능 고도화
  → Phase 3 (Search Intent DB 영속화)
  → Phase 5 (Action Automation)

[나중] 운영 편의
  → Admin 대시보드 고도화
  → 리포트 PDF 내보내기
  → 모바일 앱
```
