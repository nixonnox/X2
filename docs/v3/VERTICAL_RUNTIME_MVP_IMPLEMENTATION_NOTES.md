# Vertical Runtime MVP Implementation Notes

> 이번 단계에서 실제 반영한 코드, 남은 과제, 다음 단계

## 1. 이번 단계에서 반영한 코드

### 1.1 Backend — tRPC 엔드포인트

```
packages/api/src/routers/vertical-document.ts
└── apply (mutation) — 추가
    - 업종 추론 → 문서 생성 → vertical 조립 → 블록 구조화
    - 실 데이터 없으면 mock 모드 자동 전환
    - metadata에 confidence/stale/partial/mock 전달
```

### 1.2 Frontend — 페이지 라우트

```
apps/web/src/app/(dashboard)/vertical-preview/page.tsx — 신규
├── seedKeyword 입력 UI
├── outputType 선택 (WORKDOC/PT/GEO)
├── IndustrySuggestionPanel — 4개 업종 카드 + 추천 배지 + 스코어 바
├── ApplyResultPanel — 블록별 아코디언 + metadata 배지 + 경고
└── ComparisonPanel — 4개 업종 비교 프리뷰 + 차이점 매트릭스
```

### 1.3 Navigation

```
apps/web/src/lib/constants.ts — 수정
└── NAV_SECTIONS에 "업종 템플릿" 섹션 + "업종별 프리뷰" 항목 추가

apps/web/src/messages/ko.json — 수정 (verticalTemplate, verticalPreview 추가)
apps/web/src/messages/en.json — 수정 (verticalTemplate, verticalPreview 추가)
```

### 1.4 문서

```
docs/v3/
├── VERTICAL_RUNTIME_MVP_CONNECTION.md — 전체 runtime 연결 흐름
├── VERTICAL_INDUSTRY_SUGGESTION_SPEC.md — 업종 자동 감지 규칙
├── VERTICAL_APPLY_API_SPEC.md — apply API 스키마
└── VERTICAL_RUNTIME_MVP_IMPLEMENTATION_NOTES.md — 이 파일
```

### 1.5 이전 단계 버그 수정 (세션 계속)

```
packages/api/src/services/vertical-templates/vertical-preview.service.ts
└── GeneratedDocument 경로: mapDocSectionTypeToBlockType() 적용

packages/api/src/services/vertical-templates/vertical-document-integration.service.ts
├── mapDocSectionTypeToBlockType() 메서드 추가
└── GeneratedDocument 경로: mapDocSectionTypeToBlockType() 적용
```

## 2. End-to-End 흐름

```
/vertical-preview 페이지 진입
  → seedKeyword 입력 (예: "레티놀 세럼")
  → [자동] suggestIndustry query → 4개 업종 스코어 + 추천 표시
  → outputType 선택 (WORKDOC)
  → 업종 카드에서 선택 (또는 추천 수락)
  → "업종 적용" 클릭
  → [자동] apply mutation → 문서 생성 → 블록 구조화
  → ApplyResultPanel에서 결과 렌더링
    - metadata 뱃지 (톤, 액션스타일, 신뢰도)
    - quality 경고 (mock/stale/partial)
    - 블록 아코디언 (요약 → 데이터 → Evidence → Action → 경고)
```

## 3. 기존 코드와의 관계

| 기존 | 변경 |
|------|------|
| verticalDocument.generate | 유지됨 — apply가 내부적으로 호출 |
| verticalDocument.suggestIndustry | 유지됨 — 페이지에서 직접 호출 |
| verticalDocument.comparisonPreview | 유지됨 — "4개 업종 비교" 버튼에서 호출 |
| VerticalIndustrySuggester | 유지됨 — 이미 규칙 기반 구현 완료 |
| VerticalDocumentIntegrationService | 유지됨 — apply 엔드포인트가 래핑 |

## 4. 남은 과제

### 4.1 단기

- [ ] 리스닝 허브 결과 → vertical preview 연동 (실 데이터 전달)
- [ ] outputType 전환 시 결과 자동 갱신
- [ ] apply 결과 → export 연결 (Word/PPT/PDF 다운로드)
- [ ] 업종 선택 → 비교 → 재선택 흐름 개선

### 4.2 중기

- [ ] 실시간 데이터 연동 (SearchIntelligenceResult → apply 입력)
- [ ] 업종별 시즌 캘린더 반영
- [ ] 추가 업종 (FASHION, TECH_SAAS, HEALTHCARE)
- [ ] topicTaxonomy ↔ cluster 매핑 활용

### 4.3 장기

- [ ] benchmarkBaseline 실 데이터 채움
- [ ] 소셜/댓글 데이터의 업종별 연동
- [ ] A/B 비교 모드 (2개 업종 나란히 전체 문서 diff)
