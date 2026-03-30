# Intelligence UI Implementation Notes

## 이번 단계에서 반영한 코드

- 프론트엔드 컴포넌트 6개 신규 생성 (`apps/web/src/components/intelligence/`)
- vertical-preview 페이지 수정 (Intelligence Panel 탭 통합)
- Social/Comment 데이터 프론트엔드 → 백엔드 전달 경로 연결
- apply 엔드포인트 `socialData` / `measuredMetrics` 입력 스키마 추가

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `packages/api/src/routers/vertical-document.ts` | socialData + measuredMetrics 입력 스키마 추가, undefined 제거 |
| `apps/web/src/app/(dashboard)/vertical-preview/page.tsx` | Intelligence Panel, 소셜 데이터 연결, 탭 UI |
| `apps/web/src/components/intelligence/IntelligenceSummaryCards.tsx` | 신규 |
| `apps/web/src/components/intelligence/IntelligenceRadialGraph.tsx` | 신규 |
| `apps/web/src/components/intelligence/BenchmarkDifferentialRing.tsx` | 신규 |
| `apps/web/src/components/intelligence/SignalFusionOverlayPanel.tsx` | 신규 |
| `apps/web/src/components/intelligence/TaxonomyHeatMatrix.tsx` | 신규 |
| `apps/web/src/components/intelligence/IntelligenceStatePanel.tsx` | 신규 |

---

## 구현된 시각화

### 1. SVG 방사형 확장 그래프 (IntelligenceRadialGraph)

- Center → Taxonomy → Blocks 구조
- 시드 키워드 중심으로 카테고리와 데이터 블록 노드를 동심원 배치
- 업종별 테마 색상 적용, 클러스터 수 비례 노드 크기

### 2. SVG 벤치마크 링 게이지 (BenchmarkDifferentialRing)

- 8개 메트릭 아크 세그먼트
- Baseline vs Actual 비교 시각화
- Rating별 색상 구분 (ABOVE/AVERAGE/BELOW)
- Deviation 크기에 비례한 세그먼트 두께

### 3. 시그널 융합 레이어 패널 (SignalFusionOverlayPanel)

- 3채널 시그널 시각화 (검색 / 소셜 / 댓글)
- 각 채널별 강도 및 융합 결과 표시
- 레이어 간 관계 시각화

### 4. Taxonomy 히트 매트릭스 (TaxonomyHeatMatrix)

- 카테고리별 강도 히트맵
- 색상 강도로 클러스터 밀도 표현
- 업종별 Taxonomy 분포 한눈에 파악

### 5. Intelligence 요약 카드 (IntelligenceSummaryCards)

- 4개 시그널 미니 카드 (Taxonomy / Benchmark / Social / Fusion)
- 시그널 품질 표시 + Confidence bar
- 전체 인텔리전스 상태 요약

---

## 남은 과제

- [ ] 방사형 그래프 노드 click → side panel evidence drill-down
- [ ] 벤치마크 링에 `measuredMetrics` 실제 전달 (현재 UI에서 입력 경로 없음)
- [ ] 리스닝/소셜 실시간 멘션 데이터 연결 (현재 comment만 연결)
- [ ] Intelligence 전용 페이지 분리 (현재는 vertical-preview에 통합)
- [ ] 반응형 최적화 (모바일 시각화 축소)

---

## 다음 단계 추천

1. **Intelligence 전용 라우트 생성** — `/intelligence` 경로로 독립 페이지 구성
2. **실시간 소셜 멘션 수집** — ListeningAnalysisService와 연결하여 실시간 멘션 데이터 반영
3. **A/B 비교 모드** — Intelligence 차이 하이라이트 기능 추가
4. **벤치마크 시계열 추이 차트** — 시간에 따른 벤치마크 변화 추적 시각화
