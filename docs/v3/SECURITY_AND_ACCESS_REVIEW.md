# Security & Access Review (Phase 10)

## 인증 (Authentication)

### OAuth Providers

- **Google**: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — 정상 구성
- **Kakao**: `AUTH_KAKAO_ID` / `AUTH_KAKAO_SECRET` — 정상 구성
- **Naver**: `AUTH_NAVER_ID` / `AUTH_NAVER_SECRET` — 정상 구성

### Dev Login ✅ 수정됨

- `AUTH_DEV_LOGIN` 환경변수가 `true`이면 이메일만으로 로그인 가능
- **Phase 10 수정**: `NODE_ENV !== "production"` 가드 추가
- `config.ts`와 `edge.ts` 양쪽 모두 적용

### Session / Token

- NextAuth.js 기반 세션 관리
- JWT 전략 사용 (`AUTH_SECRET` 필수)
- 세션 만료 정책: NextAuth 기본값 (30일)

---

## 인가 (Authorization)

### Role-Based Access Control

- **Workspace 역할**: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- `WorkspaceAccessService`에서 역할별 기능 제어
- Feature flags: `canExportData`, `geoAeoEnabled`, `competitorTrackingEnabled` 등

### Plan-Based Access Control

- **FREE**: 자동화 없음, 기본 기능만
- **PRO**: 5 규칙, 주간 리포트, 기본 알림
- **BUSINESS**: 50 규칙, 모든 기능, 웹훅
- `AutomationAccessControlService`에서 규칙 생성/실행 양쪽 검증

### Workspace Isolation

- 모든 데이터 쿼리에 `workspaceId` 필터 적용
- tRPC context에서 세션 기반 workspace 주입

---

## API 보안

### Rate Limiting ⚠️ 미구현

- 인바운드 API에 rate limiting 없음
- 아웃바운드 소셜 API 호출에만 rate limiter 존재 (`packages/social/src/rate-limiter.ts`)
- **권장**: `@upstash/ratelimit` + Redis 기반 미들웨어 도입

### CRON 엔드포인트 ✅ 수정됨

- `/api/sync/cron`: `CRON_SECRET` Bearer 토큰 검증 필수화
- 프로덕션에서 미설정 시 500 에러 반환

### CORS

- Next.js 기본 CORS 정책 적용 (same-origin)

---

## 비밀키 관리

### 환경변수 구성 (.env.example)

```
AUTH_SECRET          — NextAuth 시크릿
DATABASE_URL         — PostgreSQL 연결 (기본 postgres:postgres ⚠️)
AUTH_GOOGLE_ID/SECRET
AUTH_KAKAO_ID/SECRET
AUTH_NAVER_ID/SECRET
YOUTUBE_API_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
REDIS_URL
CRON_SECRET
```

### 하드코딩된 시크릿 ✅ 없음

- 코드베이스 전체에서 하드코딩된 실제 시크릿 미발견
- `.env.example`의 값은 모두 플레이스홀더

### 민감 정보 로그 노출

- ServiceResult 에러 메시지가 로그에 포함되나 스택트레이스는 제외
- 소셜 API 키가 로그에 노출되지 않음 확인

---

## 권장 사항

1. **API Rate Limiting**: tRPC 미들웨어에 Redis 기반 rate limiter 추가
2. **DATABASE_URL**: `.env.example`에서 기본 비밀번호 제거, 프로덕션 연결 문자열 문서화
3. **Session 만료**: 보안 민감 작업 시 세션 갱신 로직 검토
4. **Audit Logging**: 관리자 작업 (규칙 생성/삭제, 멤버 관리) 감사 로그 추가
5. **CSP Headers**: Content Security Policy 헤더 설정 검토
