# Vertical Export Policy Spec

> 업종별 템플릿과 export 형식의 결합 방식

## 1. 결합 구조

```
VerticalTemplate (업종별 정책)
  ×
ExportFormat (Word / PPT / PDF)
  ↓
VerticalExportPolicy (12개 조합)
  ↓
ExportBundle 변환 (블록 필터 + 부록 이동 + 경고 추가 + 톤 조정)
```

## 2. 업종 × 형식 정책 매트릭스

### 2.1 Beauty

| 항목 | Word | PPT | PDF |
|------|------|-----|-----|
| 강조 블록 | FAQ, COMPARISON, PERSONA | COMPARISON, PERSONA, CLUSTER | FAQ, COMPARISON, KEY_FINDING |
| 숨김 블록 | — | EVIDENCE | — |
| 부록 이동 | EVIDENCE | — | EVIDENCE |
| 추가 경고 | — | — | 화장품 광고 시 의약품 표현 금지 |
| 톤 오버라이드 | REPORT | — | — |

**Beauty × Word**: FAQ/비교표/성분 설명 강화. 성분 비교표가 본문 표로 렌더링. 피부 고민별 고객 유형 문단 포함.

**Beauty × PPT**: 비교 시각화 중심. COMPARISON은 comparison_table, PERSONA는 persona_cards, CLUSTER는 cluster_board 시각화 힌트. EVIDENCE는 백업 슬라이드.

**Beauty × PDF**: FAQ/비교표가 본문 페이지. 화장품 규제 경고가 유의사항 페이지에 포함. EVIDENCE는 부록.

### 2.2 F&B

| 항목 | Word | PPT | PDF |
|------|------|-----|-----|
| 강조 블록 | CLUSTER, ROAD_STAGE, COMPARISON | CLUSTER, ROAD_STAGE, ACTION | KEY_FINDING, COMPARISON, CLUSTER |
| 숨김 블록 | — | EVIDENCE | — |
| 부록 이동 | EVIDENCE | — | EVIDENCE |
| 추가 경고 | — | — | 가격 정보 변동 가능 |
| 톤 오버라이드 | REPORT | — | — |

**F&B × Word**: 메뉴/카테고리 관심 영역과 방문 여정이 본문. COMPARISON은 메뉴/가격 비교표.

**F&B × PPT**: 메뉴/방문/프로모션 중심. CLUSTER는 cluster_board, ROAD_STAGE는 stage_flow 시각화. ACTION 슬라이드에 프로모션 실행 항목.

**F&B × PDF**: 메뉴 트렌드 + 비교표 본문. 가격 변동 경고 포함.

### 2.3 Finance (가장 엄격)

| 항목 | Word | PPT | PDF |
|------|------|-----|-----|
| 강조 블록 | COMPARISON, FAQ, RISK_NOTE, EVIDENCE | COMPARISON, KEY_FINDING, RISK_NOTE | COMPARISON, FAQ, RISK_NOTE, EVIDENCE |
| 숨김 블록 | — | — | — |
| 부록 이동 | — | EVIDENCE | — |
| 추가 경고 | 투자 권유 표현 금지 2건 | 참고용 안내 1건 | 투자 권유 금지 + 금리 변동 + 원금 손실 고지 3건 |
| 톤 오버라이드 | FORMAL | FORMAL | — |

**Finance × Word**: EVIDENCE가 부록이 아닌 본문에 포함 (금융은 근거 숨기면 안 됨). RISK_NOTE가 강조. FORMAL 톤 강제. 투자 권유 금지 경고 삽입.

**Finance × PPT**: COMPARISON(조건 비교표)과 RISK_NOTE가 본문 슬라이드. EVIDENCE는 백업. "참고용이며 투자 권유 목적이 아닙니다" 경고. FORMAL 톤.

**Finance × PDF**: 모든 블록 포함 (숨김 없음). 유의사항 페이지에 3건의 규제 경고 필수. mock이면 워터마크 + CRITICAL 경고.

### 2.4 Entertainment

| 항목 | Word | PPT | PDF |
|------|------|-----|-----|
| 강조 블록 | CLUSTER, PATH, ACTION | PATH, CLUSTER, ACTION | KEY_FINDING, CLUSTER, PATH |
| 숨김 블록 | — | EVIDENCE, FAQ | — |
| 부록 이동 | EVIDENCE | — | EVIDENCE |
| 추가 경고 | — | — | 미확인 일정/루머 기반 표시 |
| 톤 오버라이드 | REPORT | — | — |

**Entertainment × Word**: 팬 반응 영역(CLUSTER)과 확산 경로(PATH) 강조. ACTION에 타이밍 대응 항목.

