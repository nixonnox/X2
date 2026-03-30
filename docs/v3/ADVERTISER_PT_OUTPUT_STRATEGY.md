# Advertiser PT Output Strategy

> 광고주/PT용 출력 전략, use case별 차이, X2 차별점 반영 방식

## 1. PT 출력의 상위 목적

PT는 "데이터 설명 문서"가 아니라 "의사결정을 설득하는 문서"여야 한다.

모든 PT는 아래 질문에 답해야 한다:
1. 왜 지금 이 주제가 중요한가
2. 시장/고객/검색 흐름은 어떻게 바뀌고 있는가
3. 어떤 인사이트가 핵심인가
4. 브랜드/캠페인은 무엇을 해야 하는가
5. 왜 이 전략이 타당한가
6. 어떤 실행안으로 이어질 수 있는가

## 2. PT 유형별 전략

### 2.1 광고주 제안 PT (ADVERTISER_PROPOSAL)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 시장 문제 → 검색 인사이트 → 기회 → 전략 → 실행 → 기대효과 |
| 대상 | 광고주 의사결정자 |
| 톤 | 설득형 (persuasive) |
| 장표 수 | 12장 |
| 핵심 차별점 | 검색 인텔리전스 기반 데이터 드리븐 제안 |

**스토리 구조:**
```
표지 → 핵심 요약 → "시장에서 이런 문제가 있습니다"
→ "하지만 이런 기회가 있습니다" → "고객은 이렇게 검색합니다"
→ "이런 고객이 있습니다" → "이런 주제에 관심 있습니다"
→ "그래서 이 전략을 제안합니다" → "구체적으로 이렇게 실행합니다"
→ "이런 효과를 기대할 수 있습니다" → 근거 → 마무리
```

### 2.2 캠페인 전략 PT (CAMPAIGN_STRATEGY)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 과제 → 타겟 고객 → 여정/단계 → 관심 주제 → 소셜 반응 → 캠페인 전략 → 실행 |
| 대상 | 마케터, 캠페인 기획자 |
| 톤 | 실행 중심 (actionable) |
| 장표 수 | 11장 |
| 핵심 차별점 | persona × roadview × cluster 교차 분석 → 메시지 전략 도출 |

### 2.3 경쟁 분석 PT (COMPETITIVE_ANALYSIS)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 시장 현황 → 경쟁 갭 → 탐색 경로 → 관심 영역 → 기회 → 전략 |
| 대상 | 전략 기획자, AE |
| 톤 | 분석형 (analytical) |
| 장표 수 | 11장 |
| 핵심 차별점 | 검색 경로/클러스터 기반 경쟁 포지셔닝 |

### 2.4 GEO/AEO 전략 PT (GEO_AEO_STRATEGY)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 과제 → 여정 분석 → 관심 주제 → AI 검색 전략 → 실행 → 기대효과 |
| 대상 | SEO/GEO 담당자, 콘텐츠 운영자 |
| 톤 | 전략+기술 혼합 |
| 장표 수 | 11장 |
| 핵심 차별점 | citation readiness + schema 마크업 + FAQ 구조화 전략 |

### 2.5 인플루언서 연계 PT (INFLUENCER_COLLABORATION)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 과제 → 타겟 고객 → 관심 주제 → 소셜 반응 → 연계 전략 → 실행 |
| 대상 | 인플루언서 마케팅 담당, AE |
| 톤 | 설득형 (persuasive) |
| 장표 수 | 10장 |
| 핵심 차별점 | 검색 인텔리전스 + 소셜 반응 교차 → 인플루언서 선정/콘텐츠 방향 |

### 2.6 내부 전략 보고 (INTERNAL_STRATEGY)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 전체 분석 결과 → 모든 엔진 결과 → 경쟁/GEO 포함 → 전략 → 실행 |
| 대상 | 내부 팀 |
| 톤 | 분석형 (analytical) |
| 장표 수 | 14장 (최대) |
| 핵심 차별점 | 전체 데이터 포함, quality 경고 표시, 근거 상세 |

