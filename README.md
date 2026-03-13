# X2 - Social Media Analytics & Social Listening Platform

소셜 미디어 분석 및 소셜 리스닝 SaaS 플랫폼.
멀티채널(YouTube, Instagram, TikTok, X) 데이터를 수집/분석하고, AI 기반 인사이트와 전략을 제공한다.

## Tech Stack

| Layer      | Technology                             |
| ---------- | -------------------------------------- |
| Framework  | Next.js 15 (App Router)                |
| Language   | TypeScript                             |
| Styling    | TailwindCSS + shadcn/ui                |
| API        | tRPC v11                               |
| Database   | PostgreSQL (Supabase)                  |
| ORM        | Prisma                                 |
| Auth       | Auth.js v5 (Google, Kakao 소셜 로그인) |
| Queue      | BullMQ + Redis (Upstash)               |
| AI         | Vercel AI SDK + Claude API             |
| Payments   | Stripe (글로벌) / TossPayments (국내)  |
| Monorepo   | Turborepo                              |
| Deployment | Vercel                                 |
| Analytics  | PostHog                                |

## Project Structure

```
X2/
├── apps/
│   └── web/                          # Next.js 15 웹 애플리케이션
│       └── src/
│           ├── app/                   # App Router 라우트
│           │   ├── (auth)/            #   인증 페이지 (로그인, 회원가입)
│           │   ├── (dashboard)/       #   대시보드 (로그인 후 메인 UI)
│           │   │   ├── dashboard/     #     메인 대시보드
│           │   │   ├── channels/      #     채널 관리
│           │   │   └── settings/      #     설정
│           │   ├── (marketing)/       #   마케팅 페이지 (랜딩, 가격 등)
│           │   └── api/               #   API 라우트 (tRPC, webhook 등)
│           ├── components/            # 웹 앱 전용 컴포넌트
│           │   ├── layout/            #   레이아웃 (Sidebar, Header)
│           │   ├── shared/            #   공유 UI (로딩, 에러 등)
│           │   └── features/          #   기능별 컴포넌트
│           ├── hooks/                 # 커스텀 훅
│           ├── lib/                   # 유틸리티, 상수
│           └── styles/                # 디자인 토큰, 전역 스타일
│
├── packages/
│   ├── ui/                            # 공유 UI 라이브러리 (@x2/ui)
│   │   └── src/
│   │       ├── primitives/            #   기본 컴포넌트 (Button, Card 등)
│   │       ├── components/            #   복합 컴포넌트 (StatCard 등)
│   │       └── utils.ts               #   cn() 스타일 유틸
│   ├── types/                         # 공유 타입 정의 (@x2/types)
│   ├── db/                            # Prisma 스키마 및 DB 클라이언트 (@x2/db)
│   ├── auth/                          # Auth.js 설정 (@x2/auth)
│   ├── api/                           # tRPC 라우터 (@x2/api)
│   ├── social/                        # 소셜 미디어 API 연동 (@x2/social)
│   ├── ai/                            # AI 분석 모듈 (@x2/ai)
│   ├── queue/                         # BullMQ 작업 큐 (@x2/queue)
│   └── config/                        # 공유 설정
│       ├── eslint/                    #   ESLint Flat Config
│       ├── typescript/                #   tsconfig (base, nextjs, library)
│       └── tailwind/                  #   Tailwind 공유 설정
│
├── workers/
│   └── analyzer/                      # 백그라운드 분석 워커
│
├── docs/                              # 프로젝트 문서
│   ├── ARCHITECTURE.md                #   시스템 아키텍처
│   ├── DECISIONS.md                   #   기술 의사결정 기록 (ADR)
│   ├── GETTING_STARTED.md             #   개발환경 세팅 가이드
│   └── ROADMAP.md                     #   개발 로드맵
│
├── .husky/                            # Git hooks (pre-commit lint)
├── turbo.json                         # Turborepo 태스크 설정
├── pnpm-workspace.yaml                # pnpm 워크스페이스 정의
├── package.json                       # 루트 스크립트 및 엔진 제약
├── .env.example                       # 환경변수 템플릿
├── .editorconfig                      # 에디터 설정 통일
├── .nvmrc                             # Node.js 버전 고정
└── prettier.config.js                 # 코드 포맷 규칙
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (PostgreSQL, Redis 로컬 개발용)

### Setup

```bash
# 의존성 설치
pnpm install

# 환경변수 설정
cp .env.example .env.local

# DB 마이그레이션
pnpm db:migrate

# 개발 서버 실행
pnpm dev
```

## Scripts

| 명령어            | 설명                           |
| ----------------- | ------------------------------ |
| `pnpm dev`        | 전체 개발 서버 실행            |
| `pnpm build`      | 프로덕션 빌드                  |
| `pnpm lint`       | ESLint 검사                    |
| `pnpm typecheck`  | TypeScript 타입 검사           |
| `pnpm format`     | Prettier 코드 포맷팅           |
| `pnpm test`       | 테스트 실행                    |
| `pnpm clean`      | 빌드 캐시 및 node_modules 삭제 |
| `pnpm db:migrate` | Prisma 마이그레이션            |
| `pnpm db:studio`  | Prisma Studio (DB GUI)         |

## Documentation

**프로젝트**

- [GETTING_STARTED.md](./docs/GETTING_STARTED.md) - 개발환경 세팅 가이드
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - 시스템 아키텍처
- [ROADMAP.md](./docs/ROADMAP.md) - 개발 로드맵 및 단계 정의
- [DECISIONS.md](./docs/DECISIONS.md) - 기술 의사결정 기록

**엔지니어링 규칙**

- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) - 기여 가이드 및 패키지 의존성 규칙
- [CODE_STYLE.md](./docs/CODE_STYLE.md) - 네이밍, 파일 구성, TypeScript 규칙
- [UI_GUIDELINES.md](./docs/UI_GUIDELINES.md) - 컴포넌트 설계, RSC/RCC, 대시보드 UI
- [API_GUIDELINES.md](./docs/API_GUIDELINES.md) - tRPC, 응답 포맷, 에러 처리
- [GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) - 브랜치, 커밋, PR 규칙

## License

Proprietary - All rights reserved.
