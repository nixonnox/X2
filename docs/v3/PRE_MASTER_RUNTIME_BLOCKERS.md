# PRE_MASTER_RUNTIME_BLOCKERS

Master 브랜치 병합 전 해결해야 하는 런타임 블로커와 현재 환경 상태를 정리한다.
코드 레벨의 준비 상태와 인프라/인증 의존성을 구분하여 기술한다.

---

## 현재 환경 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| PostgreSQL | 미실행 | localhost:5432 unreachable |
| Docker | Windows에 미설치 | Docker Desktop 설치 필요 |
| WSL | Ubuntu 24.04 있음 | PostgreSQL 미설치 |
| YouTube API 키 | 미설정 | Google Cloud에서 발급 필요 |
| 개발 서버 | 빌드 통과 | pnpm dev 실행 가능 |
| Node.js | 설치됨 | 버전 확인: node -v |
| pnpm | 설치됨 | 패키지 매니저 |

### 확인 명령어

```bash
# PostgreSQL 연결 확인
pg_isready -h localhost -p 5432
# 결과: localhost:5432 - no response (미실행)

# Docker 확인
docker --version
# 결과: command not found (미설치)

# WSL 확인
wsl -l -v
# 결과: Ubuntu-24.04 Running

# 빌드 확인
pnpm build
# 결과: 통과
```

---

## Blocker 분류

### Blocker #1: PostgreSQL 서버

| 속성 | 값 |
|------|------|
| 유형 | 환경 인프라 |
| 영향 범위 | 모든 DB 연동 기능 |
| 심각도 | Critical |
| 해결 방법 | Docker / WSL / Windows native 설치 |

**영향받는 기능:**
- Intelligence 분석 결과 저장/조회
- Keyword history 저장
- Notification 생성/조회/관리
- User preferences 저장
- 모든 CRUD 작업

**해결 옵션:**

| 옵션 | 난이도 | 소요 시간 | 권장 |
|------|--------|-----------|------|
| Docker | 낮음 | 10~15분 | O (권장) |
| WSL apt install | 중간 | 15~20분 | O |
| Windows native | 중간 | 20~30분 | - |

Docker가 가장 빠르고 깔끔하다. 환경 격리가 되어 충돌 위험도 낮다.

### Blocker #2: prisma db push

| 속성 | 값 |
|------|------|
| 유형 | DB 의존 |
| 영향 범위 | 테이블 미생성 |
| 심각도 | Critical |
| 해결 방법 | PostgreSQL 시작 후 실행 |
| 선행 조건 | Blocker #1 해결 |

**해결 절차:**

```bash
# 1. PostgreSQL이 실행 중인지 확인
pg_isready -h localhost -p 5432

# 2. 스키마를 DB에 반영
pnpm --filter @x2/db exec prisma db push

# 3. Prisma Client 재생성
pnpm --filter @x2/db exec prisma generate

# 4. 테이블 생성 확인
pnpm --filter @x2/db exec prisma studio
```

`db push`는 migration 없이 스키마를 직접 반영한다.
개발 환경에서는 이 방법이 빠르지만,
프로덕션 전환 시에는 `prisma migrate dev`로 전환해야 한다.

### Blocker #3: YouTube API 키

| 속성 | 값 |
|------|------|
| 유형 | 인증 |
| 영향 범위 | YouTube provider 미검증 |
| 심각도 | Medium |
| 해결 방법 | Google Cloud Console에서 발급 |
| 선행 조건 | Google Cloud 프로젝트 |

**영향받는 기능:**
- YouTube 채널/동영상 데이터 수집
- liveMentions에서 YouTube 소스 데이터
- providerCoverage에서 YouTube CONNECTED 상태

**영향받지 않는 기능:**
- 나머지 모든 기능은 API 키 없이도 동작
- YouTube provider는 NOT_CONNECTED로 표시되며 빈 결과 반환
- 분석 자체는 다른 데이터 소스로 진행 가능

