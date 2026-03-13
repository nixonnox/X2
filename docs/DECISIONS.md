# Architectural Decision Records

## ADR-001: Next.js TypeScript 풀스택 모노레포 선택

**상태**: 확정
**일자**: 2026-03-06

### 맥락

소셜 미디어 분석 SaaS의 MVP를 빠르게 구축해야 한다. 웹 우선 개발 후 앱으로 확장 예정.

### 선택지

- **A) Next.js TypeScript 풀스택 모노레포** — 단일 언어, Vercel 배포, 빠른 개발
- **B) Next.js + FastAPI 분리형** — Python 데이터 생태계, 분리된 백엔드

### 결정

**Option A** 선택.

### 근거

1. MVP 속도가 최우선. 단일 언어(TypeScript)로 프론트/백엔드 간 컨텍스트 스위칭 없음
2. tRPC로 end-to-end 타입 안전성 확보. API 스펙 별도 관리 불필요
3. Vercel 배포로 인프라 관리 최소화
4. MVP 단계의 데이터 처리는 Node.js로 충분 (API 호출 → 저장 → 시각화)
5. 추후 데이터 파이프라인 고도화 시 Python 워커를 마이크로서비스로 추가 가능

### 리스크

- 대량 데이터 처리 시 Node.js 성능 한계 → Phase 3에서 Python 워커 도입으로 대응
- ML/AI 고도화 시 Python 생태계 필요 → Claude API 활용으로 MVP에서는 불필요

---

## ADR-002: Turborepo 모노레포 구조

**상태**: 확정
**일자**: 2026-03-06

### 맥락

웹 앱, 공유 패키지, 워커 등 여러 모듈을 관리해야 한다. 추후 React Native 앱도 추가된다.

### 결정

Turborepo 사용.

### 근거

1. pnpm workspace + Turborepo로 빌드 캐싱 및 병렬 실행
2. packages/ 내 모듈을 앱과 워커에서 공유
3. 추후 `apps/mobile` 추가 시 `packages/` 재사용
4. Nx 대비 설정이 단순하고 Vercel과 통합이 매끄러움

---

## ADR-003: tRPC를 API 레이어로 선택

**상태**: 확정
**일자**: 2026-03-06

### 맥락

프론트엔드와 백엔드 간 API 통신 방식을 결정해야 한다.

### 선택지

- REST API (Next.js Route Handlers)
- GraphQL (Apollo/Pothos)
- tRPC

### 결정

**tRPC** 선택.

### 근거

1. TypeScript 모노레포에서 최대 시너지: 서버 타입이 클라이언트에 자동 전파
2. API 스펙 문서, 코드 생성 불필요 → 개발 속도 극대화
3. React Query 내장으로 캐싱, 낙관적 업데이트 등 즉시 사용
4. 추후 외부 API 공개 필요 시 tRPC → REST adapter로 변환 가능

### 리스크

- 외부(3rd party) API 공개 시 REST 변환 필요 → tRPC-openapi 어댑터로 대응
- React Native 앱에서도 동일하게 tRPC 클라이언트 사용 가능

---

## ADR-004: YouTube 단일 채널로 MVP 시작

**상태**: 확정
**일자**: 2026-03-06

### 맥락

YouTube, Instagram, TikTok, X 4개 플랫폼을 지원해야 하나, 모두 동시에 구현하면 MVP가 지연된다.

### 결정

**YouTube 단일 플랫폼**으로 MVP 출시. 나머지는 Phase 2에서 순차 추가.

### 근거

1. YouTube Data API v3는 무료 할당량이 넉넉하고 문서화가 우수
2. 가장 보편적인 소셜 플랫폼으로 초기 사용자 확보에 유리
3. Provider 패턴(`SocialProvider` 인터페이스)으로 설계하여 플랫폼 추가 시 구현체만 추가
4. 4개 플랫폼 동시 개발 시 MVP 기간이 2배 이상 증가

---

## ADR-005: Supabase를 DB 호스팅으로 선택

**상태**: 확정
**일자**: 2026-03-06

### 맥락

PostgreSQL을 호스팅할 서비스를 결정해야 한다.

### 선택지

- Supabase (Managed PostgreSQL)
- Neon (Serverless PostgreSQL)
- PlanetScale (MySQL)
- Self-hosted (Docker)

### 결정

**Supabase** 선택.

### 근거

1. Free tier가 넉넉 (500MB DB, 1GB 파일 스토리지)
2. PostgreSQL 기반으로 Prisma와 호환 완벽
3. Storage, Realtime 등 부가 기능 활용 가능
4. Dashboard로 DB 직접 조회/관리 편의성

---

## ADR-006: Auth.js v5 + JWT 세션

**상태**: 확정
**일자**: 2026-03-06

### 맥락

인증 방식을 결정해야 한다.

### 결정

Auth.js v5 + JWT 세션 + Prisma Adapter.

### 근거

1. Next.js App Router와 공식 통합
2. Google OAuth 설정이 수 분 내 완료
3. JWT 세션으로 매 요청마다 DB 조회 불필요 (성능)
4. Prisma Adapter로 사용자/계정 정보 자동 DB 동기화
5. 추후 Kakao, Apple 등 Provider 추가 용이

---

## ADR-007: Claude API를 AI 엔진으로 선택

**상태**: 확정
**일자**: 2026-03-06

### 맥락

AI 기반 인사이트 생성에 사용할 LLM을 결정해야 한다.

### 선택지

- OpenAI GPT-4o
- Anthropic Claude (Sonnet/Haiku)
- 자체 모델

### 결정

**Claude API** (Sonnet 4.6 주력, Haiku 4.5 경량 작업).

### 근거

1. 긴 컨텍스트 윈도우(200K)로 대량 댓글/콘텐츠 한 번에 분석 가능
2. 구조화된 분석 출력 품질이 우수
3. Vercel AI SDK와 통합으로 스트리밍 응답 구현 용이
4. 비용 효율: Haiku로 감성 분석 등 경량 작업, Sonnet으로 인사이트 생성

---

## ADR-008: Stripe 우선, 국내 결제는 후순위

**상태**: 확정
**일자**: 2026-03-06

### 결정

MVP는 **Stripe**으로 글로벌 결제만 지원. TossPayments는 국내 정식 런칭 시 추가.

### 근거

1. Stripe Checkout은 구현이 간단하고 webhook 기반 구독 관리가 성숙
2. 해외 사용자도 타겟이므로 글로벌 결제가 필수
3. 국내 카드 결제도 Stripe으로 가능 (다소 제한적이나 MVP에는 충분)

---

## 가정 (Assumptions)

1. **초기 사용자 규모**: MVP 단계에서 월 1,000명 이하의 활성 사용자를 가정
2. **데이터 규모**: 채널당 최근 100개 콘텐츠를 기본 분석 대상으로 설정
3. **API 할당량**: YouTube Data API v3 무료 할당량(일 10,000 units) 내 운영 가능
4. **팀 규모**: 1~2명 개발자 기준으로 기술 스택 복잡도를 최소화
5. **배포 환경**: Vercel Pro 플랜 사용 (팀 협업, 프리뷰 배포)
6. **AI 비용**: 월 $100 이하의 Claude API 비용으로 MVP 운영 가능
