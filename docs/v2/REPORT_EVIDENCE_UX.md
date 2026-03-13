# X2 — Report & Evidence UX Design

> 작성일: 2026-03-10
> 썸트렌드형 근거 보고서 + 소머즈형 원시 데이터 UX 상세 설계

---

## 0. 설계 원칙

1. **모든 수치에는 출처가 있다** — 리포트 내 모든 숫자는 원본 데이터 레코드로 추적 가능
2. **차트는 복사/내보내기 가능** — PNG, SVG, 보고서 삽입 1클릭
3. **AI 해석에는 근거 블록이 붙는다** — "왜 이런 결론인가"를 데이터로 증명
4. **원시 데이터는 언제든 접근 가능** — 가공 결과 → 원본으로 드릴다운
5. **Mock/샘플 수치 절대 금지** — 데이터 없으면 "데이터 부족" 명시

---

## 1. EvidenceBlock 시스템

### 1.1 개념

EvidenceBlock = 리포트 내 "근거 단위". 차트, 테이블, 수치 인용, 원문 인용 등.

모든 AI 생성 인사이트에는 최소 1개의 EvidenceBlock이 연결된다.

### 1.2 EvidenceBlock 유형

| 유형           | 설명                     | 데이터 연결                                   |
| -------------- | ------------------------ | --------------------------------------------- |
| `METRIC`       | 단일 수치 + 변화율       | `dataRef` → ChannelSnapshot, ContentMetric 등 |
| `CHART`        | 시계열/비교 차트         | `dataQuery` → DB 쿼리 정의 (기간, 필터)       |
| `TABLE`        | 데이터 테이블 (상위 N개) | `dataQuery` → 정렬/필터 조건                  |
| `QUOTE`        | 댓글/콘텐츠 원문 인용    | `dataRef` → Comment.id, Content.id            |
| `COMPARISON`   | Before/After 비교        | `dataRefs` → 두 시점의 스냅샷                 |
| `RANKING`      | 순위 차트/테이블         | `dataQuery` → 정렬 조건                       |
| `HEATMAP`      | 시간대/요일별 히트맵     | `dataQuery` → 시계열 집계                     |
| `DISTRIBUTION` | 파이/도넛 차트 (비율)    | `dataQuery` → 그룹별 집계                     |

### 1.3 EvidenceBlock 스키마

```
EvidenceBlock
  ├─ id
  ├─ reportSectionId        ← 소속 리포트 섹션
  ├─ type                   ← METRIC | CHART | TABLE | QUOTE | ...
  ├─ order                  ← 섹션 내 순서
  │
  ├─ title                  ← "3월 구독자 추이"
  ├─ narrative              ← AI 생성 해석 (optional)
  │                           "구독자 수는 전월 대비 +2.3% 증가하여..."
  │
  ├─ dataSource
  │   ├─ type               ← SNAPSHOT | CONTENT_METRIC | COMMENT | INTENT | AEO
  │   ├─ entityIds[]        ← 참조하는 원본 레코드 ID
  │   ├─ query (Json)       ← 집계 쿼리 정의
  │   │   ├─ table          ← "channelSnapshot"
  │   │   ├─ channelId      ← "ch_xxx"
  │   │   ├─ dateRange      ← { from: "2026-03-01", to: "2026-03-31" }
  │   │   ├─ metrics        ← ["followerCount", "engagementRate"]
  │   │   ├─ groupBy        ← "date" | "platform" | "contentType"
  │   │   └─ orderBy        ← "date ASC"
  │   └─ snapshotDate       ← 데이터 기준 시점
  │
  ├─ visualization (Json)
  │   ├─ chartType          ← line | bar | pie | table | metric_card | heatmap
  │   ├─ config             ← 차트 설정 (색상, 축, 범례 등)
  │   └─ size               ← full | half | third
  │
  ├─ isEditable             ← 사용자가 수정 가능한지
  └─ createdAt
```

### 1.4 AI 인사이트 → EvidenceBlock 연결

