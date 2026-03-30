# PT Slide Block Spec

> 16종 슬라이드 유형별 구조, headline/keyMessage/evidence/visual hint 상세

## 1. 공통 슬라이드 구조

```typescript
{
  id: string;
  slideType: PtSlideType;
  headline: string;             // 짧고 명확한 헤드라인
  subHeadline?: string;         // 보조 설명 (1줄)
  keyMessage: string;           // 핵심 메시지 — "그래서 무엇이 중요한가" (필수!)
  supportingPoints: string[];   // 핵심 포인트 (3~5개)
  evidenceRefs: EvidenceRef[];  // 근거 연결
  sourceRefs: SourceRef[];      // 출처 연결
  recommendedVisualType: RecommendedVisualType;
  speakerNote?: string;         // 발표자 노트 (quality 경고 포함)
  quality: PtQualityMeta;
  order: number;
}
```

## 2. 슬라이드 유형별 상세

### 2.1 TITLE

| 항목 | 내용 |
|------|------|
| 목적 | PT 표지 |
| headline | "{키워드} 시장 검색 인텔리전스 분석" |
| keyMessage | 분석의 목적과 기대 가치 |
| evidence | 없음 |
| visual | none |

### 2.2 EXECUTIVE_SUMMARY

| 항목 | 내용 |
|------|------|
| 목적 | 광고주/경영진용 한 장 요약 |
| headline | "핵심 요약" |
| keyMessage | 핵심 기회/문제를 1~2줄로 — 예: "고객 여정 중 3개 단계에서 콘텐츠 공백이 발견되었습니다" |
| supporting | 클러스터 수, 페르소나 수, 콘텐츠 공백, 전략 기회 |
| evidence | search_intelligence_quality |
| visual | executive_summary_card |

### 2.3 PROBLEM_DEFINITION

| 항목 | 내용 |
|------|------|
| 목적 | 현재 시장의 과제 정의 |
| headline | "현재 시장의 과제" |
| keyMessage | 예: "비교·검토 단계에서 경쟁 브랜드로 이탈하고 있습니다" |
| supporting | 검색 분산, 콘텐츠 부재, 경로 노출 부족, 대응 필요성 |
| evidence | search_intelligence_quality, search_roadview_stages |
| visual | trend_bar |

### 2.4 OPPORTUNITY

| 항목 | 내용 |
|------|------|
| 목적 | 검색 흐름에서 발견된 선점 가능 영역 |
| headline | "기회 영역" |
| keyMessage | 예: "경쟁사가 비어 있는 3개 단계를 먼저 채우면 검색 유입의 주도권을 가져올 수 있습니다" |
| supporting | weakStages 콘텐츠 선점, 허브 키워드 전략, 경쟁 선점 |
| evidence | search_roadview_stages, search_pathfinder_graph |
| visual | funnel_chart |
| 생성 조건 | evidence 있어야 함 (없으면 null) |

### 2.5 PATHFINDER

| 항목 | 내용 |
|------|------|
| 목적 | 고객의 검색 탐색 경로 분석 |
| headline | "고객은 이렇게 검색합니다" |
| keyMessage | 예: "고객 검색 여정에서 '프로틴 추천'이 가장 중요한 허브 키워드입니다" |
| supporting | 핵심 허브 키워드, 대표 경로, 콘텐츠 시리즈 근거 |
| evidence | search_pathfinder_graph |
| visual | path_graph |
| 생성 조건 | pathfinder evidence 있어야 함 |

### 2.6 ROADVIEW

| 항목 | 내용 |
|------|------|
| 목적 | 고객 여정의 단계별 검색 행동 |
| headline | "고객 여정의 단계별 검색 행동" |
| keyMessage | 예: "비교·결정 단계에서 정보를 찾지 못하고 있습니다. 이 단계를 채우면 전환율을 높일 수 있습니다" |
| supporting | 단계별 키워드 수 + 콘텐츠 공백 표시 |
| evidence | search_roadview_stages |
| visual | stage_flow |
| 생성 조건 | roadview evidence + stages 있어야 함 |

### 2.7 PERSONA

| 항목 | 내용 |
|------|------|
| 목적 | 고객 archetype 설명 |
| headline | "이런 고객이 검색하고 있습니다" |
| keyMessage | 예: "가장 큰 비중을 차지하는 '비교형 탐색자' 유형에 맞춘 메시지가 핵심입니다" |
| supporting | 유형별 이름, 비율, 설명 |
| evidence | search_persona_profiles |
| visual | persona_cards |
| 생성 조건 | persona evidence + personas 있어야 함 |

### 2.8 CLUSTER

| 항목 | 내용 |
|------|------|
| 목적 | 고객이 관심 갖는 주제 묶음 |
| headline | "고객이 지금 관심 갖는 주제" |
| keyMessage | 예: "시장은 5개 관심 영역으로 구성되어 있으며, 각 영역별로 다른 전략이 필요합니다" |
| supporting | 클러스터별 이름, 키워드 수, 핵심 키워드 |
| evidence | search_cluster_distribution, search_cluster_detail |
| visual | cluster_board |
| 생성 조건 | cluster evidence + clusters 있어야 함 |