## 3. Audience별 PT 차이

| Audience | maxSlides | quality 경고 | raw evidence | source 상세 | 톤 |
|----------|-----------|-------------|-------------|------------|-----|
| ADVERTISER | 15 | 숨김 | 숨김 | 숨김 | 설득형 |
| EXECUTIVE | 10 | 숨김 | 숨김 | 숨김 | 전략형 |
| MARKETER | 15 | 표시 | 숨김 | 숨김 | 실행형 |
| INTERNAL | 20 | 표시 | 표시 | 표시 | 분석형 |

## 4. X2 차별점 반영

### 4.1 검색 인텔리전스 + 소셜/댓글 결합

기존 PT 도구가 제공하지 못하는 X2만의 가치:

| 결합 포인트 | PT 반영 |
|------------|--------|
| search + social reaction | SOCIAL_INSIGHT 슬라이드 — 검색 관심 + 소셜 감성 교차 |
| search + comment FAQ/risk | SOCIAL_INSIGHT에 FAQ 하이라이트 + 리스크 신호 포함 |
| search + competitor gap | COMPETITIVE_GAP 슬라이드 — 검색 경로 기반 경쟁 분석 |
| search + GEO/AEO | GEO_AEO 슬라이드 — AI 검색 인용 전략 |
| search + influencer/campaign | ACTION 슬라이드에 인플루언서 액션 포함 |

### 4.2 Evidence 기반 설득

모든 슬라이드의 주장은 evidenceRefs로 역추적 가능:
```
장표 메시지 → evidenceRef.evidenceId → category → entityIds → 원본 데이터
```

광고주에게 "근거 있는 제안"임을 보여줄 수 있음.

### 4.3 메시지 중심 구조

| 기존 | X2 PT |
|------|-------|
| 데이터 나열 | keyMessage + supportingPoints 구조 |
| 기술 용어 | 비즈니스 언어 자동 변환 |
| 설명 중심 | 설득 흐름 (문제 → 기회 → 전략 → 실행 → 효과) |

## 5. 실무 시나리오

### 시나리오 A: 광고주에게 "프로틴 음료" 제안

```
입력: deckType=ADVERTISER_PROPOSAL, audience=ADVERTISER
결과:
  - 12장 PT (ADVERTISER용 필터링)
  - narrative.strategicMessage: "프로틴 음료 고객 여정의 핵심 공백을 채워 검색 시장의 주도권을 확보하세요"
  - PROBLEM_DEFINITION: "비교·결정 단계에서 경쟁 브랜드로 이탈"
  - OPPORTUNITY: "3개 단계에서 콘텐츠 선점 기회"
  - PERSONA: "비교형 탐색자가 가장 큰 비중"
  - STRATEGY: 허브 키워드 + FAQ + persona별 콘텐츠
  - quality 경고 없음 (ADVERTISER)
```

### 시나리오 B: 내부 전략 회의용 경쟁 분석

```
입력: deckType=COMPETITIVE_ANALYSIS, audience=INTERNAL
결과:
  - 14장 PT (전체 포함)
  - COMPETITIVE_GAP: 경쟁사 대비 콘텐츠 공백 상세
  - PATHFINDER: 허브 키워드 점유 현황
  - quality 경고 표시 (stale/partial 포함)
  - 전체 evidence + source 상세 포함
```

### 시나리오 C: CMO 보고용 요약

```
입력: deckType=ADVERTISER_PROPOSAL, audience=EXECUTIVE
결과:
  - 6장 PT (EXECUTIVE 필터링)
  - TITLE → EXECUTIVE_SUMMARY → OPPORTUNITY → STRATEGY → ACTION → CLOSING
  - quality 경고 없음
  - keyMessage만으로 의사결정 가능한 구조
```