```
AI가 "구독자가 +2.3% 증가했습니다"라고 말할 때:

InsightReport.sections[0].content =
  "3월 자사 채널 구독자 수는 전월 대비 **+2.3%** 증가한
   **125,400명**을 기록했습니다."

  → **+2.3%** 클릭 시:
    EvidenceBlock (type: COMPARISON)
      dataSource: {
        type: "SNAPSHOT",
        entityIds: ["snap_feb_xxx", "snap_mar_xxx"],
        query: { channelId: "ch_xxx", metrics: ["followerCount"],
                 dateRange: { from: "2026-02-01", to: "2026-03-31" } }
      }
    → 2월 vs 3월 구독자 차트 표시

  → **125,400명** 클릭 시:
    EvidenceBlock (type: METRIC)
      dataSource: {
        type: "SNAPSHOT",
        entityIds: ["snap_mar31_xxx"],
        snapshotDate: "2026-03-31"
      }
    → 해당 일자 ChannelSnapshot 원본 데이터 표시
```

---

## 2. Report Builder (썸트렌드형)

### 2.1 리포트 구조

```
Report
  ├─ id, projectId
  ├─ title                  ← "2026년 3월 소셜 성과 보고서"
  ├─ templateId             ← ReportTemplate 연결 (선택)
  ├─ verticalPackId         ← Vertical Pack 연결 (선택)
  │
  ├─ coverConfig (Json)     ← 표지 설정 (로고, 제목, 날짜, 작성자)
  │
  ├─ sections: ReportSection[]
  │   ├─ [0] 요약 (Executive Summary)
  │   │   ├─ narrative (AI 생성)
  │   │   └─ evidenceBlocks[]
  │   ├─ [1] 채널 성과
  │   │   ├─ narrative
  │   │   └─ evidenceBlocks[]
  │   ├─ [2] 댓글 분석
  │   ├─ [3] 검색 트렌드
  │   ├─ [4] AI 가시성
  │   ├─ [5] 캠페인 성과
  │   └─ [6] 다음 달 제안
  │
  ├─ status                 ← DRAFT | GENERATING | READY | SHARED
  ├─ generatedAt
  ├─ shareToken             ← 외부 공유 시 토큰
  │
  └─ exportFormats          ← PDF | PPTX | GOOGLE_SLIDES
```

### 2.2 ReportTemplate

```
ReportTemplate
  ├─ id
  ├─ name                   ← "월간 성과 보고서"
  ├─ slug                   ← "monthly-performance"
  ├─ description
  ├─ verticalPackId         ← null (범용) 또는 특정 Vertical
  │
  ├─ sectionDefinitions (Json[])
  │   ├─ { title, type, dataRequirements[], autoGenerate: true }
  │   └─ ...
  │
  ├─ isSystem               ← 시스템 제공 템플릿 (수정 불가)
  ├─ isCustom               ← 사용자 정의 템플릿
  └─ createdBy
```

### 2.3 시스템 기본 템플릿

| 템플릿            | 섹션 구성                                                          | 데이터 요구                                         |
| ----------------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| **주간 성과**     | KPI 요약, 콘텐츠 Top5, 댓글 감성, 액션 아이템                      | ChannelSnapshot 7일, ContentMetric, CommentAnalysis |
| **월간 성과**     | Executive Summary, 채널별 성과, 경쟁 비교, 댓글 분석, 트렌드, 제안 | 30일 전체 데이터                                    |
| **캠페인 성과**   | Before/After, ROI, 인플루언서별 성과, 댓글 감성, 다음 제안         | Campaign, CampaignMetric, PostMeasurement           |
| **경쟁 분석**     | 채널 비교 매트릭스, 콘텐츠 전략 비교, 감성 비교, 포지셔닝          | Channel (COMPETITOR type), Snapshots                |
| **인텐트 리포트** | 키워드 분류, 갭 분석, 검색 저니, 콘텐츠 기회, 제안                 | IntentQuery, IntentKeywordResult                    |
| **AEO 가시성**    | 키워드별 가시성 추이, Citation 변화, 경쟁 비교, 최적화 가이드      | AeoSnapshot                                         |

---

## 3. 차트 UX 시스템

### 3.1 모든 차트의 공통 기능

