# PostgreSQL Runtime Connection Report

> Date: 2026-03-15
> Status: CONNECTED

## 1. Docker Container

| Item | Value |
|------|-------|
| Container Name | `x2-postgres` |
| Image | `postgres:16` |
| Port | `5432` (localhost) |
| Database | `x2` |
| User | `postgres` |
| Status | Running, accepting connections |

## 2. DATABASE_URL 일관성

| Location | DATABASE_URL | Status |
|----------|-------------|--------|
| `packages/db/.env` | `postgresql://postgres:postgres@localhost:5432/x2?schema=public` | OK |
| `.env.local` (root) | `postgresql://postgres:postgres@localhost:5432/x2?schema=public` | OK |
| `apps/web/.env.local` | `postgresql://postgres:postgres@localhost:5432/x2?schema=public` | OK |
| `.env.example` | `postgresql://postgres:postgres@localhost:5432/x2?schema=public` | OK (template) |

> 모든 환경 파일이 동일한 DATABASE_URL을 참조.
> DIRECT_URL도 동일하게 설정됨.

## 3. Prisma Client 연결 구조

- `packages/db/src/index.ts` → singleton `PrismaClient` export (`db`)
- 모든 repository가 `BaseRepository`를 통해 주입받은 `PrismaClient` 사용
- mock/in-memory fallback 없음

## 4. 연결 검증 방법

```bash
# Container 상태 확인
docker exec x2-postgres pg_isready -U postgres

# 직접 쿼리 테스트
docker exec x2-postgres psql -U postgres -d x2 -c "\dt public.*"
```

## 5. 주의사항

- Docker Desktop이 실행 중이어야 PostgreSQL 접근 가능
- 재부팅 후 `docker start x2-postgres`로 컨테이너 재시작 필요
- 데이터는 Docker volume에 저장되므로 `docker rm x2-postgres` 시 데이터 소실
