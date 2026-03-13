# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│              (Next.js App Router + RSC)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Next.js Server                        │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ tRPC Router  │  │ Auth.js  │  │ Server Actions    │  │
│  └──────┬──────┘  └────┬─────┘  └────────┬──────────┘  │
│         │              │                  │              │
│  ┌──────▼──────────────▼──────────────────▼──────────┐  │
│  │              Service Layer                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │  │
│  │  │ Social   │ │ Analytics│ │ AI Insight         │ │  │
│  │  │ Service  │ │ Service  │ │ Service            │ │  │
│  │  └──────────┘ └──────────┘ └────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└──────────┬──────────────┬───────────────┬───────────────┘
           │              │               │
     ┌─────▼─────┐ ┌─────▼─────┐  ┌──────▼──────┐
     │ PostgreSQL │ │   Redis   │  │  External   │
     │ (Supabase) │ │ (Upstash) │  │  APIs       │
     └───────────┘ └─────┬─────┘  │ - YouTube   │
                         │        │ - Instagram  │
                   ┌─────▼─────┐  │ - TikTok    │
                   │  BullMQ   │  │ - X (Twitter)│
                   │  Workers  │  │ - Claude AI  │
                   └───────────┘  └─────────────┘
```

## Layer 설명

### 1. Presentation Layer (apps/web)

Next.js App Router 기반. React Server Components를 적극 활용하여 서버 사이드에서 데이터를 직접 fetch한다.

- **Layout**: 대시보드 레이아웃 (사이드바 + 헤더 + 메인 콘텐츠)
- **Pages**: 대시보드, 채널 관리, 분석 상세, 리포트, 설정
- **Components**: shadcn/ui 기반 공유 컴포넌트 (`packages/ui`)

### 2. API Layer (packages/api)

tRPC를 사용하여 end-to-end 타입 안전 API를 구성한다.

```
packages/api/
├── src/
│   ├── root.ts              # 루트 라우터
│   ├── trpc.ts              # tRPC 인스턴스 및 미들웨어
│   └── routers/
│       ├── channel.ts       # 채널 CRUD, 연동
│       ├── analytics.ts     # 분석 데이터 조회
│       ├── content.ts       # 콘텐츠(영상/게시물) 관리
│       ├── comment.ts       # 댓글 분석
│       ├── report.ts        # 리포트 생성/조회
│       ├── keyword.ts       # 키워드 검색/리스닝
│       ├── insight.ts       # AI 인사이트
│       ├── billing.ts       # 구독/결제
│       └── user.ts          # 사용자/설정
```

### 3. Service Layer

비즈니스 로직을 캡슐화한다. tRPC 라우터는 가볍게 유지하고 실제 로직은 서비스에 위임한다.

### 4. Social Integration Layer (packages/social)

각 소셜 플랫폼 API를 추상화한다.

```typescript
// 공통 인터페이스
interface SocialProvider {
  getChannelInfo(url: string): Promise<ChannelInfo>;
  getContents(channelId: string, options: FetchOptions): Promise<Content[]>;
  getAnalytics(channelId: string, period: DateRange): Promise<AnalyticsData>;
  getComments(contentId: string): Promise<Comment[]>;
}

// 플랫폼별 구현
class YouTubeProvider implements SocialProvider { ... }
class InstagramProvider implements SocialProvider { ... }
class TikTokProvider implements SocialProvider { ... }
class XProvider implements SocialProvider { ... }
```

URL 기반 기본 분석과 API 연동 상세 분석을 구분하여 처리한다:

- **Basic Mode**: URL 파싱 → 공개 데이터 스크래핑/OEmbed
- **Connected Mode**: OAuth 연동 → 공식 API를 통한 상세 데이터

### 5. AI Layer (packages/ai)

Vercel AI SDK + Claude API를 활용한다.

- **콘텐츠 분석**: 댓글 감성 분석, 토픽 추출
- **인사이트 생성**: 채널 성과 요약, 개선 포인트
- **전략 제안**: 단기/중기/장기 콘텐츠 전략
- **트렌드 예측**: 키워드/카테고리별 트렌드 방향

### 6. Queue/Worker Layer (workers/analyzer)

BullMQ를 사용한 비동기 작업 처리:

- **데이터 수집 스케줄러**: 주기적 채널/콘텐츠 데이터 갱신
- **분석 파이프라인**: 수집 → 정제 → 분석 → 저장
- **리포트 생성**: PDF/이미지 리포트 비동기 생성
- **알림**: 트렌드 변화, 분석 완료 알림

## Database Schema (Core)

```
users
├── id, email, name, image, plan
├── accounts (소셜 로그인)
└── subscriptions (결제/구독)

channels
├── id, userId, platform, platformChannelId
├── name, url, thumbnail, subscriberCount
├── connectionType (basic | connected)
└── lastSyncAt

contents
├── id, channelId, platformContentId
├── title, description, publishedAt
├── viewCount, likeCount, commentCount
└── thumbnailUrl

analytics_snapshots
├── id, channelId, date
├── followers, views, engagement
└── growthRate, topContents (JSON)

comments
├── id, contentId, authorName
├── text, likeCount, publishedAt
└── sentiment, topics (분석 결과)

keywords
├── id, userId, keyword, platform
├── volume, trend, relatedKeywords (JSON)
└── lastUpdatedAt

reports
├── id, userId, channelId
├── type, title, data (JSON)
└── generatedAt

ai_insights
├── id, channelId, type
├── content, confidence
└── period, createdAt
```

## Authentication Flow

Auth.js v5를 사용한 소셜 로그인:

- Google OAuth 2.0 (필수)
- Kakao OAuth (국내 사용자)
- 추후: Apple, Naver

세션은 JWT 기반으로 처리하며, Prisma Adapter로 DB에 사용자 정보를 저장한다.

## Billing Architecture

- **요금제**: Free / Pro / Business (3-tier)
- **결제**: Stripe Checkout + Webhook
- **Feature Gate**: 미들웨어 레벨에서 요금제별 기능 제한
- **Usage Tracking**: 분석 요청 수, 채널 수 등 사용량 추적

## 확장 계획

### Phase 2: Python Worker 추가

MVP 이후 데이터 파이프라인이 복잡해지면 Python 기반 분석 워커를 추가한다.

- 별도 서비스로 배포 (Docker)
- Redis 큐를 통해 Next.js 서버와 통신
- pandas, scikit-learn 등 Python 데이터 생태계 활용

### Phase 3: 앱 (React Native)

웹 MVP 안정화 후 React Native (Expo)로 모바일 앱 개발.

- `packages/` 내 비즈니스 로직 재사용
- tRPC 클라이언트 공유
