# GEO_AEO_EXTENSION_PLAN — AI 검색 인용 최적화 확장 설계

> 작성일: 2026-03-10
> 상태: 확정 (일부 추후 검증 필요)

---

## 1. GEO/AEO 핵심 개념

### 1.1 용어 정의

| 용어                                     | 정의                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| **GEO** (Generative Engine Optimization) | AI 검색 엔진에서 자사 콘텐츠가 인용되도록 최적화하는 전략            |
| **AEO** (Answer Engine Optimization)     | AI 답변 엔진이 자사 콘텐츠를 출처로 선택하도록 구조화하는 전략       |
| **Citation**                             | AI 답변에서 특정 URL/소스를 출처로 인용하는 행위                     |
| **Visibility Score**                     | 특정 키워드에서 AI 답변에 자사 브랜드/콘텐츠가 나타나는 정도 (0~100) |
| **Source Registry**                      | 인용 대응 소스 목록 관리 시스템                                      |
| **Citation Log**                         | 시간별 인용 변화 추적 이력                                           |

### 1.2 왜 GEO/AEO인가

```
전통 SEO:  Google 검색 → 링크 10개 중 1위 → 클릭
AI 검색:   Google AI Overview / Perplexity → AI 답변 1개 → 인용 소스

변화:
- 검색 결과의 40%+가 AI 답변으로 대체되는 추세
- 사용자가 링크를 클릭하지 않고 AI 답변만 소비
- 인용 소스에 포함되지 않으면 트래픽 감소
- "AI에 인용되는 것"이 새로운 1위
```

---

## 2. Source Registry (출처 관리 시스템)

### 2.1 엔티티: CitationReadyReportSource

```
CitationReadyReportSource
  ├── url: 인용 대상 URL
  ├── title: 페이지 제목
  ├── domain: 도메인
  ├── sourceType: BLOG_POST | LANDING_PAGE | PRODUCT_PAGE | FAQ_PAGE | VIDEO | ...
  ├── contentSummary: AI가 요약한 콘텐츠 핵심 (인용 시 활용)
  │
  ├── targetKeywords: ["키워드1", "키워드2"]  ← 이 소스가 인용되기 원하는 키워드
  ├── primaryTopic: 주요 주제
  │
  ├── currentCitationCount: 현재 인용 중인 엔진 수
  ├── lastCitedDate: 마지막 인용일
  ├── lastCitedEngine: 마지막 인용 엔진
  ├── citationHistory: [{date, engine, rank}]
  │
  ├── geoOptimized: GEO 최적화 완료 여부
  ├── lastOptimizedAt: 마지막 최적화일
  ├── optimizationNotes: 최적화 메모
  │
  ├── priority: 우선순위 (높을수록 우선)
  └── isActive: 활성 여부
```

### 2.2 Source Registry 워크플로우

```
[1] 소스 등록
    └→ URL 입력 또는 자동 발견 (자사 콘텐츠 목록에서)
    └→ AI가 contentSummary 자동 생성
    └→ targetKeywords 설정

[2] 현재 인용 상태 확인
    └→ AeoSnapshot에서 매칭 (URL/도메인 기반)
    └→ currentCitationCount, lastCitedDate 업데이트
    └→ visibilityScore 계산

[3] 최적화 제안
    └→ 인용되지 않는 소스 → 구조 개선 제안 (GEO/AEO Engine)
    └→ 인용 순위 하락 소스 → 콘텐츠 업데이트 제안
    └→ 경쟁사만 인용되는 키워드 → 신규 콘텐츠 제작 제안

[4] 최적화 실행
    └→ InsightAction 생성 (CONTENT_OPTIMIZE, SEO_UPDATE)
    └→ geoOptimized = true, lastOptimizedAt 업데이트

[5] 효과 측정
    └→ 최적화 후 인용 변화 추적
    └→ citationHistory에 이력 축적
    └→ 재분석 루프
```

---

## 3. Citation Log (인용 추적 이력)

### 3.1 엔티티: AeoSnapshot

```
AeoSnapshot (일별 × 엔진별 스냅샷)
  ├── engine: GOOGLE_AI_OVERVIEW | PERPLEXITY | BING_COPILOT | CHATGPT_SEARCH
  ├── date: 수집일
  ├── aiResponse: AI 답변 원문 (전체 텍스트)
  │
  ├── citedSources: JSON[]
  │   └── [{
  │         url: "https://example.com/article",
  │         title: "기사 제목",
  │         domain: "example.com",
  │         rank: 1,           // 인용 순위 (1 = 첫 번째 인용)
  │         isBrand: true,     // 자사 소스 여부
  │         isCompetitor: false // 경쟁사 소스 여부
  │       }]
  │
  ├── brandMentioned: true/false  (답변 본문에 브랜드명 언급)
  ├── brandCitedRank: 2           (자사 소스 인용 순위)
  │
  ├── competitorMentions: JSON[]
  │   └── [{brand: "경쟁사A", mentioned: true, rank: 1}]
  │
  └── visibilityScore: 0~100
```

