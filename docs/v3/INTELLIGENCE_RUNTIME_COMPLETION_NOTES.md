# Intelligence Runtime Completion Notes

## 이번 단계에서 반영한 코드

| 파일 | 변경 |
|------|------|
| vertical-document.ts | autoMetrics 자동 산출 로직 추가 |
| vertical-preview/page.tsx | benchmark comparison 필드명 매핑, listening 데이터 연결, side panel 연결 |
| EvidenceSidePanel.tsx | 요약/키워드/커버리지 섹션 추가, 모바일 bottom sheet 변환 |
| BenchmarkDifferentialRing.tsx | 모바일 flex-col 레이아웃 |
| IntelligenceRadialGraph.tsx | 모바일 max-w 조정 |
| listening.ts | tRPC router 생성 + root.ts 등록 |

## 완성된 기능

1. 노드 클릭 → side panel/bottom sheet drill-down (요약, 키워드, 벤치마크, 소셜, 커버리지)
2. autoMetrics → benchmark comparison → BenchmarkDifferentialRing (필드 매핑 해결)
3. comment + listening 데이터 → socialPayload → apply → signal fusion → intelligence UI
4. 모바일 반응형: 그래프 축소, 링 레이아웃 전환, bottom sheet, 그리드 조정

## 남은 과제

- ListeningAnalysisService.collectMentions() 실제 소셜 API 연동 (현재 stub)
- 벤치마크 시계열 추이 차트
- intelligence 전용 라우트 분리
- A/B 비교 모드 intelligence 차이 하이라이트
- 태블릿 중간 레이아웃 세부 최적화