```
┌─ 차트 컴포넌트 ─────────────────────────────────────────┐
│                                                         │
│  구독자 추이                [30일▾] [비교: 전월▾]       │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │    ╱‾‾╲__╱‾‾‾‾╲___╱‾‾‾                          │  │
│  │   ╱ (실선: 이번 달, 점선: 전월)                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 액션 바 ────────────────────────────────────────┐   │
│  │ [📋 PNG 복사] [🖼 SVG] [📄 보고서에 추가] [📥 CSV]│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  데이터 기준: 2026-03-31 18:00 KST  🟢 24h 이내         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 기간 비교 시스템

모든 시계열 차트에 기본 제공:

| 비교 모드   | 설명                                       |
| ----------- | ------------------------------------------ |
| 전주        | 이번 주 vs 지난 주                         |
| 전월        | 이번 달 vs 지난 달                         |
| 전년 동월   | 이번 달 vs 작년 같은 달                    |
| 커스텀 기간 | 임의 두 기간 비교                          |
| 벤치마크    | 산업 평균 오버레이 (Vertical Pack 활성 시) |

### 3.3 데이터 신선도 인디케이터

```
🟢 Fresh    — 24시간 이내 수집
🟡 Stale    — 7일 이내 수집
🔴 Outdated — 7일 초과 (재수집 필요)
⚪ No Data  — 데이터 없음

※ 모든 차트/지표 옆에 인디케이터 표시
※ 🔴 클릭 시 "지금 재수집" 버튼
```

---

## 4. Data Explorer (소머즈형)

### 4.1 핵심 기능

```
┌─ Data Explorer ─────────────────────────────────────────┐
│                                                         │
│  데이터 유형: [콘텐츠▾] [댓글▾] [채널 지표▾] [검색량▾]  │
│                                                         │
│  ┌─ 필터 패널 ──────────────────────────────────────┐   │
│  │ 플랫폼: [✓YouTube] [✓Instagram] [□TikTok] [□X]  │   │
│  │ 기간:   [2026-03-01] ~ [2026-03-31]              │   │
│  │ 키워드: [선크림_________________]                 │   │
│  │ 감성:   [✓긍정] [✓중립] [✓부정]                  │   │
│  │ 참여율: [0%] ─────●───── [100%]                  │   │
│  │ 조회수: [1,000+]                                 │   │
│  │                                                   │   │
│  │ [저장된 필터 불러오기▾]  [현재 필터 저장]          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  결과: 1,234건  │  뷰: [테이블▾] [카드] [타임라인]     │
│                                                         │
│  ┌─ 테이블 (모든 컬럼 정렬 가능) ────────────────────┐  │
│  │ □ │ 제목              │ 플랫폼│ 조회수 │ 참여율│... │  │
│  │ □ │ 여름 선크림 TOP5  │ YT   │123,456│ 4.2% │... │  │
│  │ □ │ 데일리 선크림 루틴│ IG   │ 45,678│ 6.1% │... │  │
│  │ ...                                               │  │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  선택: 2건  [CSV 다운로드] [Excel] [보고서에 추가]      │
│             [상세 보기]     [원문 보기]                  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 SavedFilter (저장된 필터)

```
SavedFilter
  ├─ id, projectId, createdBy
  ├─ name                   ← "뷰티 인기 콘텐츠 (참여율 5%+)"
  ├─ dataType               ← CONTENT | COMMENT | CHANNEL_METRIC | INTENT
  ├─ filterConfig (Json)    ← 필터 조건 전체
  ├─ isShared               ← 팀원과 공유 여부
  └─ createdAt
```

### 4.3 DataExportJob (내보내기)

```
DataExportJob
  ├─ id, projectId, requestedBy
  ├─ dataType               ← CONTENT | COMMENT | METRIC | INTENT | AEO
  ├─ filterConfig (Json)    ← 적용된 필터
  ├─ format                  ← CSV | EXCEL | JSON
  ├─ status                  ← QUEUED | PROCESSING | READY | EXPIRED
  ├─ rowCount                ← 내보낸 행 수
  ├─ fileUrl                 ← 다운로드 URL (S3)
  ├─ expiresAt               ← 다운로드 링크 만료 (24h)
  └─ createdAt
```

---

## 5. 인라인 수치 근거 시스템

### 5.1 Narrative + Evidence 패턴

AI가 생성하는 모든 텍스트에서 수치는 `{{evidence:ID}}` 마커로 표시:

```
AI 원본:
"3월 자사 인스타그램 채널 참여율은 {{evidence:ev_001}}로,
업계 평균 {{evidence:ev_002}} 대비 {{evidence:ev_003}} 높은 수준입니다.
특히 릴스 콘텐츠의 참여율이 {{evidence:ev_004}}로 가장 높았으며,
이는 전월 대비 {{evidence:ev_005}} 상승한 결과입니다."

렌더링:
"3월 자사 인스타그램 채널 참여율은 [4.2%]로,
업계 평균 [3.1%] 대비 [+1.1%p] 높은 수준입니다.
특히 릴스 콘텐츠의 참여율이 [6.8%]로 가장 높았으며,
이는 전월 대비 [+1.2%p] 상승한 결과입니다."

각 [대괄호 수치]는 클릭 시 원본 데이터로 드릴다운.
```

### 5.2 Evidence Registry

리포트 생성 시 모든 수치 근거를 레지스트리에 등록:

```typescript
interface EvidenceRegistry {
  evidences: Map<string, EvidenceRef>;
}

interface EvidenceRef {
  id: string; // "ev_001"
  displayValue: string; // "4.2%"
  dataSource: {
    table: string; // "channelSnapshot"
    recordId: string; // "snap_xxx"
    field: string; // "engagementRate"
    date: string; // "2026-03-31"
  };
  computation?: {
    // 계산이 필요한 경우
    formula: string; // "current - previous"
    operands: EvidenceRef[]; // 참조하는 다른 근거
  };
}
```

---

## 6. 내보내기 형식

### 6.1 PDF 리포트

```
구성:
  - 표지 (로고, 제목, 기간, 작성자)
  - 목차
  - 섹션별 본문 (EvidenceBlock 포함)
  - 부록 (원시 데이터 테이블)

생성 방식:
  - 서버 사이드 렌더링 (Puppeteer or @react-pdf/renderer)
  - 차트는 SVG → 이미지 변환
  - 비동기 생성 (BullMQ Job)
  - 완료 시 다운로드 링크 알림
```

### 6.2 PPTX 리포트

```
구성:
  - 표지 슬라이드
  - KPI 요약 슬라이드
  - 각 섹션 = 1~2 슬라이드
  - 차트는 이미지로 삽입

생성 방식:
  - pptxgenjs 라이브러리
  - 차트 → 이미지 → 슬라이드 삽입
  - 비동기 생성
```

### 6.3 CSV/Excel 내보내기

```
대상: Data Explorer 검색 결과

CSV:
  - UTF-8 BOM (Excel 한글 호환)
  - 헤더 행 포함
  - 날짜 형식: YYYY-MM-DD

Excel:
  - .xlsx (openpyxl or exceljs)
  - 헤더 스타일링
  - 자동 필터 설정
  - 시트 분리 (데이터 + 요약)
```

---

## 7. 화이트라벨 (Enterprise)

### 7.1 커스터마이징 범위

| 요소             | Pro                | Business           | Enterprise    |
| ---------------- | ------------------ | ------------------ | ------------- |
| 리포트 로고      | X2 로고            | 자사 로고 업로드   | 자사 로고     |
| 리포트 색상      | 기본               | 기본               | 브랜드 컬러   |
| 리포트 하단      | "X2로 생성"        | "X2로 생성"        | 제거 가능     |
| 공유 링크 도메인 | x2.app/reports/... | x2.app/reports/... | 커스텀 도메인 |
| PDF 표지         | X2 기본            | 자사 로고          | 완전 커스텀   |

### 7.2 화이트라벨 설정

```
WhiteLabelConfig
  ├─ workspaceId
  ├─ logoUrl
  ├─ primaryColor, secondaryColor
  ├─ companyName
  ├─ customDomain              ← Enterprise only
  ├─ hideX2Branding            ← Enterprise only
  └─ customFooterText
```

---

## 8. 신규 엔티티 요약 (이 문서 범위)

| 엔티티             | 설명                     | 우선순위          |
| ------------------ | ------------------------ | ----------------- |
| `EvidenceBlock`    | 리포트 내 근거 블록      | 높음 (Phase 5)    |
| `ReportSection`    | 리포트 섹션 (순서, 내용) | 높음 (Phase 5)    |
| `ReportTemplate`   | 리포트 템플릿 정의       | 중간 (Phase 5)    |
| `SavedFilter`      | 저장된 데이터 필터       | 중간 (Phase 2)    |
| `DataExportJob`    | 데이터 내보내기 작업     | 중간 (Phase 2)    |
| `DataView`         | 커스텀 데이터 뷰         | 낮음 (Phase 7+)   |
| `WhiteLabelConfig` | 화이트라벨 설정          | 낮음 (Enterprise) |