### 3.2 Citation Log 활용

```
시간축 추적:
  AeoKeyword "스킨케어 추천" (locale: ko)
  ├── 2026-03-01: Google AI → 우리 2위 인용, 경쟁사 1위
  ├── 2026-03-05: Google AI → 우리 인용 없음 (!), 경쟁사 1위
  ├── 2026-03-06: Perplexity → 우리 1위 인용
  └── 2026-03-10: Google AI → 우리 1위 인용 (최적화 효과)

인사이트:
  "Google AI Overview에서 '스킨케어 추천' 키워드 인용이 3/5에 탈락.
   원인: 경쟁사가 FAQ 구조를 업데이트.
   대응: 3/7에 FAQ 페이지 리뉴얼 → 3/10에 1위 인용 복구."
```

---

## 4. Preferred Source Policy (출처 우선순위 정책)

### 4.1 우선순위 기준

```
Priority Score = f(relevance, freshness, authority, structure)

relevance:  타겟 키워드와의 관련성 (targetKeywords 매칭)
freshness:  콘텐츠 최종 수정일 (최신일수록 높음)
authority:  도메인 권위 (DA, 백링크, 인용 이력)
structure:  GEO/AEO 친화 구조 점수
```

### 4.2 정책 적용

```
[자동 우선순위 조정]
  - 인용 수 높은 소스 → priority 자동 상향
  - 인용 탈락 소스 → 경고 + 최적화 제안
  - 새 소스 등록 → 기본 priority 0 → 인용 확인 후 조정

[수동 우선순위 설정]
  - 사용자가 priority 직접 설정 가능
  - "이 FAQ 페이지가 가장 중요하다" → priority = 100

[키워드별 소스 매핑]
  - 하나의 키워드에 여러 소스 등록 가능
  - 소스별 인용 현황 비교 → 가장 잘 인용되는 소스 파악
```

---

## 5. AI-Friendly Document Structure (AI 친화 문서 구조)

### 5.1 인용에 유리한 콘텐츠 구조

```
AI가 인용하기 좋은 콘텐츠 특성:

1. 명확한 질문-답변 구조 (FAQ 형태)
   <h2>Q: 스킨케어 추천 제품은?</h2>
   <p>A: 2026년 기준 추천 제품은...</p>

2. 구조화된 데이터 (Schema.org)
   FAQPage, HowTo, Product, Review 스키마

3. 단락 단위 핵심 정보
   첫 문장에 핵심 답변 (AI가 추출하기 쉬움)

4. 출처/근거 명시
   "XX 연구에 따르면..." → AI가 신뢰 소스로 판단

5. 최신성
   publish date, last modified date 명시
```

### 5.2 GEO 최적화 체크리스트

| 항목                           | 확인 | 자동 검증        |
| ------------------------------ | ---- | ---------------- |
| 메타 타이틀에 타겟 키워드 포함 | □    | 가능 (추후)      |
| H1/H2에 질문형 제목            | □    | 가능 (추후)      |
| 첫 단락에 핵심 답변            | □    | LLM 검증 가능    |
| Schema.org 마크업              | □    | 크롤링 검증 가능 |
| 최종 수정일 명시               | □    | 크롤링 검증 가능 |
| 내부/외부 참조 링크            | □    | 크롤링 검증 가능 |
| 모바일 친화                    | □    | PageSpeed API    |
| 페이지 로딩 속도               | □    | PageSpeed API    |

### 5.3 GEO 최적화 제안 엔진 (향후)

```
입력: CitationReadyReportSource.url
처리:
  1. 페이지 크롤링 (공개 접근, robots.txt 준수)
  2. 구조 분석 (HTML → 제목/단락/FAQ/스키마)
  3. LLM 분석: "이 페이지가 AI에 인용되려면 어떤 점을 개선해야 하는가?"
  4. 최적화 제안 생성 (InsightAction.actionType = CONTENT_OPTIMIZE)
출력: optimizationNotes에 저장
```

---

## 6. 수집 파이프라인 (AEO_CRAWL)

### 6.1 수집 흐름