**Entertainment × PPT**: PATH는 path_graph 시각화 (확산 경로), CLUSTER는 cluster_board (팬 반응). FAQ/EVIDENCE 숨김 — 반응/확산/타이밍에 집중.

**Entertainment × PDF**: 팬 반응 + 확산 경로 본문. 미확인 정보 구분 경고 포함.

## 3. 업종별 규제 경고 (Export 반영)

### 3.1 Beauty (Word/PDF)

| 경고 | 배치 |
|------|------|
| 화장품 광고 시 '치료', '완치' 등 의약품 표현 사용 금지 | PDF: FOOTER, Word: APPENDIX |
| 개인차에 따른 효과 차이를 명시해야 함 | PDF: FOOTER, Word: APPENDIX |

### 3.2 F&B (Word/PDF)

| 경고 | 배치 |
|------|------|
| 가격 표시 시 부가세 포함 여부 명시 | PDF: FOOTER, Word: APPENDIX |
| 식품 알레르기 정보 누락 주의 | PDF: FOOTER, Word: APPENDIX |

### 3.3 Finance (전 형식)

| 경고 | 배치 |
|------|------|
| 금융 상품 정보 제공 시 투자 권유 오해 표현 금지 | Word: HEADER, PPT: FOOTER, PDF: FOOTER |
| 금리/조건은 변동 가능성 명시 | Word: INLINE, PPT: FOOTER, PDF: FOOTER |
| 원금 손실 가능 상품은 위험 고지 필수 | Word: INLINE, PPT: FOOTER, PDF: FOOTER |
| 보험 상품은 보장 범위와 면책 사항 함께 안내 | Word: APPENDIX, PPT: SPEAKER_NOTE, PDF: FOOTER |

### 3.4 Entertainment (PDF)

| 경고 | 배치 |
|------|------|
| 미확인 일정은 '예상', '루머' 등으로 명확히 구분 | PDF: FOOTER |
| 팬덤 간 갈등을 조장하는 표현 사용 금지 | PDF: FOOTER |

## 4. Mock / Stale / Partial × 업종 × 형식

### 4.1 Mock 데이터

| 업종 | Word | PPT | PDF |
|------|------|-----|-----|
| Beauty | 상단 [검증 필요] | 하단 [검증 필요] | 워터마크 |
| F&B | 상단 [검증 필요] | 하단 [검증 필요] | 워터마크 |
| Finance | 상단 [**경고**] + CRITICAL | 하단 [**경고**] | 워터마크 + CRITICAL 뱃지 |
| Entertainment | 상단 [검증 필요] | 하단 [검증 필요] | 워터마크 |

### 4.2 Stale 데이터

| 업종 | Word | PPT | PDF |
|------|------|-----|-----|
| Beauty/F&B | 인라인 [주의] | 하단 [주의] | 하단 [주의] |
| Finance | 인라인 [**경고**] CRITICAL | 하단 [**경고**] | 하단 + 뱃지 |
| Entertainment | 인라인 [**경고**] CRITICAL | 하단 [**경고**] | 하단 + 뱃지 |

### 4.3 Low Confidence

| 업종 | 기준 | 접두어 |
|------|------|--------|
| Beauty/F&B | 40% 미만 | [참고] 데이터 제한적 — |
| Finance | 60% 미만 | [주의: 데이터 불충분] |
| Entertainment | 35% 미만 | [참고] 데이터 제한적 — |

## 5. 흐름 예시

### 5.1 Finance × PDF Export

```
1. WorkReportGenerationService.generate() → WorkDoc (금융 주간 보고)
2. VerticalDocumentAssembler.assemble("FINANCE") → VerticalAssemblyResult
3. ExportOrchestratorService.execute({
     exportFormat: "PDF",
     purpose: "APPROVAL_DOCUMENT",
     audience: "EXECUTIVE",
     industryType: "FINANCE",
     sourceData: { sections: verticalResult.sections, ... }
   })
4. ExportWarningBuilder.buildWarnings() →
   - LOW_CONFIDENCE (60% 기준 미달 → HEADER)
   - MOCK_DATA (→ WATERMARK)
5. ExportBlockAssembler.assembleFromSections() → ExportBundle
6. VerticalExportPolicyService.applyPolicy("FINANCE", "PDF") →
   - COMPARISON, FAQ, RISK_NOTE, EVIDENCE 강조 (숨김 없음)
   - 추가 경고 3건 (투자 권유 금지, 금리 변동, 원금 손실)
   - regulatoryNotes 4건
7. PdfExportBuilder.build() →
   - coverPage: 신뢰도 뱃지 LOW
   - 본문: COMPARISON(조건표) + FAQ(금융 질문) + RISK_NOTE(규제)
   - disclaimerPage: 규제 7건 + 품질 경고 + evidence 요약
   - metadata: isWatermarked: true
```
