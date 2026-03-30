# PRE_MASTER_ENV_IMPLEMENTATION_NOTES

이번 세션에서 실제로 반영한 코드 변경사항과 환경 설정 시도 기록.
다음 단계 작업 시 참고할 수 있도록 상세히 기록한다.

---

## 이번 세션에서 반영한 코드

### 1. maxAlertsPerDay 일일 한도 체크

**위치:** Alert 평가 서비스 (evaluateAndAlert 함수)

**구현 내용:**

evaluateAndAlert 함수 진입 전에 당일 이미 생성된 알림 수를 조회하여
일일 한도에 도달했으면 조기 종료한다.

```
진입 전 체크:
- 오늘 자정(00:00:00) 이후 생성된 알림 수 조회
- maxAlertsPerDay와 비교
- 한도 도달 시 console.info 로그 출력 후 dailyCapped: true 반환
```

루프 내에서도 실시간으로 한도를 체크한다.

```
루프 내 체크:
- 각 알림 생성 후 remainingDailyCap 감소
- remainingDailyCap <= 0 이면 break
- console.info로 중간 cap 로그 출력
```

### 2. UserPrefs에 maxAlertsPerDay 필드 추가

**위치:** Prisma 스키마 및 관련 서비스

사용자별 일일 알림 한도를 설정할 수 있도록 필드를 추가했다.
기본값은 설정되어 있으며, /settings/notifications에서 변경 가능하다.

### 3. dailyCapped 플래그 반환

**위치:** evaluateAndAlert 반환 타입

함수 호출자가 일일 한도 도달 여부를 알 수 있도록
반환 객체에 `dailyCapped: boolean` 필드를 추가했다.

```
반환 예시:
{
  alerts: [...],
  dailyCapped: true,   // 한도 도달
  totalCreated: 20
}
```

### 4. remainingDailyCap 루프 내 감소 + break

**위치:** evaluateAndAlert 함수 내부 알림 생성 루프

```
초기값: remainingDailyCap = maxAlertsPerDay - todayAlertCount
루프 iteration:
  - 알림 생성
  - remainingDailyCap--
  - if (remainingDailyCap <= 0) break
```

루프 도중에 한도에 도달하면 나머지 조건 평가를 건너뛴다.
이미 중요도 순으로 정렬되어 있으므로 우선순위 높은 알림이 먼저 생성된다.

### 5. console.info 로깅

**위치:** evaluateAndAlert 함수

두 지점에서 로깅한다:

```
사전 cap 로그:
console.info(`[Alert] Daily cap reached: ${todayAlertCount}/${maxAlertsPerDay}. Skipping evaluation.`)

중간 cap 로그:
console.info(`[Alert] Daily cap reached during evaluation. Created ${created} alerts, remaining: 0.`)
```

운영 환경에서 알림 한도 동작을 모니터링할 수 있다.

### 6. packages/db/.env 생성

**위치:** `packages/db/.env`

Prisma CLI가 참조하는 환경변수 파일을 생성했다.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/x2?schema=public"
```

이 파일은 `.gitignore`에 포함되어야 하며 커밋하지 않는다.

### 7. .env.example에 NOTIFICATION_* 변수 추가

**위치:** `.env.example`

다른 개발자가 필요한 환경변수를 파악할 수 있도록 예시를 추가했다.

```env
# Notification settings
NOTIFICATION_LOW_CONFIDENCE_THRESHOLD=0.7
NOTIFICATION_PROVIDER_COVERAGE_THRESHOLD=0.5
NOTIFICATION_COOLDOWN_MINUTES=60
NOTIFICATION_MAX_ALERTS_PER_DAY=20
```

실제 값은 DB의 UserPrefs에서 관리되며,
이 환경변수는 기본값 또는 시스템 레벨 설정으로 사용된다.

---

## 환경 설정 시도 기록

### pg_isready 테스트

```bash
pg_isready -h localhost -p 5432
# 결과: localhost:5432 - no response
# 상태: NOT_READY

