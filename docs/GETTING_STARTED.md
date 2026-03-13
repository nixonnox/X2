# Getting Started

X2 프로젝트 로컬 개발환경 세팅 가이드.

## 필수 소프트웨어

| 소프트웨어        | 버전          | 용도                        |
| ----------------- | ------------- | --------------------------- |
| **Node.js**       | 20.x LTS 이상 | 런타임                      |
| **pnpm**          | 10.x 이상     | 패키지 매니저               |
| **Git**           | 2.x 이상      | 버전 관리                   |
| **Docker** (선택) | 최신          | PostgreSQL, Redis 로컬 실행 |

## 1. Node.js 설치

### Windows

```powershell
# winget 사용
winget install OpenJS.NodeJS.LTS

# 또는 nvm-windows 사용 (https://github.com/coreybutler/nvm-windows)
nvm install 20
nvm use 20
```

### macOS

```bash
# Homebrew 사용
brew install node@20

# 또는 nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20
```

## 2. pnpm 설치

```bash
# npm을 통해 설치
npm install -g pnpm

# 또는 corepack 사용 (Node.js 내장)
corepack enable
corepack prepare pnpm@latest --activate

# 설치 확인
pnpm -v
```

## 3. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url> X2
cd X2

# 의존성 설치 (모든 workspace 패키지 포함)
pnpm install
```

## 4. 환경변수 설정

```bash
# 환경변수 파일 복사
cp .env.example .env.local
```

`.env.local` 파일을 열어 아래 값들을 설정합니다.

### 최소 실행에 필요한 환경변수

개발 서버만 실행하려면 아래 값은 나중에 설정해도 됩니다:

| 변수                    | 필요 시점        | 발급 위치                 |
| ----------------------- | ---------------- | ------------------------- |
| `DATABASE_URL`          | DB 연동 시       | Supabase 또는 로컬 Docker |
| `AUTH_SECRET`           | 인증 기능 시     | `npx auth secret` 실행    |
| `AUTH_GOOGLE_ID/SECRET` | Google 로그인 시 | Google Cloud Console      |
| `ANTHROPIC_API_KEY`     | AI 기능 시       | console.anthropic.com     |
| `YOUTUBE_API_KEY`       | YouTube 분석 시  | Google Cloud Console      |
| `STRIPE_*`              | 결제 기능 시     | dashboard.stripe.com      |

## 5. 개발 서버 실행

```bash
# 전체 워크스페이스 개발 서버 실행
pnpm dev

# 웹 앱만 실행
pnpm dev --filter=@x2/web
```

브라우저에서 http://localhost:3000 접속하여 확인합니다.

## 6. 주요 명령어

```bash
# 개발 서버
pnpm dev                    # 전체 개발 서버 실행

# 빌드
pnpm build                  # 전체 프로덕션 빌드

# 코드 품질
pnpm lint                   # ESLint 검사
pnpm typecheck              # TypeScript 타입 검사
pnpm format                 # Prettier 코드 포맷팅
pnpm format:check           # 포맷팅 검사 (CI용)

# 테스트
pnpm test                   # 전체 테스트 실행

# 데이터베이스 (DB 연결 설정 후)
pnpm db:generate            # Prisma Client 생성
pnpm db:migrate             # 마이그레이션 실행
pnpm db:push                # 스키마 DB에 반영 (개발용)
pnpm db:studio              # Prisma Studio (DB GUI)

# 정리
pnpm clean                  # 빌드 캐시 및 node_modules 삭제
```

## 7. (선택) Docker로 로컬 DB/Redis 실행

DB와 Redis를 로컬에서 실행하려면:

```bash
# PostgreSQL
docker run -d \
  --name x2-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=x2 \
  -p 5432:5432 \
  postgres:16-alpine

# Redis
docker run -d \
  --name x2-redis \
  -p 6379:6379 \
  redis:7-alpine
```

또는 Supabase/Upstash의 클라우드 서비스를 사용합니다.

## 8. 추천 VS Code 확장

프로젝트를 VS Code로 열면 자동으로 추천 확장이 표시됩니다:

- **ESLint** - 코드 린팅
- **Prettier** - 코드 포맷팅
- **Tailwind CSS IntelliSense** - Tailwind 자동완성
- **Prisma** - Prisma 스키마 하이라이팅
- **EditorConfig** - 에디터 설정 통일

## 프로젝트 구조

```
X2/
├── apps/
│   └── web/                 # Next.js 웹 앱 (localhost:3000)
├── packages/
│   ├── ui/                  # 공유 UI 컴포넌트
│   ├── db/                  # Prisma 스키마 및 DB 클라이언트
│   ├── auth/                # 인증 설정
│   ├── api/                 # tRPC API 라우터
│   ├── social/              # 소셜 미디어 연동
│   ├── ai/                  # AI 분석 모듈
│   ├── queue/               # 작업 큐
│   └── config/              # 공유 설정
│       ├── eslint/          # ESLint 설정
│       ├── typescript/      # TypeScript 설정
│       └── tailwind/        # Tailwind 설정
├── workers/
│   └── analyzer/            # 백그라운드 워커
├── docs/                    # 프로젝트 문서
├── turbo.json               # Turborepo 설정
├── pnpm-workspace.yaml      # pnpm 워크스페이스 정의
└── package.json             # 루트 패키지 (스크립트, 엔진 제약)
```

## 트러블슈팅

### pnpm install 시 빌드 에러

```bash
# 빌드 승인이 필요한 패키지가 있으면
pnpm approve-builds
```

### 포트 3000이 이미 사용 중

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS
lsof -i :3000
kill -9 <PID>
```

### node_modules 꼬임

```bash
pnpm clean
pnpm install
```
