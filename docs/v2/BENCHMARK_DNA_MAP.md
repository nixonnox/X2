# X2 — Benchmark DNA Map

> 작성일: 2026-03-10
> 5개 벤치마크 서비스의 DNA를 X2 7-Stage Loop에 매핑

---

## 1. 벤치마크 DNA 추출

### 1.1 썸트렌드 (SomeTrend)

**핵심 DNA**: 직장인/기획자가 상사에게 보여줄 수 있는 "근거형 보고서"

| DNA 요소                  | 상세                                       | X2 반영 위치               |
| ------------------------- | ------------------------------------------ | -------------------------- |
| 차트 복사/내보내기        | 모든 차트에 PNG/SVG 복사 버튼              | ② Analyze, ⑤ Insight       |
| 수치 근거 인라인 표시     | "전월 대비 +23.4%" 같은 수치가 문장에 삽입 | ⑤ Insight (EvidenceBlock)  |
| PPT/PDF 보고서 1클릭 생성 | 차트 + 수치 + 해석을 보고서로 바로 조합    | ⑤ Insight (Report Builder) |
| 기간 비교 기본 지원       | 이번 달 vs 지난 달, 올해 vs 작년           | ② Analyze                  |
| 키워드 연관어 네트워크    | 연관 키워드 시각화                         | ③ Intent                   |
| 감성 분석 시계열          | 긍정/부정 비율 추이 차트                   | ② Analyze (Comment)        |

**X2 적용 원칙**:

> 모든 분석 화면의 차트/테이블은 "이 데이터를 보고서에 추가" 버튼을 가진다.
> 인사이트 텍스트에는 반드시 수치 근거가 인라인 삽입된다.

---

### 1.2 소머즈 (Socialmerge)

**핵심 DNA**: 원시 소셜 데이터에 대한 직접 접근, 필터링, 다운로드

| DNA 요소                  | 상세                                    | X2 반영 위치               |
| ------------------------- | --------------------------------------- | -------------------------- |
| 게시물 원문 열람          | 제목, 본문, 미디어, 해시태그 전체 표시  | ① Discover (Data Explorer) |
| 고급 필터                 | 플랫폼, 기간, 키워드, 감성, 참여율 범위 | ① Discover, ② Analyze      |
| 대량 다운로드 (CSV/Excel) | 필터 결과 전체 내보내기                 | ② Analyze (Data Download)  |
| 실시간 수집 피드          | 새 게시물/댓글 실시간 스트리밍          | ① Discover (Trend Feed)    |
| 원시 지표 테이블          | 가공 없는 raw 숫자 테이블 뷰            | ② Analyze                  |
| 멘션/해시태그 추적        | 특정 키워드 언급 모니터링               | ③ Intent                   |

**X2 적용 원칙**:

> "Data Explorer"는 SQL 없이도 원시 데이터를 자유롭게 탐색할 수 있는 인터페이스.
> 모든 데이터 테이블은 CSV/Excel 내보내기를 기본 지원한다.
> 필터링은 저장 가능하며, 저장된 필터는 팀원과 공유 가능하다.

---

### 1.3 리스닝마인드 (ListeningMind)

**핵심 DNA**: 검색 인텐트 → 클러스터 → 저니 분석

| DNA 요소               | 상세                                              | X2 반영 위치         |
| ---------------------- | ------------------------------------------------- | -------------------- |
| 인텐트 그래프          | 키워드 간 관계를 노드-링크로 시각화               | ③ Intent (인텐트 맵) |
| 의도 분류 (5~7유형)    | discovery, comparison, action, troubleshooting 등 | ③ Intent             |
| 검색 저니 매핑         | awareness → consideration → decision → retention  | ③ Intent (검색 저니) |
| 키워드 클러스터        | 의미적 유사 키워드 군집                           | ③ Intent (클러스터)  |
| 검색량 시계열 + 시즈널 | 월별 검색량 차트 + 시즌 패턴 감지                 | ③ Intent             |
| 갭 분석                | 검색 수요 vs 콘텐츠 공급 비교                     | ③ Intent (갭 분석)   |
| before/after 키워드    | 이 키워드 검색 전/후에 뭘 검색하나                | ③ Intent (검색 저니) |

**X2 적용 원칙**:

> 기존 intent-engine을 그대로 고도화. 리스닝마인드의 핵심 기능은 이미 설계에 반영됨.
> 추가: 검색 인텐트 → 소셜 콘텐츠 갭을 하나의 화면에서 크로스 뷰.

---

### 1.4 아하트렌드 / 디센트릭 (Aha Trend / Decent-ric)

**핵심 DNA**: 산업별 Vertical Pack + 엔터프라이즈 확장

| DNA 요소               | 상세                          | X2 반영 위치         |
| ---------------------- | ----------------------------- | -------------------- |
| 산업별 대시보드 프리셋 | 뷰티/F&B/패션 등 산업 특화 뷰 | 전체 (VerticalPack)  |
| 산업 벤치마크          | 동종업계 평균 대비 내 위치    | ⑦ Measure (벤치마크) |
| 산업 키워드 사전       | 분야별 사전 정의 키워드       | ③ Intent             |
| 화이트라벨             | 에이전시용 브랜드 제거/교체   | ⑤ Insight (리포트)   |
| SSO / SAML             | 엔터프라이즈 인증             | 설정                 |
| 전용 API               | 외부 시스템 연동              | 설정                 |
| 커스텀 토픽 분류       | 산업별 댓글 토픽 체계         | ② Analyze (Comment)  |

