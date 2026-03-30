# Beauty / F&B / Finance / Entertainment Template Spec

> 4개 업종 템플릿 상세 — 블록/톤/evidence/action 차이

## 1. 업종별 핵심 차이 요약

| 항목 | Beauty | F&B | Finance | Entertainment |
|------|--------|-----|---------|---------------|
| 핵심 관심 | 성분/효능/비교 | 메뉴/가격/방문 | 조건/금리/절차 | 반응/확산/타이밍 |
| 기본 톤 | REPORT | REPORT | FORMAL | REPORT |
| 불확실성 처리 | NEUTRAL | NEUTRAL | CONSERVATIVE | NEUTRAL |
| 액션 톤 | SUGGESTIVE | DIRECTIVE | CONSERVATIVE | DIRECTIVE |
| 리스크 강도 | STANDARD | STANDARD | STRICT | STANDARD |
| stale 허용 | O (경고) | O (경고) | X (강력 경고) | X (강력 경고) |
| 신뢰도 기준 | 40% | 40% | 60% | 35% |
| 금지 표현 | 과장 효능 | 최고 맛 | 수익 보장 | 확정 일정 |

## 2. Beauty 템플릿 상세

### 2.1 가장 중요한 인사이트 유형
- 성분 관심도 변화 (INGREDIENT_INTEREST)
- 피부 고민별 검색 패턴 (SKIN_CONCERN)
- 비교/리뷰 검색 비중 (COMPARISON_INTENT)
- 효능 탐색 → 구매 전환 (REVIEW_PATTERN)

### 2.2 가장 중요한 evidence 유형
- search_cluster_distribution → 관심 성분/효능 분류
- search_cluster_detail → 세부 키워드
- search_persona_profiles → 피부 고민별 고객 유형
- search_roadview_stages → 구매 여정 단계

### 2.3 블록 구성
| 블록 | 강조 | 제목 오버라이드 |
|------|------|--------------|
| QUICK_SUMMARY | REQUIRED | — |
| KEY_FINDING | REQUIRED | "핵심 발견: 성분/효능/피부 고민" |
| FAQ | EMPHASIZED | "자주 묻는 성분/효능 질문" |
| COMPARISON | EMPHASIZED | "제품/성분 비교" |
| PERSONA | EMPHASIZED | "고객 피부 고민 유형" |
| CLUSTER | REQUIRED | "관심 성분/효능 영역" |
| ROAD_STAGE | OPTIONAL | "구매 여정: 탐색 → 비교 → 선택" |
| ACTION | REQUIRED | "콘텐츠/제품 대응 액션" |
| EVIDENCE | REQUIRED | — |

### 2.4 톤 규칙
- 금지: "확실히 효과가 있는", "모든 피부에 적합", "기적의"
- 권장: "~에 관심이 높은 것으로 나타남", "~를 비교 검토하는 검색이 증가"
- 규제: 화장품 광고 시 의약품 표현 금지, 개인차 명시

### 2.5 PT/보고서/실무에서 차이
- PT: 비교표와 효능 근거 중심, 설득보다 "선택 기준 제시"
- 보고서: 성분 트렌드 변화 + 경쟁 비교
- 실무: 성분 FAQ 복붙용, 비교표 바로 쓰기

---

## 3. F&B 템플릿 상세

### 3.1 가장 중요한 인사이트 유형
- 메뉴 카테고리별 관심도 (MENU_INTEREST)
- 방문/재방문 전환 포인트 (VISIT_INTENT)
- 지역/시간대 맥락 (LOCATION_CONTEXT)
- 시즌/이벤트 패턴 (SEASONAL_PATTERN)

### 3.2 가장 중요한 evidence 유형
- search_cluster_distribution → 메뉴 관심 분류
- search_roadview_stages → 탐색→비교→방문 여정
- search_cluster_detail → 메뉴별 세부 키워드
- search_pathfinder_graph → 메뉴 탐색 경로

### 3.3 블록 구성
| 블록 | 강조 | 제목 오버라이드 |
|------|------|--------------|
| QUICK_SUMMARY | REQUIRED | — |
| KEY_FINDING | REQUIRED | "핵심 발견: 메뉴/맛/방문 트렌드" |
| CLUSTER | EMPHASIZED | "메뉴/카테고리 관심 영역" |
| ROAD_STAGE | EMPHASIZED | "탐색 → 비교 → 방문 여정" |
| COMPARISON | EMPHASIZED | "메뉴/가격/경쟁 비교" |
| FAQ | OPTIONAL | "자주 묻는 메뉴/매장 질문" |
| ACTION | REQUIRED | "메뉴/프로모션 대응 액션" |
| EVIDENCE | REQUIRED | — |

### 3.4 톤 규칙
- 금지: "반드시 방문해야", "최고의 맛", "압도적인"
- 권장: "~메뉴에 대한 검색이 증가", "~지역에서 방문 의도 검색 활발"
- 주의: 가격 정확성, 매장 운영 시간 변동, 시즌 메뉴 종료

### 3.5 PT/보고서/실무에서 차이
- PT: 메뉴 트렌드 + 방문 전환 데이터 중심
- 보고서: 지역/시간대 비교 + 시즌 분석
- 실무: 메뉴 프로모션 액션 + 매장 운영 참고

---

## 4. Finance 템플릿 상세

