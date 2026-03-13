# Evidence Bundle 설계

## 목적

Evidence Bundle은 리포트, PPT, 문서에 **바로 활용 가능한 근거 자료 구조**다.
분석 결과를 시각화 가능한 형태로 정리하고, 원본 데이터 추적과 한국어 설명을 포함하여 비즈니스 사용자가 즉시 활용할 수 있도록 한다.

---

## Bundle Types (8종)

| Type                     | 포함 데이터                          | 활용 예시             |
| ------------------------ | ------------------------------------ | --------------------- |
| **SENTIMENT_OVERVIEW**   | 감성 분포, 부정 댓글 샘플, 토픽 분석 | 주간 리포트 감성 섹션 |
| **FAQ_SUMMARY**          | 미답변 FAQ, 질문 유형 분포           | FAQ 대응 리포트       |
| **RISK_SUMMARY**         | 리스크 시그널, 심각도 분포           | 위기 관리 보고서      |
| **INTENT_GAP**           | 블루오션 키워드, 갭 분석             | SEO 전략 리포트       |
| **TREND_OVERVIEW**       | 상승/하락 키워드, 볼륨 변화          | 트렌드 리포트         |
| **COMPETITIVE_POSITION** | 채널 비교                            | 경쟁 분석 리포트      |
| **CAMPAIGN_PERFORMANCE** | 캠페인 성과, ROI                     | 캠페인 결과 보고서    |
| **FULL_PROJECT**         | 위 전체 통합                         | 월간 종합 리포트      |

---

## EvidenceBundleItem 구조

각 Bundle은 여러 개의 `EvidenceBundleItem`으로 구성된다.

| 필드               | 타입             | 설명                                                       |
| ------------------ | ---------------- | ---------------------------------------------------------- |
| **category**       | `string`         | 데이터 종류 식별 (예: `sentiment`, `faq`, `risk`)          |
| **label**          | `string`         | 사람이 읽는 제목 (예: "감성 분석 요약", "미답변 FAQ 목록") |
| **dataSourceType** | `DataSourceType` | DB 테이블 참조 (10종, 아래 참조)                           |
| **entityIds**      | `string[]`       | 실제 데이터 레코드 ID 목록                                 |
| **displayType**    | `DisplayType`    | 시각화 힌트                                                |
| **summary**        | `string`         | 한국어 설명 문장 (PPT/문서에 바로 사용 가능)               |
| **data**           | `object`         | 사전 해소된 요약 데이터 (차트/테이블 렌더링용)             |

### DisplayType (시각화 힌트)

| DisplayType  | 용도                                           |
| ------------ | ---------------------------------------------- |
| `TABLE`      | 데이터 테이블 (FAQ 목록, 댓글 샘플 등)         |
| `LINE_CHART` | 시계열 추이 (트렌드, 볼륨 변화)                |
| `BAR_CHART`  | 비교 차트 (채널별 성과, 카테고리 분포)         |
| `PIE_CHART`  | 비율 차트 (감성 분포, 질문 유형)               |
| `QUOTE_LIST` | 인용 목록 (부정 댓글 샘플, 리스크 시그널 원문) |
| `KPI_CARD`   | KPI 카드 (핵심 지표 요약)                      |

---

## PPT/문서 활용 기준

Evidence Bundle은 PPT 슬라이드나 보고서 문서에 직접 활용할 수 있도록 설계되었다:

- **`item.summary`**: 슬라이드 설명 문구로 바로 사용 가능
  - 예: "최근 7일간 부정 댓글이 42%로 전월 대비 15%p 증가했습니다. 배송과 품질이 주요 불만 토픽입니다."
- **`item.displayType`**: 차트 유형 결정에 사용
  - PIE_CHART → 파이 차트 슬라이드, LINE_CHART → 추이 그래프 슬라이드
- **`item.entityIds`**: 원본 데이터 추적 가능
  - 특정 수치의 출처를 확인하거나, 상세 데이터로 드릴다운할 때 사용
- **한국어 설명**: 비즈니스 사용자도 이해할 수 있는 자연어 설명
  - 기술 용어 대신 비즈니스 맥락의 표현 사용

---

## DataSourceType 매핑 (10종)

| DataSourceType     | 참조 테이블     | 설명                            |
| ------------------ | --------------- | ------------------------------- |
| `CHANNEL_SNAPSHOT` | ChannelSnapshot | 채널 스냅샷 (구독자, 조회수 등) |
| `CONTENT_METRIC`   | ContentMetric   | 콘텐츠별 성과 지표              |
| `COMMENT_ANALYSIS` | CommentAnalysis | 댓글 감성/토픽 분석 결과        |
| `INTENT_RESULT`    | IntentResult    | 검색 의도 분석 결과             |
| `AEO_SNAPSHOT`     | AeoSnapshot     | AI Engine Optimization 스냅샷   |
| `CAMPAIGN_METRIC`  | CampaignMetric  | 캠페인 성과 지표                |
| `KEYWORD_METRIC`   | KeywordMetric   | 키워드별 검색량/순위            |
| `RAW_MENTION`      | RawMention      | 원본 멘션 데이터                |
| `FAQ_CANDIDATE`    | FaqCandidate    | FAQ 후보 질문                   |
| `RISK_SIGNAL`      | RiskSignal      | 리스크 시그널                   |

각 `EvidenceBundleItem`의 `dataSourceType`과 `entityIds`를 조합하면 해당 데이터의 원본 레코드를 정확히 조회할 수 있다.