```
[1] AeoKeyword 목록 조회 (status: ACTIVE)
[2] 각 키워드 × 각 엔진에 대해:
    ├─ Google AI Overview: Google Custom Search API 호출
    │   → AI Overview 포함 여부 확인
    │   → 인용 소스 파싱
    ├─ Perplexity: Perplexity API 호출
    │   → 답변 + 인용 소스 직접 반환
    ├─ Bing Copilot: Bing Search API 호출
    │   → Copilot 답변 포함 여부 확인 (가설)
    └─ ChatGPT Search: (추후 — 공식 API 미제공)

[3] 응답 파싱
    └→ aiResponse: 답변 원문
    └→ citedSources: URL/제목/도메인 추출
    └→ brandMentioned: 자사 브랜드명 포함 여부
    └→ competitorMentions: 경쟁사 브랜드명 포함 여부

[4] 저장
    └→ AeoSnapshot upsert (keywordId, date, engine)

[5] 후처리
    └→ CitationReadyReportSource.currentCitationCount 갱신
    └→ visibilityScore 계산
    └→ 인용 변화 감지 → 알림
```

### 6.2 수집 제약 사항

| 엔진               | 공식 API                 | 수집 가능성 | 비고                                          |
| ------------------ | ------------------------ | ----------- | --------------------------------------------- |
| Google AI Overview | Google Custom Search API | 가설        | AI Overview가 API 응답에 포함되는지 확인 필요 |
| Perplexity         | pplx-api (공식)          | 확정        | 유료, 답변 + 인용 소스 반환                   |
| Bing Copilot       | Bing Search API v7       | 가설        | Copilot 답변 포함 여부 불확실                 |
| ChatGPT Search     | 없음                     | 추후        | 공식 API 제공 시 대응                         |

**원칙**: 공식 API로만 수집. 비인가 접근/크롤링 금지.

---

## 7. visibilityScore 계산

```
visibilityScore = Σ(engine_weight × position_score) / Σ(engine_weight)

engine_weight:
  GOOGLE_AI_OVERVIEW: 40  (시장 점유율 기반)
  PERPLEXITY:         25
  BING_COPILOT:       20
  CHATGPT_SEARCH:     15

position_score:
  1위 인용:    100
  2위 인용:    70
  3위 인용:    50
  4위 이하:    30
  멘션만 (인용 없음): 15
  언급 없음:   0

예시:
  Google AI → 1위 인용 (100), Perplexity → 3위 인용 (50), Bing → 미인용 (0)
  score = (40×100 + 25×50 + 20×0) / (40+25+20) = 5250/85 ≈ 61.8
```

---

## 8. 확장 가능 영역

### 8.1 Citation Intelligence (인용 지능)

```
현재: 키워드별 인용 추적
향후:
  - 인용 패턴 분석: "어떤 구조의 콘텐츠가 인용되기 쉬운가?"
  - 인용 예측: "이 콘텐츠를 개선하면 인용 확률이 X% 상승"
  - 경쟁 인용 지도: 산업 전체의 인용 경쟁 맵
  - 인용 알림: 인용 탈락/획득 실시간 알림
```

### 8.2 SEvO (Search Everywhere Optimization)

```
현재: Google, Perplexity, Bing, ChatGPT
향후:
  - YouTube Search (영상 내 AI 답변)
  - Amazon Search (제품 추천 AI)
  - Naver AI (네이버 AI 답변)
  - TikTok Search (TikTok 검색 결과)
  - Reddit/Quora AI 답변
→ AeoEngine enum 확장으로 대응
```

### 8.3 Agentic Marketing

```
현재: 인간이 InsightAction을 확인하고 실행
향후:
  - AI가 자동으로 GEO 최적화 실행 (승인 워크플로우 후)
  - AI가 콘텐츠 초안 생성 → 사람 검토 → 게시
  - AI가 인용 탈락 감지 → 자동 콘텐츠 업데이트 제안
  - AI가 캠페인 성과 기반 자동 예산 재분배
→ InsightAction.status에 AUTO_EXECUTING 추가, approval workflow
```

### 8.4 AI-Native Measurement

```
현재: 전통적 지표 (조회수, 참여율, ROI)
향후:
  - AI 인용 점유율 (Share of AI Citation)
  - AI 답변 내 브랜드 감성
  - AI 추천 빈도
  - AI-driven traffic 측정 (Perplexity referral 등)
→ 새 지표 모델 추가, RoiCalculation 확장
```

### 8.5 확장 타임라인 (가설)

```
Phase 4 (현재 설계): 기본 GEO/AEO 추적
  - AeoKeyword, AeoSnapshot, CitationReadyReportSource
  - Perplexity API 우선 구현
  - visibilityScore 계산
  - Source Registry UI

Phase 4.5: 최적화 제안
  - GEO 최적화 체크리스트 자동 검증
  - LLM 기반 구조 개선 제안
  - InsightAction 연동

Phase 5+: Citation Intelligence
  - 인용 패턴 분석
  - 경쟁 인용 지도
  - 인용 예측 모델

Phase 8+: SEvO / Agentic Marketing
  - 다중 검색 엔진 확장
  - 자동 실행 워크플로우
  - AI-Native Measurement
```
