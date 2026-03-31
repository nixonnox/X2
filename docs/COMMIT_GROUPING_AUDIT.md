# Commit Grouping Audit

## 변경 파일 영역 분류 및 커밋 매핑

### 그룹 1: Config & Dependencies → 커밋 `3ea75ce`
- `package.json` — 루트 의존성
- `pnpm-lock.yaml` — lockfile
- `turbo.json` — Turborepo 파이프라인
- `.env.example` — 환경변수 템플릿
- `packages/config/eslint/base.js` — ESLint 공유 설정

### 그룹 2: Pre-commit Hook Fix → 커밋 `7cc49b2`
- `.husky/pre-commit` — lint-staged `--no-stash` 플래그 추가

### 그룹 3: Database / Prisma → 커밋 `f7c2dec`
- `packages/db/prisma/schema.prisma` — 스키마 수정
- `packages/db/prisma/migrations/20260315132456_init/migration.sql` — 초기 마이그레이션
- `packages/db/prisma/migrations/migration_lock.toml` — 마이그레이션 잠금
- `packages/db/prisma/manual_backup/add_listening_mind_models.sql` — 수동 SQL 백업 (이동)

### 그룹 4: Queue / AI / Social 패키지 → 커밋 `819f210`
- `packages/queue/package.json`, `src/index.ts`, `src/connection.ts`, `src/queues.ts`
- `packages/ai/package.json`, `src/index.ts`, `src/client.ts`, `src/services/sentiment.ts`
- `packages/social/src/instagram.ts`

### 그룹 5: Backend API Services & Routers → 커밋 `2654477` (112파일)
- `packages/api/package.json`, `src/root.ts`, `src/services/index.ts`
- **Routers**: intelligence, listening, notification, vertical-document
- **Services**:
  - actions/ — action-recommendation-orchestrator, action-recommendation.service
  - automation/ — alert-trigger, delivery-retry, report-automation, schedule-registry
  - channels/ — channel-analysis.service
  - collection/ — analytics-input-builder, platform-adapter
  - comments/ — risk-signal.service
  - documents/ — evidence-to-document-mapper, geo-aeo-block-builder, role-based-assembler, search-document-generation 등
  - export/ — export-orchestrator, pdf/ppt/word-builders, vertical-export-policy
  - geo/ — citation.service, geo-aeo.service
  - influencer/ — campaign, campaign-performance, influencer-execution
  - insights/ — executive-summary, insight-generation
  - intelligence/ — instagram-graph, naver-search, tiktok-research, x-api, youtube-data adapters, alert/backfill/comparison/persistence/retention services
  - intent/ — intent-analysis.service
  - listening/ — listening-analysis, trend.service
  - notification/ — notification.service, channel-dispatch.service
  - ops/ — collection-orchestration, ops-monitoring
  - pt/ — pt-deck-generation, pt-slide-block-builder, narrative-assembler 등
  - reports/ — evidence, report-composition, report-section-builder, report.service
  - search-intelligence/ — search-evidence-bundle, search-executive-summary, search-insight-integration 등
  - vertical-templates/ — beauty/entertainment/finance/fnb templates, benchmark-baseline, topic-taxonomy, vertical-preview 등
  - workdocs/ — work-report-generation, workdoc-section-builder 등
  - workspace/ — usage.service, workspace-access.service

### 그룹 6: Frontend Core → 커밋 `eefb694` (14파일)
- `apps/web/package.json`
- `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx`
- `apps/web/src/app/(dashboard)/channels/new/page.tsx`
- `apps/web/src/components/layout/top-bar.tsx`
- `apps/web/src/components/dashboard/` — 7개 카드 컴포넌트 (신규)
- `apps/web/src/lib/constants.ts`
- `apps/web/src/messages/en.json`, `ko.json`

### 그룹 7: Frontend Pages & Features → 커밋 `5f142d0` (111파일)
- **Pages**: intelligence, listening-hub, notifications, settings/notifications, vertical-preview, pathfinder, persona, road-view, cluster-finder
- **API Routes**: cluster/analyze, pathfinder/analyze, persona/analyze, roadview/analyze, search-intelligence/analyze, v1/intelligence
- **Components**: intelligence/ (16개), listening-hub/ (9개)
- **Features**: journey/, persona-cluster/, vertical-preview/
- **Engines**: journey-engine/, persona-cluster-engine/
- **Services**: search-intelligence/, search-data/

### 그룹 8: Worker → 커밋 `f55893e` (3파일)
- `workers/analyzer/package.json`
- `workers/analyzer/src/index.ts`
- `workers/analyzer/src/scheduler.ts` (신규)

### 그룹 9: Documentation → 커밋 `7d2290c` (397파일)
- `docs/v3/` — 250+ 설계/검증/구현 문서
- `docs/shared/` — 공유 문서

## 제외된 파일
- `node_modules/` — .gitignore
- `.next/` — .gitignore
- `dist/` — .gitignore
- `.env` (실제 환경변수) — .gitignore
- 기타 캐시/빌드 산출물 — .gitignore