### 2.9 SOCIAL_INSIGHT

| 항목 | 내용 |
|------|------|
| 목적 | 소셜/댓글에서 발견된 인사이트를 검색 데이터와 교차 |
| headline | "소셜과 댓글에서 들리는 목소리" |
| keyMessage | 검색 관심 + 소셜 반응 교차점 또는 리스크 신호 |
| supporting | 감성 요약, 화제 주제, FAQ, 리스크 신호 |
| evidence | 범용 evidence slice |
| visual | quote_highlight |
| 생성 조건 | socialInsight 입력이 있어야 함 |

### 2.10 COMPETITIVE_GAP

| 항목 | 내용 |
|------|------|
| 목적 | 경쟁 환경에서 우리의 위치 |
| headline | "경쟁 환경에서 우리의 위치" |
| keyMessage | 예: "경쟁사가 채우지 못한 3개 단계가 존재합니다. 먼저 채우는 브랜드가 주도합니다" |
| supporting | 경쟁 갭, 기회 영역, 허브 키워드 선점 |
| evidence | search_roadview_stages, search_pathfinder_graph |
| visual | comparison_table |
| 생성 조건 | 갭 데이터 또는 weakStages 있어야 함 |

### 2.11 GEO_AEO

| 항목 | 내용 |
|------|------|
| 목적 | AI 검색엔진 인용 최적화 전략 |
| headline | "AI 검색에서 선택받는 브랜드 되기" |
| keyMessage | FAQ 구조화 + schema 적용 + answerability 확보 |
| supporting | FAQ 구조화, 가이드 콘텐츠, citation-ready 상태, schema 마크업 |
| evidence | 범용 evidence slice |
| visual | comparison_table |

### 2.12 STRATEGY

| 항목 | 내용 |
|------|------|
| 목적 | 핵심 전략 제안 |
| headline | "전략 제안" |
| keyMessage | 예: "3가지 핵심 전략으로 검색 시장에서의 브랜드 존재감을 강화할 수 있습니다" |
| supporting | 인사이트 기반 전략 3~5개 (없으면 기본 전략) |
| evidence | 범용 evidence slice |
| visual | none |

### 2.13 ACTION

| 항목 | 내용 |
|------|------|
| 목적 | 우선순위별 실행 항목 |
| headline | "실행 액션 플랜" |
| keyMessage | 예: "3개 긴급 액션과 2개 중요 액션을 단계적으로 실행해야 합니다" |
| supporting | HIGH 액션(🔴) + MEDIUM 액션(🟡) + 담당자 |
| evidence | 범용 evidence slice |
| visual | none |

### 2.14 EXPECTED_IMPACT

| 항목 | 내용 |
|------|------|
| 목적 | 전략 실행 시 기대되는 변화 |
| headline | "기대 효과" |
| keyMessage | "검색 유입, AI 인용, 브랜드 존재감이 동시에 강화됩니다" |
| supporting | 여정 갭 보강 효과, 클러스터 커버리지, 허브 키워드 선점, AI 인용 확보 |
| evidence | 범용 evidence slice |
| visual | metric_dashboard |

### 2.15 EVIDENCE

| 항목 | 내용 |
|------|------|
| 목적 | 근거 자료 부록 |
| headline | "분석 근거 자료" |
| keyMessage | "모든 전략 제안은 실제 검색 행동 데이터에 기반합니다" |
| supporting | evidence snippet 목록 (최대 6건) |
| evidence | 전체 evidenceRefs |
| visual | evidence_panel |

### 2.16 CLOSING

| 항목 | 내용 |
|------|------|
| 목적 | PT 마무리 |
| headline | "함께 시작합시다" |
| keyMessage | 데이터 기반으로 고객에게 먼저 다가가세요 |
| supporting | 전략 수립, 로드맵 구체화, 성과 측정 |
| evidence | 없음 |
| visual | none |

## 3. 문장 톤 규칙

| 항목 | 규칙 |
|------|------|
| headline | 짧고 명확, 10자 내외 |
| keyMessage | 1~2줄, "그래서 무엇이 중요한가" |
| supportingPoints | 3~5개 이내, 비즈니스 의미 우선 |
| 용어 변환 | cluster → 관심 영역, persona → 고객 유형, pathfinder → 검색 경로, roadview → 고객 여정, weakStages → 콘텐츠 공백, hubScore → 중요도 |
| 금지 | 내부 기술 ID 노출, 코드명 노출, evidence category 직접 노출 |

## 4. 시각화 추천 매핑

| Evidence Category | 추천 Visual |
|-------------------|------------|
| search_intelligence_quality | metric_dashboard |
| search_cluster_distribution | cluster_board |
| search_cluster_detail | comparison_table |
| search_pathfinder_graph | path_graph |
| search_roadview_stages | stage_flow |
| search_persona_profiles | persona_cards |
| search_source_summary | evidence_panel |
| search_quality_warnings | quote_highlight |
