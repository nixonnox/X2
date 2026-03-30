# Listening Hub Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 홈 대시보드 카드 (신규 생성: 7개 파일)

```
apps/web/src/components/dashboard/
├── TrendingIntentCard.tsx           # 급상승 검색 의도 top 3
├── TopJourneyPreviewCard.tsx        # 검색 여정 경로 미리보기
├── PersonaSummaryCard.tsx           # 페르소나 아키타입 top 3
├── ClusterSummaryCard.tsx           # 주요 클러스터 요약
├── ListeningActionCard.tsx          # 추천 액션 top 3
├── ListeningSummaryCard.tsx         # 전체 리스닝 요약
└── SearchIntelligenceStatusBar.tsx  # 데이터 품질/상태 바
```

### 1.2 리스닝 허브 섹션 (신규 생성: 9개 파일)

```
apps/web/src/components/listening-hub/
├── ListeningHubLayout.tsx           # 레이아웃 + sticky nav
├── IntentSummarySection.tsx         # 의도 분포 개요
├── ClusterSection.tsx               # 클러스터 상세
├── PathfinderSection.tsx            # 검색 경로 네트워크
├── RoadViewSection.tsx              # 사용자 여정 단계
├── PersonaSection.tsx               # 페르소나 프로필
├── SearchInsightSection.tsx         # 인사이트 목록
├── SearchActionSection.tsx          # 추천 액션
└── SearchEvidenceSection.tsx        # 근거 자료
```

### 1.3 리스닝 허브 페이지 (신규 생성: 1개 파일)

```
apps/web/src/app/(dashboard)/listening-hub/page.tsx
```

### 1.4 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `apps/web/src/app/(dashboard)/dashboard/dashboard-view.tsx` | 리스닝 카드 7종 import + 레이아웃 재구성 |
| `apps/web/src/lib/constants.ts` | Listening Mind 섹션에 `/listening-hub` 항목 추가 |

## 2. 설계 결정

### 2.1 대시보드 재구성 전략

- 기존 "오늘의 핵심 발견" (InsightCard 3종) → "소셜 & 댓글 분석"으로 이동
- 새로운 "오늘의 핵심 발견" = 리스닝 인텔리전스 카드 (TrendingIntent + Cluster + Persona)
- 이유: 리스닝 마인드가 **중심** 기능이 되어야 하므로, 대시보드 상단에 배치

### 2.2 리스닝 허브 = 단일 페이지 + 섹션 스크롤

- SPA 방식의 단일 페이지에 8개 섹션
- Sticky navigation + IntersectionObserver로 현재 섹션 추적
- 이유: 분석 흐름이 의도 → 클러스터 → 경로 → 여정 → 페르소나 → 인사이트 → 액션 → 근거로 이어지므로, 스크롤 기반의 연속 경험이 적합

### 2.3 Cross-Section CTA

- 각 섹션 하단에 다음 섹션으로 유도하는 CTA 버튼
- `scrollIntoView`로 같은 페이지 내 이동
- 이유: 사용자가 "왜 → 무엇 → 어떻게" 흐름을 자연스럽게 따라가도록

### 2.4 API 호출 방식

- 리스닝 허브: `POST /api/search-intelligence/analyze` → 전체 분석 결과 한번에 수신
- 대시보드: 향후 `useSearchIntelligenceLatest` 훅으로 캐싱된 최근 결과 사용
- 이유: 리스닝 허브는 on-demand 분석, 대시보드는 최근 결과의 요약 표시

### 2.5 네비게이션

- Listening Mind 섹션 최상단에 "리스닝 허브" 추가 (icon: Radio)
- 개별 엔진 페이지(intent, pathfinder 등)는 그대로 유지
- 이유: 리스닝 허브가 통합 진입점, 개별 페이지는 심층 분석용

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| DashboardView props | 유지됨 — 기존 props 그대로 동작 |
| 기존 InsightCard 3종 | 유지됨 — "소셜 & 댓글 분석" 섹션으로 이동 |
| RecommendedActions | ListeningActionCard로 교체 |
| KPI Cards | 유지됨 — 위치만 아래로 이동 |
| Chart + GEO/AEO | 유지됨 — 위치 변경 없음 |
| 네비게이션 | 유지됨 — 항목 1개 추가 |

## 4. 남은 과제

### 4.1 단기 (다음 스프린트)

- [ ] **useSearchIntelligenceLatest 훅**: 대시보드용 최근 분석 결과 캐싱 훅
- [ ] **tRPC searchIntelligence.latest 라우터**: 최근 분석 결과 API
- [ ] **대시보드 카드 데이터 연결**: 현재 카드들은 props 구조만 있고 실제 데이터 연결 미완
- [ ] **Role-based 분기**: RoleContext prop을 통한 역할별 강조/숨김
- [ ] **로딩 스켈레톤**: 대시보드 카드용 스켈레톤 컴포넌트

### 4.2 중기

- [ ] **실시간 업데이트**: WebSocket 또는 polling으로 분석 진행 상태 실시간 반영
- [ ] **분석 히스토리**: 과거 분석 결과 조회 및 비교
- [ ] **섹션별 심층 분석**: 리스닝 허브 섹션에서 개별 엔진 페이지로 seamless 전환
- [ ] **리포트 자동 생성**: 리스닝 허브 결과에서 원클릭 리포트 생성

### 4.3 장기

- [ ] **대시보드 커스터마이징**: 사용자별 카드 배치/표시 설정
- [ ] **알림 연동**: 신뢰도 변화, 새 클러스터 발견 시 알림
- [ ] **캠페인 직접 연결**: 액션 → 캠페인 생성 원클릭 플로우