### 4.1 가장 중요한 인사이트 유형
- 상품 조건 비교 (RATE_COMPARISON)
- 금리/수수료 분석 (CONDITION_ANALYSIS)
- 가입 절차 관심 (PROCEDURE_INTEREST)
- 신뢰/안전 신호 (TRUST_SIGNAL)

### 4.2 가장 중요한 evidence 유형
- search_cluster_detail → 조건/금리 세부 키워드
- search_cluster_distribution → 금융 관심 분류
- search_roadview_stages → 탐색→비교→가입 여정
- search_intelligence_quality → 데이터 신뢰도 (특히 중요)
- search_quality_warnings → 경고 (금융은 경고 필수 표시)

### 4.3 블록 구성
| 블록 | 강조 | 제목 오버라이드 |
|------|------|--------------|
| QUICK_SUMMARY | REQUIRED | — |
| KEY_FINDING | REQUIRED | "핵심 발견: 금리/조건/절차 관심" |
| COMPARISON | EMPHASIZED | "조건/금리/혜택 비교" |
| FAQ | EMPHASIZED | "자주 묻는 금융 상품/절차 질문" |
| CLUSTER | REQUIRED | "금융 관심 영역 분류" |
| EVIDENCE | EMPHASIZED | "분석 근거 및 출처 (신뢰도 포함)" |
| RISK_NOTE | REQUIRED | "주의 사항 및 규제 가이드" |
| ACTION | REQUIRED | "콘텐츠/상품 대응 액션" |

### 4.4 톤 규칙 (가장 엄격)
- 금지: "확실한 수익", "무조건 유리", "보장된 수익률", "최고의 상품", "추천 상품"
- 권장: "~조건에서 ~로 분석됨", "~기준으로 비교한 결과"
- low confidence: "[주의: 데이터 불충분]" prefix (다른 업종보다 강한 표현)
- 규제: 투자 권유 표현 금지, 금리 변동 가능성 명시, 원금 손실 고지

### 4.5 PT/보고서/실무에서 차이
- PT: 조건 비교표 + 절차 안내가 핵심, 신뢰 강조, 과장 0%
- 보고서: 금리 트렌드 + 경쟁 상품 비교 + 데이터 품질 반드시 포함
- 실무: 조건 비교표 복붙 + FAQ 정리 + 컴플라이언스 체크리스트

---

## 5. Entertainment 템플릿 상세

### 5.1 가장 중요한 인사이트 유형
- 이슈 타이밍/버즈 (BUZZ_TIMING)
- 팬 반응 패턴 (FAN_REACTION)
- 콘텐츠 확산 (CONTENT_SPREAD)
- 참여 패턴 (ENGAGEMENT_PATTERN)

### 5.2 가장 중요한 evidence 유형
- search_cluster_distribution → 팬 반응 관심 분류
- search_pathfinder_graph → 콘텐츠 확산 경로
- search_cluster_detail → 반응 세부 키워드
- search_roadview_stages → 이슈 확산 단계

### 5.3 블록 구성
| 블록 | 강조 | 제목 오버라이드 |
|------|------|--------------|
| QUICK_SUMMARY | REQUIRED | prefix: "[엔터]" |
| KEY_FINDING | REQUIRED | "핵심 발견: 반응/확산/타이밍" |
| CLUSTER | EMPHASIZED | "팬 반응 관심 영역" |
| PATH | EMPHASIZED | "콘텐츠 확산 경로" |
| PERSONA | OPTIONAL | "팬 참여 유형" |
| COMPARISON | OPTIONAL | "콘텐츠/IP 반응 비교" |
| ACTION | REQUIRED | "콘텐츠/캠페인 액션" |
| EVIDENCE | REQUIRED | — |

### 5.4 톤 규칙
- 금지: "확정된 일정", "반드시 성공", "역대급"
- 권장: "~에 대한 팬 반응이 활발", "~시점 이후 검색량이 급증"
- 주의: 미확인 일정 구분, 팬덤 갈등 표현 주의

### 5.5 PT/보고서/실무에서 차이
- PT: 반응 타이밍 + 확산 경로가 핵심, 캠페인 실행 시점 강조
- 보고서: 이슈별 반응 비교 + 소셜-검색 교차 분석
- 실무: 타이밍 대응 액션 + 소셜 반응 요약 공유

---

## 6. 업종별 topicTaxonomy (분류 체계)

| Beauty | F&B | Finance | Entertainment |
|--------|-----|---------|---------------|
| 스킨케어 | 메뉴/음식 | 예적금 | 컴백/릴리즈 |
| 메이크업 | 가격/가성비 | 대출 | 공연/콘서트 |
| 헤어케어 | 배달/포장 | 카드 | 팬미팅 |
| 바디케어 | 매장방문 | 보험 | 굿즈/MD |
| 성분분석 | 지역맛집 | 투자 | 스트리밍/차트 |
| 피부타입 | 시즌메뉴 | 금리비교 | 예능/드라마 |
| 트러블케어 | 프로모션 | 수수료 | 영화 |
| 안티에이징 | 후기/리뷰 | 가입절차 | 웹툰/웹소설 |
| 클렌징 | 건강/다이어트 | 해지 | 팬덤활동 |
| 선케어 | 카페/디저트 | 신용관리 | 바이럴/밈 |
| 리뷰/후기 | | 재테크/연금 | IP사업 |
