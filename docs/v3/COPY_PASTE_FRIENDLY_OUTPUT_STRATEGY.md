# Copy-Paste Friendly Output Strategy

> 실무형 복붙/정리/보고 출력 전략, 문서 유형별 차이, 역할별 필터링

## 1. 실무 문서의 상위 목적

실무 문서는 "분석 결과를 설명하는 문서"가 아니라 "바로 복붙해서 쓸 수 있는 문서"여야 한다.

모든 실무 문서는 아래 기준을 충족해야 한다:
1. 한 줄 요약이 있어서 슬랙/메신저에 바로 공유 가능
2. 문장 단위로 복붙 가능 (블록 단위가 아님)
3. 보고서/메신저/회의/공식 보고 등 용도에 맞는 톤 선택 가능
4. 모든 문장의 근거를 역추적 가능
5. 품질 경고가 문장 단위로 표시

## 2. 문서 유형별 전략

### 2.1 주간 보고서 (WEEKLY_REPORT)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → 비교 → 액션 → 리스크 → 근거 |
| 대상 | 팀원, 팀장 |
| 분량 | 1-2페이지 |
| 톤 | REPORT (기본) |
| 용도 | 주간 회의 전 공유, 이메일 첨부 |

### 2.2 월간 보고서 (MONTHLY_REPORT)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → 비교 → FAQ → 액션 → 리스크 → 근거 |
| 대상 | 팀장, 임원 |
| 분량 | 2-3페이지 |
| 톤 | FORMAL (기본) |
| 용도 | 월간 보고, 전략 회의 자료 |

### 2.3 검색 인텔리전스 요약 (SI_SUMMARY)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → 비교 → 액션 → 근거 |
| 대상 | 실무자, 마케터 |
| 분량 | 1페이지 |
| 톤 | REPORT (기본) |
| 용도 | 분석 결과 빠른 공유 |

### 2.4 댓글/이슈 보고서 (COMMENT_ISSUE_REPORT)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → FAQ → 리스크 → 액션 → 근거 |
| 대상 | 운영 담당, CS팀 |
| 분량 | 1-2페이지 |
| 톤 | MEETING_BULLET (기본) |
| 용도 | 이슈 대응, CS 공유 |

### 2.5 회의 자료 (MEETING_MATERIAL)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → 액션 |
| 대상 | 회의 참석자 |
| 분량 | 1장 (최소) |
| 톤 | MEETING_BULLET (기본) |
| 용도 | 회의에서 화면 공유 또는 프린트 |

### 2.6 의사결정 메모 (DECISION_MEMO)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → 비교 → 액션 → 근거 |
| 대상 | 의사결정자 |
| 분량 | 1-2페이지 |
| 톤 | FORMAL (기본) |
| 용도 | "이 전략을 해야 할까?" 판단 근거 |

### 2.7 근거 모음 문서 (EVIDENCE_BUNDLE_DOC)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 근거 → 비교 → FAQ |
| 대상 | 분석가, 기획자 |
| 분량 | 2-3페이지 |
| 톤 | REPORT (기본) |
| 용도 | 기획서/제안서 첨부 근거 |

### 2.8 GEO/AEO 운영 메모 (GEO_AEO_OPS_MEMO)

| 항목 | 내용 |
|------|------|
| 핵심 흐름 | 요약 → 발견 → FAQ → 액션 → 근거 |
| 대상 | SEO/GEO 운영자 |
| 분량 | 1-2페이지 |
| 톤 | MEETING_BULLET (기본) |
| 용도 | AI 검색 최적화 실행 체크리스트 |

## 3. Audience별 문서 차이

| Audience | maxSections | 기본 톤 | 품질 경고 | raw evidence | source 상세 | 리스크 |
|----------|-------------|---------|----------|-------------|------------|--------|
| PRACTITIONER | 10 | REPORT | 표시 | 전체 | 표시 | 표시 |
| TEAM_LEAD | 7 | REPORT | 표시 | snippet만 | 숨김 | 표시 |
| EXECUTIVE | 4 | FORMAL | 숨김 | snippet만 | 숨김 | 숨김 |
| OPS_MANAGER | 10 | MEETING_BULLET | 표시 | 전체 | 표시 | 표시 |

## 4. 복붙 시나리오

### 시나리오 A: 팀장에게 슬랙으로 주간 결과 공유

```
입력: docType=WEEKLY_REPORT, audience=TEAM_LEAD, tone=MESSENGER
결과:
  quickSummary: "'프로틴 음료' 검색 분석: 5개 관심 영역, 3개 고객 유형, 2개 콘텐츠 공백 발견"
  → 슬랙에 quickSummary 복붙
  → 상세 필요하면 KEY_FINDING 섹션 복붙
```

### 시나리오 B: 회의에서 화면 공유

```
입력: docType=MEETING_MATERIAL, audience=PRACTITIONER, tone=MEETING_BULLET
결과:
  - 3개 섹션 (요약 + 발견 + 액션)
  - 모든 문장이 "• " 로 시작
  - 바로 화면에 띄워서 공유
```

### 시나리오 C: 임원에게 월간 보고

```
입력: docType=MONTHLY_REPORT, audience=EXECUTIVE, tone=FORMAL
결과:
  - 3개 섹션만 (요약 + 발견 + 액션)
  - "~하였으며, ~으로 분석되었습니다" 톤
  - 품질 경고 없음
  - 근거 snippet만 포함
```

### 시나리오 D: 기획서에 근거 자료 첨부

```
입력: docType=EVIDENCE_BUNDLE_DOC, audience=PRACTITIONER, tone=REPORT
결과:
  - evidence 전체 포함
  - 카테고리별 정리
  - FAQ 포함
  - 기획서에 부록으로 붙이기
```

## 5. PT/보고서와의 차별점

| 항목 | PT (pt/) | 보고서 (documents/) | 실무 문서 (workdocs/) |
|------|---------|-------------------|---------------------|
| 복붙 가능? | 어려움 (슬라이드 구조) | 가능하나 가공 필요 | 바로 가능 |
| 톤 선택? | 없음 (audience별 고정) | 없음 (role별 고정) | 4종 톤 선택 가능 |
| 한 줄 요약? | narrative | section summary | quickSummary |
| 문장 단위 근거? | evidenceRefs (슬라이드 단위) | evidenceRefs (블록 단위) | evidenceRef (문장 단위) |
| 품질 경고 위치? | speakerNote | quality.warnings | qualityNote (문장 단위) |