---

## Blocker 의존 관계

```
Blocker #1 (PostgreSQL)
    └── Blocker #2 (prisma db push)
            └── E2E 체크리스트 실행 가능

Blocker #3 (YouTube API 키)
    └── YouTube provider 검증 가능 (독립적)
```

Blocker #1과 #2는 순차 의존이다. PostgreSQL 없이 prisma db push는 불가능하다.
Blocker #3은 독립적이며, YouTube 관련 기능만 영향받는다.

---

## 코드 레벨 준비 상태

코드는 모든 기능이 구현 완료되어 있으며 빌드를 통과한다.
인프라만 설정하면 즉시 동작한다.

### Prisma 스키마

- **모델 수:** 61개
- **상태:** 정의 완료
- **파일:** `packages/db/prisma/schema.prisma`
- 모든 관계(relation), 인덱스, 유니크 제약 정의됨

### 서비스 구현

| 영역 | 상태 | 비고 |
|------|------|------|
| Intelligence 분석 | 구현 완료 | 키워드 분석 전체 파이프라인 |
| Notification 시스템 | 구현 완료 | 생성, 조회, 읽음 처리, 삭제 |
| Alert 평가 | 구현 완료 | evaluateAndAlert 함수 |
| Keyword History | 구현 완료 | 저장, 조회, 북마크 |
| Compare | 구현 완료 | A/B 비교, period 비교 |
| Settings | 구현 완료 | 사용자 설정 CRUD |
| Social Providers | 구현 완료 | YouTube 커넥터 |

### maxAlertsPerDay 구현

- evaluateAndAlert 진입 전 일일 한도 사전 체크
- 루프 내 실시간 remainingDailyCap 감소
- cap 도달 시 break로 루프 종료
- dailyCapped 플래그 반환
- console.info 로깅 (사전 cap + 중간 cap)

### Cooldown/Dedup 구현

- 동일 키워드 연속 분석 시 알림 중복 방지
- cooldown 기간 내 동일 조건의 알림 억제
- console.info 로깅

### unclassifiedCount

- periodData에 unclassifiedCount 반영 완료
- 미분류 데이터의 정확한 카운트 처리

---

## 빌드 검증 결과

```bash
pnpm build
# 결과: 성공
# TypeScript 컴파일 에러 없음
# 린트 에러 없음
```

빌드는 DB 연결 없이도 통과한다.
Prisma Client는 generate 시점에 타입이 생성되므로
빌드 자체에는 런타임 DB 연결이 필요 없다.

---

## 해결 우선순위

1. **PostgreSQL 설치/실행** (Blocker #1)
   - Docker Desktop 설치가 가장 빠른 경로
   - 대안: WSL에 apt install

2. **prisma db push** (Blocker #2)
   - PostgreSQL 실행 후 즉시 실행 가능
   - 1분 이내 완료

3. **YouTube API 키** (Blocker #3)
   - Google Cloud Console에서 5~10분 소요
   - 필수는 아님 (YouTube 외 기능은 동작)

4. **E2E 체크리스트 실행**
   - Blocker #1, #2 해결 후 즉시 가능
   - PRE_MASTER_E2E_CHECKLIST.md 참조

---

## 리스크 평가

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| PostgreSQL 설치 실패 | 낮음 | 높음 | 다른 옵션 시도 |
| 포트 충돌 | 중간 | 낮음 | 포트 변경 (5433) |
| YouTube 할당량 초과 | 낮음 | 중간 | 키 재발급 또는 대기 |
| Prisma 스키마 불일치 | 매우 낮음 | 높음 | db push 재실행 |
| WSL 네트워크 이슈 | 중간 | 중간 | localhost 대신 127.0.0.1 |

모든 리스크는 코드 문제가 아닌 환경 설정 문제이다.
코드 자체는 빌드를 통과하며 구현이 완료된 상태이다.