**X2 적용 원칙**:

> VerticalPack은 "애드온" 개념. 기본 플랫폼은 범용, Pack 활성화로 산업 특화.
> 벤치마크는 자체 수집 데이터 기반 (외부 데이터 구매 시 파트너 API).
> Enterprise 티어는 Business 상위 — SSO, SLA, 전담 CSM.

---

### 1.5 피처링 (Featuring)

**핵심 DNA**: 인플루언서 탐색 → 캠페인 실행 → 성과 재수집 루프

| DNA 요소               | 상세                                        | X2 반영 위치           |
| ---------------------- | ------------------------------------------- | ---------------------- |
| 인플루언서 검색 엔진   | 카테고리, 팔로워 범위, 참여율, 플랫폼 필터  | ① Discover             |
| 인플루언서 프로필 카드 | 채널 지표 + 오디언스 데모그래픽 추정        | ① Discover             |
| 인플루언서 리스트 관리 | 관심 목록, 협업 이력, 태그                  | ⑥ Execute              |
| 캠페인 생성            | 목표, 기간, 예산, KPI 설정                  | ⑥ Execute              |
| 인플루언서 섭외/협업   | 상태 추적 (제안→협의→계약→제작→발행)        | ⑥ Execute              |
| 콘텐츠 트래킹          | 캠페인 콘텐츠 발행 확인 + 지표 수집         | ⑥ Execute, ⑦ Measure   |
| 성과 리포트            | 캠페인 전후 비교, ROI 계산                  | ⑦ Measure              |
| 재수집 루프            | 캠페인 종료 후 지표 자동 재수집 → 성과 확정 | ⑦ Measure → ① Discover |

**X2 적용 원칙**:

> 기존 v2에 없었던 가장 큰 확장. "분석만 하고 끝"이 아니라 "실행하고 측정"까지.
> 캠페인은 InsightAction의 상위 개념 — 여러 액션을 하나의 캠페인으로 묶음.
> 성과 재수집은 Campaign Metric Sync Worker가 담당.

---

## 2. DNA 크로스 매트릭스

어떤 벤치마크의 DNA가 어떤 스테이지에 적용되는지:

```
               ① Discover  ② Analyze  ③ Intent  ④ GEO  ⑤ Insight  ⑥ Execute  ⑦ Measure
썸트렌드                       ██                        ████████
소머즈          ████████      ████████
리스닝마인드                              ████████
아하트렌드      ██            ██          ██        ██    ██         ██         ████████
피처링          ████████                                             ████████   ████████
```

| 범례     | 의미          |
| -------- | ------------- |
| ████████ | 핵심 DNA 반영 |
| ██       | 부분 DNA 반영 |

---

## 3. DNA별 필수 데이터 (Mock 불가)

### 썸트렌드 DNA → 실데이터 요구사항

```
- 기간별 지표 시계열 (ChannelSnapshot, ContentMetricDaily)
- 전월/전년 대비 증감률 (계산 기반, mock 불가)
- 댓글 감성 시계열 (CommentAnalysis 집계)
- 인사이트 텍스트 내 수치 인용 (EvidenceBlock.dataRef → 실제 DB 레코드)
```

### 소머즈 DNA → 실데이터 요구사항

```
- 콘텐츠 원문 (Content.title, description, url)
- 댓글 원문 (Comment.text, authorName)
- 원시 지표 (viewCount, likeCount 등 가공 없는 수치)
- 내보내기 데이터 (DB 쿼리 결과 → CSV 변환)
```

### 리스닝마인드 DNA → 실데이터 요구사항

```
- 검색량 (Google Trends / DataForSEO API 실데이터)
- 키워드 확장 (Google Autocomplete 실호출)
- 의도 분류 (AI 실호출 — mock 분류 금지)
```

### 아하트렌드 DNA → 실데이터 요구사항

```
- 산업 벤치마크 (자체 수집 데이터 집계 또는 파트너 API)
  → 초기에는 자체 데이터 부족 — "벤치마크 데이터 수집 중" 표시
  → 충분한 데이터 축적 후 활성화
- 산업 키워드 사전 (수동 큐레이션 or 크롤링 — 하드코딩 금지)
```

### 피처링 DNA → 실데이터 요구사항

```
- 인플루언서 채널 지표 (Social API 실데이터)
- 캠페인 콘텐츠 성과 (Campaign Content → ContentMetricDaily)
- ROI 계산 (비용 입력 + 성과 지표 실측)
```

---

## 4. 기존 v2 문서 영향도

| 기존 문서             | 변경 사항                                                  |
| --------------------- | ---------------------------------------------------------- |
| 00-PRODUCT-VISION.md  | MASTER_PLATFORM_ARCHITECTURE.md로 대체                     |
| 01-USER-JOURNEY.md    | USER_JOURNEY_EXTENSIONS.md로 확장                          |
| 02-DATA-MODEL.md      | 신규 엔티티 17개 추가 반영 필요                            |
| 03-DATA-PIPELINE.md   | Campaign Metric Sync, Influencer Sync 파이프라인 추가 필요 |
| 04-ANALYSIS-ENGINE.md | Influencer Scoring, ROI Calculation 엔진 추가 필요         |
| 05-OPERATIONS.md      | Campaign 관제, Vertical Pack 관리 추가 필요                |
| 06-MIGRATION-PLAN.md  | Phase 6 (Execute), Phase 7 (Measure) 추가 필요             |
