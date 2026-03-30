# Listening Hub Screen Spec

> `/listening-hub` 페이지의 화면 설계 사양

## 1. 페이지 구조

```
┌─────────────────────────────────────────────────┐
│ PageHeader: "리스닝 허브"                         │
│ 검색 인텔리전스 기반 통합 분석                      │
├─────────────────────────────────────────────────┤
│ [시드 키워드 입력]              [분석 시작 버튼]    │
├─────────────────────────────────────────────────┤
│ SearchIntelligenceStatusBar (분석 후 표시)        │
├─────────────────────────────────────────────────┤
│ ┌ Sticky Section Nav ──────────────────────────┐│
│ │ 개요 │ 클러스터 │ 검색경로 │ 여정 │ 페르소나 ││
│ │ │ 인사이트 │ 액션 │ 근거자료                  ││
│ └──────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│                                                 │
│  [section-overview]  IntentSummarySection        │
│  [section-cluster]   ClusterSection             │
│  [section-pathfinder] PathfinderSection          │
│  [section-roadview]  RoadViewSection            │
│  [section-persona]   PersonaSection             │
│  [section-insight]   SearchInsightSection        │
│  [section-action]    SearchActionSection         │
│  [section-evidence]  SearchEvidenceSection       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 2. 컴포넌트 목록

| 파일 | 섹션 ID | 역할 |
|------|---------|------|
| `ListeningHubLayout.tsx` | — | 레이아웃 + sticky nav + IntersectionObserver |
| `IntentSummarySection.tsx` | section-overview | 의도 분포 개요 |
| `ClusterSection.tsx` | section-cluster | 클러스터 카드 그리드 + 신뢰도 |
| `PathfinderSection.tsx` | section-pathfinder | 네트워크 요약 + 경로 미리보기 |
| `RoadViewSection.tsx` | section-roadview | 수평 단계 플로우 + 약한 단계 표시 |
| `PersonaSection.tsx` | section-persona | 페르소나 프로필 카드 |
| `SearchInsightSection.tsx` | section-insight | 인사이트 목록 |
| `SearchActionSection.tsx` | section-action | 추천 액션 + 우선순위 |
| `SearchEvidenceSection.tsx` | section-evidence | 근거 자료 그리드 |

## 3. 정보 흐름 (섹션 간 연결)

```
의도 분석 (왜 검색하는가?)
  │
  ▼
클러스터 (무엇을 검색하는가?)
  │
  ├─→ 페르소나 (누가 검색하는가?)
  │     │
  │     └─→ 사용자 여정 (어떤 경로로 이동하는가?)
  │
  └─→ 검색 경로 (어떻게 흘러가는가?)
        │
        ▼
인사이트 (무엇을 발견했는가?)
  │
  ▼
액션 (무엇을 해야 하는가?)
  │
  ▼
근거 자료 (왜 이것을 해야 하는가?)
```

## 4. Sticky Section Navigation

- 8개 탭: 개요 / 클러스터 / 검색 경로 / 사용자 여정 / 페르소나 / 인사이트 / 액션 / 근거자료
- `position: sticky; top: 0; z-index: 20`
- `IntersectionObserver`로 현재 보이는 섹션 추적 → 활성 탭 하이라이트
- 탭 클릭 시 `scrollIntoView({ behavior: "smooth" })`
- 분석 전(hasResult=false)에는 nav 숨김

## 5. 섹션별 상세

### 5.1 IntentSummarySection
- 시드 키워드 표시
- 의도 분포 (정보탐색/구매의도/비교분석/문제해결/브랜드)
- 전체 키워드 수, 평균 검색량

### 5.2 ClusterSection
- 클러스터 카드 그리드 (sm:2열, lg:3열)
- 각 카드: 라벨, 멤버 수 배지, 상위 키워드 태그
- 신뢰도 바 (하단)
- 경고: 신뢰도 < 30% → 주황 경고 배너
- 경고: freshness === "stale" → 갱신 필요 배너
- CTA: "페르소나에서 이 클러스터의 검색자 유형 확인하기"

### 5.3 PathfinderSection
- 네트워크 메트릭: 노드 수, 경로 수, 허브 키워드
- 주요 경로 미리보기 (step → step)
- CTA: "추천 액션에서 이 경로 기반 콘텐츠 전략 보기"

### 5.4 RoadViewSection
- 수평 단계 플로우 (인지 → 관심 → 고려 → 결정 → 행동)
- 각 단계: 키워드 수, 강도 배지
- 약한 단계 하이라이트 (빨강 테두리)
- CTA: "근거 자료에서 단계별 데이터 확인하기"

### 5.5 PersonaSection
- 페르소나 프로필 카드
- 각 카드: 이름, 아키타입 배지, 설명, 비율
- CTA: "사용자 여정에서 이 페르소나의 경로 보기"

### 5.6 SearchInsightSection
- 인사이트 목록 (카드 형태)
- 각 인사이트: 제목, 설명, severity 배지, source 태그
- severity 색상: critical(빨강), high(주황), medium(파랑), low(회색)

### 5.7 SearchActionSection
- 추천 액션 목록
- 각 액션: 제목, 설명, 우선순위 배지, 카테고리 배지, 연결 엔진
- 우선순위: high(빨강), medium(주황), low(회색)
- CTA: "이 액션을 포함한 리포트 생성하기"

### 5.8 SearchEvidenceSection
- 근거 자료 그리드 (sm:2열, lg:3열)
- 각 항목: 라벨, 타입 아이콘, 요약, 소스, 신뢰도
- 타입 아이콘: KPI_CARD(차트), PIE_CHART(파이), BAR_CHART(바), TABLE(테이블), QUOTE_LIST(인용)
- CTA: "이 근거로 리포트 생성하기" + "근거 번들 관리"

## 6. 상태 처리

### 분석 전
- 섹션 nav 숨김
- 각 섹션: 빈 상태 (아이콘 + 설명)
- 키워드 입력 폼만 활성

### 분석 중
- 버튼: `Loader2` 스피너 + "분석 중..."
- 입력 비활성화

### 분석 완료 (성공)
- StatusBar 표시
- 섹션 nav 표시
- 각 섹션 데이터 렌더링
- 엔진별 실패는 해당 섹션에 에러 배너

### 분석 실패
- 빨간 에러 배너 + "네트워크 연결을 확인하고 다시 시도해 주세요"