pg_isready -h localhost -p 5433
# 결과: localhost:5433 - no response
# 상태: NOT_READY
```

5432, 5433 모두 PostgreSQL이 실행되고 있지 않다.

### Docker 확인

```bash
docker --version
# 결과: command not found
# 상태: NOT AVAILABLE
```

Docker Desktop이 설치되어 있지 않다.
Windows에서 Docker Desktop을 설치해야 한다.

### WSL 확인

```bash
wsl -l -v
# NAME            STATE           VERSION
# Ubuntu-24.04    Running         2
```

WSL에 Ubuntu 24.04가 설치되어 있으나
PostgreSQL은 아직 설치되지 않았거나 설치 중이다.

```bash
wsl -e which psql
# 결과: 없음
# 상태: NOT AVAILABLE
```

### psql 직접 확인

```bash
psql --version
# 결과: command not found
# 상태: NOT AVAILABLE
```

Windows에 psql 클라이언트도 설치되어 있지 않다.

---

## 다음 단계

### 1. PostgreSQL 시작

3가지 옵션 중 선택한다. Docker Desktop 설치가 가장 권장된다.

```bash
# Docker 방식
docker run -d --name x2-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=x2 \
  -p 5432:5432 postgres:16-alpine
```

또는 WSL에서:

```bash
wsl -e sudo apt-get install -y postgresql
wsl -e sudo service postgresql start
```

### 2. prisma db push 실행

PostgreSQL 시작 후:

```bash
pnpm --filter @x2/db exec prisma db push
pnpm --filter @x2/db exec prisma generate
```

61개 모델의 테이블이 생성된다.
prisma studio로 결과를 확인한다.

### 3. YouTube API 키 발급 + .env.local 추가

Google Cloud Console에서 발급 후:

```bash
# .env.local에 추가
YOUTUBE_API_KEY="AIza..."
```

키 없이도 앱은 동작하지만 YouTube provider가 NOT_CONNECTED로 표시된다.

### 4. pnpm dev + 수동 E2E 체크리스트

```bash
pnpm dev
# http://localhost:4020 접속
```

PRE_MASTER_E2E_CHECKLIST.md의 A~G 섹션을 순서대로 수행한다.

### 5. Master QA/QC 진행

모든 체크리스트 항목이 통과하면 Master 병합을 위한 QA/QC를 진행한다.

---

## 향후 TODO

### prisma migrate dev 전환

현재 `db push`를 사용하고 있으나, 프로덕션 배포 전에는
migration 히스토리 관리로 전환해야 한다.

```bash
# 최초 migration 생성
pnpm --filter @x2/db exec prisma migrate dev --name init

# 이후 스키마 변경 시
pnpm --filter @x2/db exec prisma migrate dev --name add_new_field
```

migration 파일은 `packages/db/prisma/migrations/` 디렉토리에 생성되며
Git으로 관리한다.

### CI/CD에서 migration 자동 실행

배포 파이프라인에 migration 단계를 추가한다.

```yaml
# 예시: GitHub Actions
- name: Run migrations
  run: pnpm --filter @x2/db exec prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

`migrate deploy`는 프로덕션용 명령으로, 대화형 프롬프트 없이 실행된다.

### .env 관리 체계 정리

현재 `.env`, `.env.local`, `packages/db/.env` 등
여러 위치에 환경변수가 분산되어 있다.

개선 방안:
- **dotenv-vault**: 암호화된 .env 파일을 Git에 커밋 가능
- **Vercel 환경변수**: Vercel 배포 시 대시보드에서 관리
- **1Password CLI**: 시크릿 관리 도구 연동

단기적으로는 `.env.example` 파일을 잘 관리하여
필요한 변수 목록을 문서화하는 것이 중요하다.

### 추가 Provider 구현

현재 YouTube만 구현되어 있다.
향후 추가할 provider:

| Provider | 우선순위 | API 유형 | 비고 |
|----------|----------|----------|------|
| Instagram | 높음 | Graph API | Meta 앱 승인 필요 |
| TikTok | 높음 | Research API | 별도 신청 필요 |
| X (Twitter) | 중간 | API v2 | 유료 플랜 필요 |
| Naver Blog | 낮음 | Search API | 네이버 개발자 등록 |

각 provider는 `packages/social/` 패키지에 커넥터로 구현한다.

---

## 세션 요약

| 항목 | 상태 |
|------|------|
| 코드 구현 | 완료 |
| 빌드 | 통과 |
| PostgreSQL | 미실행 (환경 블로커) |
| DB 스키마 반영 | 미완료 (PostgreSQL 의존) |
| YouTube API | 미설정 (선택적 블로커) |
| E2E 검증 | 미수행 (PostgreSQL 의존) |

코드는 준비 완료 상태이며, 환경 인프라 설정만 남아 있다.
PostgreSQL을 시작하고 prisma db push를 실행하면
즉시 E2E 체크리스트를 수행할 수 있다.
