# ListeningMind Feature Mapping Audit

## 리스닝마인드 기능 축 vs X2 매핑표

| 리스닝마인드 기능 | X2 대응 기능/화면/서비스 | 상태 | 구현 근거 | 부족한 점 |
|-----------------|------------------------|------|----------|----------|
| **Intent Finder — 키워드 심층 탐색** | `/intent` 페이지 + IntentClassifier (40+ 패턴) | A | intent/page.tsx:742줄, /api/intent/analyze | — |
| **Intent Finder — 다중 키워드 입력** | seed 1개 → 15개 자동 확장 | B | expandAndClassify() | 사용자가 직접 여러 키워드 동시 입력하는 UI 없음 |
| **Intent Finder — 관련 검색 표현** | relatedKeywords + autocomplete 어댑터 | A | naver-search, google-autocomplete, serp | — |
| **Intent Finder — 토픽/관심사** | 토픽 추출 + sentimentTerms + 갭 매트릭스 | A | intelligence router endpoints | — |
| **Pathfinder — 검색 흐름** | Canvas 그래프 (before/seed/after) | A | pathfinder/page.tsx:922줄 | — |
| **Pathfinder — 구매 여정** | 6단계 여정 모델 | A | journey-engine/builders/stage-inference.ts | — |
| **Pathfinder — 전환 흐름 시각화** | WebGL 스타일 Canvas + Bezier edges | A | pathfinder/page.tsx Canvas 렌더러 | — |
| **Pathfinder — 카테고리 진입** | 키워드 기반 추론만 | B | stage-inference 패턴 매칭 | 카테고리 분류 체계 없음 |
| **Persona — 행동 세그먼트** | Jaccard 클러스터링 → 페르소나 | A | persona-cluster-engine/ | — |
| **Persona — 그룹화** | 8 아키타입 × 7 마인드셋 | A | persona-archetype-builder.ts | — |
| **Persona — 관심사/니즈 차이** | 6축 레이더 + 질문 + 전략 | A | persona/page.tsx:454줄 | — |
| **Road View — A↔B 여정** | endKeyword 파라미터 A→B 경로 | A | /api/roadview/analyze | — |
| **Road View — 전이/연결** | 분기점 + 대안 경로 7+ | A | stage-inference + path finding | — |
| **Road View — 관계 시각화** | 6단계 flow + 3탭 (여정/경로/갭) | A | road-view/page.tsx:558줄 | — |
| **Cluster — 대량 키워드 추출** | seed → 확장 + 클러스터 분리 | A | ClusterEngine (Jaccard) | — |
| **Cluster — 토픽 구조 시각화** | 바차트 + 확장 리스트 + GPT 패널 | B | cluster-finder/page.tsx | 네트워크/방사형 그래프 없음 |
| **검색량 — 월간/연간** | Google Ads 어댑터 | B | google-ads-adapter.ts | API 키 미설정 시 mock |
| **검색량 — 트렌드 변화** | hourlyTrend + issueTimeline | A | intelligence router | Worker 실행 전제 |
| **검색량 — 기간 비교** | 3모드 비교 UI | A | intelligence/compare/page.tsx | — |
| **검색량 — 상승/하락** | spike detection (mean+2σ) | A | intelligence router | — |
| **인구통계 — 성별/연령** | 없음 | C | — | 데이터 소스 자체 없음 |
| **인구통계 — 사용자 유형** | 페르소나 아키타입 (간접) | B | persona-archetype-builder | 인구통계 아닌 행동 기반 |
| **시각화 — 차트** | Recharts (6+ 유형) | A | 모든 분석 페이지 | — |
| **시각화 — 네트워크 그래프** | Pathfinder Canvas | B | pathfinder/page.tsx | 범용 네트워크 그래프 없음 |
| **시각화 — 워드클라우드** | RelatedKeywordMap (감성 크기맵) | B | RelatedKeywordMap.tsx | 전통 워드클라우드 아님 |
| **시각화 — LLM 인사이트** | 규칙 기반만 | B | insight-generation.service | LLM 미연동 ("Upgrade path" 주석) |
| **경쟁 — 브랜드 비교** | KPI 비교 + 차트 + 포맷 분석 | A | competitors/page.tsx | — |
| **경쟁 — 카테고리 분석** | 없음 | C | — | 카테고리 엔트리 포인트 분석 없음 |
| **UX — Intelligence 허브** | 15+ 패널 통합 허브 | A | intelligence/page.tsx | — |
| **UX — 저장/최근 키워드** | IntelligenceKeyword + 히스토리 패널 | A | KeywordHistoryPanel.tsx | — |
| **UX — 리포트/다운로드** | 5포맷 + 차트 이미지 | A | export/ + ChartExportButton | — |
| **UX — 알림/모니터링** | 센터 + 설정 + snooze + 이메일/웹훅 | A | notifications/ + settings/ | — |
