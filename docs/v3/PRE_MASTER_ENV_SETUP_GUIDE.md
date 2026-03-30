# PRE_MASTER_ENV_SETUP_GUIDE

X2 프로젝트 개발 환경 구축을 위한 단계별 가이드.
PostgreSQL, Prisma, YouTube API 키, 개발 서버 순서로 진행한다.

---

## Step 0: 기존 환경 충돌 확인

설치 전 기존 프로세스/컨테이너가 포트를 점유하고 있는지 확인한다.

```bash
# 기존 PostgreSQL 컨테이너가 있는지 확인
docker ps -a | grep postgres

# 5432 포트를 이미 사용 중인 프로세스가 있는지 확인
lsof -i :5432

# Windows의 경우 netstat으로 확인
netstat -ano | findstr :5432
```

충돌이 발견되면 해당 프로세스를 중지하거나,
아래 설정에서 포트를 변경하여 사용한다 (예: 5433).

---

## Step 1: PostgreSQL 시작

3가지 옵션 중 환경에 맞는 방법을 선택한다.

### Option A: Docker (권장)

Docker Desktop이 설치되어 있는 경우 가장 간편하다.

```bash
docker run -d --name x2-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=x2 \
  -p 5432:5432 postgres:16-alpine
```

컨테이너 상태 확인:

```bash
docker ps | grep x2-postgres
docker logs x2-postgres
```

재시작 시:

```bash
docker start x2-postgres
```

완전 초기화가 필요한 경우:

```bash
docker stop x2-postgres
docker rm x2-postgres
# 위의 docker run 명령 다시 실행
```

### Option B: WSL (Docker 없는 경우)

WSL에 Ubuntu가 설치되어 있다면 apt로 설치한다.

```bash
# PostgreSQL 설치
wsl -e sudo apt-get update
wsl -e sudo apt-get install -y postgresql postgresql-contrib

# 서비스 시작
wsl -e sudo service postgresql start

# postgres 유저 및 DB 생성
wsl -e sudo -u postgres createuser -s postgres
wsl -e sudo -u postgres createdb x2
```

비밀번호 설정:

```bash
wsl -e sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

WSL에서 서비스 상태 확인:

```bash
wsl -e sudo service postgresql status
```

주의: WSL 재부팅 시 postgresql 서비스가 자동 시작되지 않는다.
매번 `wsl -e sudo service postgresql start`를 실행해야 한다.

### Option C: Windows native

1. https://www.postgresql.org/download/windows/ 에서 PostgreSQL 16 설치
2. 설치 중 비밀번호를 `postgres`로 설정
3. 포트는 기본값 5432 유지
4. pgAdmin 같이 설치 가능 (선택)
5. 설치 완료 후 Windows 서비스에서 PostgreSQL이 Running인지 확인

DB 생성 (pgAdmin 또는 psql):

```sql
CREATE DATABASE x2;
```

---

## Step 2: 환경변수 설정

두 곳에 환경변수를 설정해야 한다.

### packages/db/.env (Prisma용)

```bash
# packages/db/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
```

이 파일은 Prisma CLI가 직접 참조한다.
`prisma db push`, `prisma generate`, `prisma studio` 등의 명령에서 사용된다.

### .env.local (앱 전체)

프로젝트 루트에 `.env.local` 파일을 생성한다.

```bash
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
```

Next.js 런타임에서 DB에 접근할 때 이 값을 사용한다.

### 포트를 변경한 경우

5432 대신 다른 포트를 사용한다면 모든 URL에서 포트를 수정한다.

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/x2?schema=public"
```

---

## Step 3: Prisma 스키마 반영

PostgreSQL이 실행 중인 상태에서 다음을 실행한다.

```bash
# 스키마를 DB에 반영 (테이블 생성)
pnpm --filter @x2/db exec prisma db push

# Prisma Client 생성
pnpm --filter @x2/db exec prisma generate
```

`db push`는 개발 환경에서 빠르게 스키마를 반영하는 용도이다.
migration 히스토리가 생성되지 않으므로 프로덕션에서는 사용하지 않는다.

프로덕션 또는 migration 히스토리가 필요한 경우:

```bash
pnpm --filter @x2/db exec prisma migrate dev --name init
```

스키마 반영 후 DB 상태를 확인하려면:

```bash
pnpm --filter @x2/db exec prisma studio
# 브라우저에서 http://localhost:5555 접속
```

---

## Step 4: YouTube API 키

YouTube Data API v3 키를 발급받아 설정한다.

### 발급 절차

1. Google Cloud Console (https://console.cloud.google.com) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. APIs & Services > Library 이동
4. "YouTube Data API v3" 검색 후 활성화
5. APIs & Services > Credentials 이동
6. "Create Credentials" > "API key" 선택
7. 생성된 키 복사

### 환경변수 추가

```bash
# .env.local에 추가
echo 'YOUTUBE_API_KEY="AIza..."' >> .env.local
```

> WARNING: 실제 API 키 값을 코드나 문서에 커밋하지 마세요.
> .env.local은 .gitignore에 포함되어 있어야 합니다.

### 키 제한 설정 (권장)

Google Cloud Console에서 키 사용을 제한할 수 있다:
- Application restrictions: HTTP referrers 또는 IP addresses
- API restrictions: YouTube Data API v3만 허용

### 할당량 참고

YouTube Data API v3의 일일 기본 할당량은 10,000 units이다.
search 요청은 100 units, video/channel 요청은 1 unit을 소비한다.

---

## Step 5: 개발 서버

```bash
pnpm dev
```

정상적으로 시작되면 http://localhost:4020 에서 접속할 수 있다.

Turbopack 모드로 실행되며, 파일 변경 시 HMR이 적용된다.

### 포트 관련

개발 서버 포트는 4020이다.
`AUTH_URL`과 `NEXT_PUBLIC_APP_URL` 모두 4020을 사용한다.

---

## Step 6: 연결 확인

### PostgreSQL 연결

```bash
# pg_isready로 확인
pg_isready -h localhost -p 5432

# 기대 출력: localhost:5432 - accepting connections
```

### DB 테이블 확인

```bash
pnpm --filter @x2/db exec prisma studio
# 브라우저에서 모델 목록이 표시되면 정상
```

### 개발 서버 동작 확인

1. http://localhost:4020 접속
2. 로그인 또는 메인 페이지 로드 확인
3. 브라우저 개발자 도구 Console에서 에러 없는지 확인

---

## 트러블슈팅

### PostgreSQL 연결 실패

```
Error: P1001: Can't reach database server at `localhost:5432`
```

- PostgreSQL 서비스가 실행 중인지 확인
- 포트가 올바른지 확인
- 방화벽이 5432를 차단하고 있는지 확인

### Prisma generate 실패

```
Error: EPERM: operation not permitted
```

- node_modules를 삭제하고 `pnpm install` 재실행
- 관리자 권한으로 터미널 실행

### Docker 컨테이너 시작 실패

```
Error: port is already allocated
```

- `docker ps -a`로 기존 컨테이너 확인
- 기존 컨테이너 제거 후 재시작
- 또는 호스트 포트를 변경: `-p 5433:5432`

### WSL에서 PostgreSQL 시작 실패

```
pg_ctl: could not start server
```

- 로그 확인: `/var/log/postgresql/postgresql-16-main.log`
- 데이터 디렉토리 권한 확인
- `wsl --shutdown` 후 WSL 재시작
