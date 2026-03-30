# Intelligence Runtime Deduped Summary

> Date: 2026-03-16
> **결론: 6개 항목 모두 완료+검증 완료. 추가 구현 불필요.**

## 판정 결과

| # | 항목 | 상태 | 조치 |
|---|------|------|------|
| 1 | 분석 결과 DB 저장 → history 조회 | **완료+검증** | 건너뛰기 |
| 2 | period_vs_period historical persistence | **완료+검증** | 건너뛰기 |
| 3 | 저장된 키워드 / 최근 키워드 DB 연동 | **완료+검증** | 건너뛰기 |
| 4 | Benchmark time-series 추이 차트 | **완료+검증** | 건너뛰기 |
| 5 | A/B 비교 intelligence 차이 하이라이트 | **완료+검증** | 건너뛰기 |
| 6 | /intelligence 진입점/라우트 연결 | **완료+검증** | 건너뛰기 |

## 구현 현황

### Backend (모두 실제 Prisma DB)
- 12개 tRPC endpoints: analyze, history, loadRun, compare, periodData, currentVsPrevious, benchmarkTrend, keywords, recordKeyword, toggleSaveKeyword, liveMentions, providerStatuses
- IntelligencePersistenceService: 10개 메서드
- IntelligenceComparisonService: 5차원 비교
- IntelligenceAlertService: prefs 기반 4조건 평가

### Frontend (모두 실제 tRPC 연결)
- 9개 tRPC query/mutation 연결 (page.tsx)
- 1개 tRPC mutation (compare/page.tsx)
- 12개 시각화 컴포넌트
- 8개 탭 (요약/변화/이력/트렌드/연결 그래프/기준 비교/신호 종합/실시간 반응)

### DB Tables (62개 중 핵심)
- intelligence_analysis_runs (append-only)
- intelligence_comparison_runs (append-only)
- social_mention_snapshots (daily upsert)
- benchmark_snapshots (daily upsert)
- intelligence_keywords (user+project unique)
- notifications (alert 포함)
- delivery_logs (retry 기록)
- user_alert_preferences (project-scoped)

## Mock/Stub 잔존

| 항목 | Mock? | 설명 |
|------|-------|------|
| DB persistence | NO | 실제 Prisma → PostgreSQL |
| History/Compare | NO | 실제 DB 쿼리 |
| Benchmark trend | NO | 실제 snapshot 기반 |
| Sentiment analysis | PARTIAL | LLM 미설정 시 rule-based fallback (의도적) |
| Social providers | PARTIAL | YouTube만 실제 연결 가능 (IG/TikTok 토큰 미발급) |
| Scheduled jobs | NO | BullMQ + Redis 실제 |

## 남은 P2 (polish)

| 항목 | 영향 |
|------|------|
| Settings UI 프로젝트 드롭다운 | UX |
| EmptyState/ErrorState 공통 컴포넌트 | 재사용성 |
| 나머지 시각화 문구 (SummaryCards 등) | 일관성 |
| BullMQ Dashboard | 모니터링 |
