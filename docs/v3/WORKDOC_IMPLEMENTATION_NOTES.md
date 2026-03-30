# WorkDoc Implementation Notes

> 이번 단계에서 실제 반영한 코드 · 설계 결정 · 남은 과제

## 1. 이번 단계에서 반영한 코드

### 1.1 실무 문서 생성 서비스 (신규 생성: 8개 파일)

```
packages/api/src/services/workdocs/
├── types.ts                           # WorkDoc, WorkDocSection, WorkDocSentenceBlock, 8종 문서유형, 4종 역할, 4종 톤, 7종 블록
├── work-report-generation.service.ts  # 오케스트레이터 (메인 진입점)
├── quick-summary-builder.ts           # 한 줄/한 문단 요약 빌더
├── evidence-to-workdoc-mapper.ts      # evidence → 실무 문서용 ref 변환
├── report-sentence-builder.ts         # 4종 톤별 문장 변환기
├── workdoc-section-builder.ts         # 7종 블록 유형별 섹션 빌더
├── role-based-workdoc-assembler.ts    # audience별 필터링·재조립
└── index.ts                           # Barrel export
```

### 1.2 서비스 팩토리 등록

`packages/api/src/services/index.ts`에 추가:
- import: `WorkReportGenerationService`
- re-export: WorkDoc 타입 8종 (WorkDoc, WorkDocType, WorkDocAudience, WorkDocSection, WorkDocSentenceBlock, WorkDocBlockType, SentenceTone, WorkDocAudienceConfig, GenerateWorkDocInput)
- factory: `workReportGeneration: new WorkReportGenerationService()` (stateless)

### 1.3 생성된 문서 (4개)

```
docs/v3/
├── WORKDOC_GENERATION_ARCHITECTURE.md
├── WORKDOC_BLOCK_SPEC.md
├── COPY_PASTE_FRIENDLY_OUTPUT_STRATEGY.md
└── WORKDOC_IMPLEMENTATION_NOTES.md (이 파일)
```

## 2. 설계 결정

### 2.1 기존 documents/, pt/와 별도 분리

- documents/: GEO/AEO + 보고서 (분석 중심, DocumentBlock 기반)
- pt/: 광고주 설득 PT (메시지 중심, PtSlideBlock + keyMessage)
- workdocs/: 실무 복붙/정리/보고 (즉시 사용 중심, WorkDocSection + sentences)
- 이유: "바로 복붙해서 쓰는 문서"는 분석 보고서나 PT와 전혀 다른 구조가 필요

### 2.2 문장 단위 복붙 + 근거 추적

- WorkDocSentenceBlock에 문장별 evidenceRef 연결
- 기존: 블록/슬라이드 단위로만 근거 추적
- 이유: 실무자가 문장 하나를 복붙할 때도 "이 문장의 근거가 뭔지" 확인 가능해야 함

### 2.3 4종 톤 (SentenceTone) 도입

- REPORT: 보고서 문장체 ("~로 분석됩니다")
- MESSENGER: 메신저 공유용 ("~입니다. 확인 부탁드립니다")
- MEETING_BULLET: 회의 불릿 ("• ~")
- FORMAL: 공식 보고 ("~한 것으로 분석되었습니다")
- 이유: 같은 데이터라도 슬랙에 보낼 때와 공식 보고서에 쓸 때 문장이 달라야 함

### 2.4 QuickSummary (한 줄/한 문단) 도입

- 모든 문서에 quickSummary 필수
- buildOneLiner(): 슬랙/메신저에 바로 공유 가능한 한 줄
- buildParagraph(): 보고서 서두에 쓸 수 있는 한 문단
- 이유: 실무자가 가장 먼저 하는 일은 "한 줄로 공유하기"

### 2.5 실무 역할 4종 (WorkDocAudience)

- PRACTITIONER: 일반 실무자 — 전체 내용 + 복붙
- TEAM_LEAD: 팀장/리더 — 요약 + 판단 근거
- EXECUTIVE: 대표/임원 — 핵심만 1장
- OPS_MANAGER: 운영 담당 — 전체 데이터 + 실행 항목
- 이유: documents/의 DocumentRole, pt/의 PtAudience와 다른 실무 현장의 역할 구분

### 2.6 8종 문서 유형

- WEEKLY_REPORT, MONTHLY_REPORT: 정기 보고
- SI_SUMMARY: 분석 결과 빠른 공유
- COMMENT_ISSUE_REPORT: 댓글/이슈 대응
- MEETING_MATERIAL: 회의 자료 (1-2장 최소)
- DECISION_MEMO: 의사결정 근거
- EVIDENCE_BUNDLE_DOC: 근거 자료 모음
- GEO_AEO_OPS_MEMO: AI 검색 운영 메모
- 이유: 실무에서 실제로 만드는 문서 유형을 반영

### 2.7 품질 경고 문장 단위 표시

- WorkDocSentenceBlock.qualityNote에 문장별 경고
- "[검증 필요]", "[주의]", "[참고]" prefix
- RISK_NOTE 블록에서 품질 리스크 별도 정리
- EXECUTIVE audience에서는 경고 제거
- 이유: 실무자가 복붙할 때 "이 데이터 믿어도 되는지" 즉시 판단 가능

## 3. Backward Compatibility

| 항목 | 호환성 |
|------|--------|
| documents/SearchDocumentGenerationService | 유지됨 — GEO/AEO + 보고서 출력 담당 |
| documents/SearchPtSectionBuilder | 유지됨 — 데이터 중심 PT 출력 |
| pt/PtDeckGenerationService | 유지됨 — 광고주 설득 PT 출력 |
| SearchEvidenceBundleService | 유지됨 — evidence 입력 제공 |
| SearchInsightIntegrationService | 유지됨 — insight 입력 제공 |
| SearchActionIntegrationService | 유지됨 — action 입력 제공 |
| 기존 서비스 팩토리 | 유지됨 — Group 10 추가만 |

## 4. 실제 흐름 예시

### 주간 보고서 생성 흐름 (팀장용, 메신저 톤)

```
1. SearchIntelligenceResult 수신
2. assessSearchDataQuality(result) → quality
3. searchEvidenceBundle.buildSearchEvidenceItems(result, quality) → evidenceItems
4. searchInsightIntegration.generate(result, quality) → insights
5. searchActionIntegration.generate(result, quality) → actions
6. workReportGeneration.generate({
     result, quality, evidenceItems,
     docType: "WEEKLY_REPORT",
     audience: "TEAM_LEAD",
     insights, actions,
     tone: "MESSENGER"
   })
7. 내부:
   - EvidenceToWorkDocMapper → evidenceRefs + sourceRefs
   - QuickSummaryBuilder.buildOneLiner() → "'프로틴 음료' 검색 분석: ..."
   - WorkDocSectionBuilder.buildSection() × 6 → sections
   - ReportSentenceBuilder → 각 문장 MESSENGER 톤 적용
   - RoleBasedWorkDocAssembler.assemble(doc, "TEAM_LEAD") → 필터링
8. → WorkDoc (6개 섹션 → TEAM_LEAD 필터 → 5개 섹션)
```

## 5. 남은 과제

### 5.1 단기 (다음 스프린트)

- [ ] **tRPC 라우터**: `workDoc.generate` 엔드포인트
- [ ] **프론트엔드 UI**: 리스닝 허브에서 "문서 생성" → docType + audience + tone 선택 → 미리보기
- [ ] **복붙 버튼**: 섹션별/문장별 클립보드 복사 기능
- [ ] **소셜/댓글 데이터 실제 연동**: COMMENT_ISSUE_REPORT에 CommentAnalysis 데이터 자동 주입
- [ ] **LLM 문장 고도화**: ReportSentenceBuilder의 톤 변환을 AI 기반으로 개선

### 5.2 중기

- [ ] **Word/HWP Export**: WorkDoc → .docx / .hwp 파일 변환
- [ ] **이메일 발송**: 생성된 문서를 이메일로 직접 발송
- [ ] **슬랙 연동**: quickSummary를 슬랙 채널에 자동 게시
- [ ] **템플릿 커스터마이징**: 회사별 보고서 양식 적용
- [ ] **히스토리**: 문서 생성 이력 저장/비교

### 5.3 장기

- [ ] **자동 정기 보고**: 스케줄 기반 주간/월간 보고서 자동 생성
- [ ] **팀 공유**: 생성된 문서의 팀 내 공유/코멘트
- [ ] **다국어**: 한국어/영어/일본어 톤 지원
- [ ] **음성 브리핑**: 문서 내용을 음성으로 요약
