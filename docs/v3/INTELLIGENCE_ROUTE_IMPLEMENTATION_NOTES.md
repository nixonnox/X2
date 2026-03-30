# Intelligence Route Implementation Notes

> 이번 단계에서 실제 반영한 코드, 남은 과제, 다음 단계 준비 사항을 정리한 문서.

---

## 1. 이번 단계에서 반영한 코드

### 1.1 Backend — 서비스

| 파일 | 상태 | 설명 |
|---|---|---|
| `packages/api/src/services/intelligence/intelligence-comparison.service.ts` | **신규** | A/B 비교 분석 서비스. compare() 메서드로 두 Side의 분석 결과를 비교하고, KeyDifference, HighlightedChange, ActionDelta, overallDifferenceScore를 산출 |
| `packages/api/src/services/intelligence/live-social-mention-bridge.service.ts` | **신규** | 다중 소셜 플랫폼 실시간 멘션 수집 브릿지. YouTube/Comments provider 연결, Instagram/TikTok/X는 stub. collectLiveMentions()로 멘션 수집 → TopicSignal/BuzzLevel/Freshness 계산 |

### 1.2 Backend — tRPC 라우터

| 파일 | 상태 | 설명 |
|---|---|---|
| `packages/api/src/routers/intelligence.ts` | **신규** | intelligence 전용 tRPC 라우터. 3개 endpoint 제공: `analyze` (mutation), `liveMentions` (query), `compare` (mutation) |
| `packages/api/src/root.ts` | **수정** | appRouter에 `intelligence: intelligenceRouter` 등록 |

### 1.3 Frontend — 페이지

| 파일 | 상태 | 설명 |
|---|---|---|
| `apps/web/src/app/(dashboard)/intelligence/page.tsx` | **신규** | 키워드 분석 메인 페이지. 키워드 입력 → analyze mutation → Signal Fusion 시각화. 3-column (Desktop) / 2-column (Tablet) / stacked+tabs (Mobile) 레이아웃 |
| `apps/web/src/app/(dashboard)/intelligence/compare/page.tsx` | **신규** | A/B 비교 분석 페이지. 비교 모드 선택 → Side A/B 입력 → compare mutation → DifferenceScoreBanner, DifferenceCard, HighlightCard, ActionDeltaPanel 렌더링 |

### 1.4 Frontend — 컴포넌트

| 파일 | 상태 | 설명 |
|---|---|---|
| `apps/web/src/components/intelligence/LiveMentionStatusPanel.tsx` | **신규** | 실시간 소셜 멘션 상태 패널. Provider 연결 상태 표시, BuzzLevel 배지, Freshness 인디케이터, Coverage 경고, 60초 자동 갱신 연동 |

---

## 2. 남은 과제

### 2.1 소셜 Provider 실제 API 연결

| Provider | 현재 상태 | 필요 작업 |
|---|---|---|
| Instagram | stub (NOT_CONNECTED) | Instagram Graph API 연동, OAuth 토큰 관리, 해시태그/멘션 검색 구현 |
| TikTok | stub (NOT_CONNECTED) | TikTok Research API 연동, 키워드 기반 영상/댓글 검색 구현 |
| X (Twitter) | stub (NOT_CONNECTED) | X API v2 연동, 실시간 검색/스트림 구현, rate limit 핸들링 |

### 2.2 Benchmark Time-series 트렌드 차트

- 현재: 벤치마크 데이터를 시점별 스냅샷으로만 표시
- 필요: 시계열 트렌드 차트 (라인 차트) 추가
- 의존: 벤치마크 데이터의 주기적 저장 및 이력 조회 API

### 2.3 기간 비교(period_vs_period) Historical Data Persistence

- 현재: period_vs_period 모드는 입력은 가능하나, 과거 시점 데이터가 저장되어 있지 않으면 실시간 재분석
- 필요: 분석 결과를 타임스탬프와 함께 DB에 저장하여 과거 분석 결과를 즉시 조회할 수 있도록 구현
- 관련 테이블: `intelligence_analysis_snapshot` (신규 필요)

### 2.4 저장된 키워드 / 최근 키워드 DB 연동

- 현재: 키워드 입력은 텍스트 필드 직접 입력만 지원
- 필요:
  - 최근 분석한 키워드 이력 저장 및 드롭다운 표시
  - 자주 사용하는 키워드 즐겨찾기 기능
  - 팀 단위 키워드 공유

### 2.5 태블릿 중간 레이아웃 최적화

- 현재: 기본적인 2-column 레이아웃 적용
- 필요:
  - 비교 페이지의 Side-by-side 레이아웃이 태블릿에서 좁아지는 문제 해결
  - ActionDeltaPanel 4분할이 태블릿에서 2분할로 전환되는 반응형 처리
  - 터치 제스처 기반 탭 전환 (swipe)

### 2.6 IntelligenceRouteViewModelAssembler 별도 분리

- 현재: page.tsx 내부에서 API 응답 → UI ViewModel 변환 로직이 인라인으로 존재
- 필요: ViewModelAssembler를 별도 파일로 분리하여 테스트 가능성 확보
- 대상 파일: `apps/web/src/assemblers/intelligence-route.assembler.ts` (신규)

---

## 3. 다음 단계 준비

### 3.1 실제 소셜 API 연결

- 각 provider별 API 키/OAuth 설정을 환경변수로 관리
- API rate limit에 대응하는 큐잉/백오프 전략 설계
- provider별 데이터 정규화 로직 구현 (각 플랫폼의 응답 형식이 다름)
- 연결 상태 모니터링 대시보드 (admin 전용)

### 3.2 분석 결과 저장 / 이력 관리

- `intelligence_analysis_snapshot` 테이블 설계:
  - id, teamId, seedKeyword, industryType, period, fusionResult (JSON), analyzedAt
- 분석 완료 시 자동 저장
- 이력 목록 조회 API (`intelligence.history` query 추가)
- 이전 분석 결과와 현재 결과 비교 (period_vs_period 자동 지원)

### 3.3 알림 연동

- BuzzLevel이 VIRAL 또는 HIGH로 급상승 시 알림 트리거
- DifferenceLevel CRITICAL 항목 발생 시 알림 트리거
- 알림 채널: 인앱 알림, 이메일 (Slack 등 외부 연동은 추후)
- 알림 설정: 키워드별 알림 on/off, 임계값 커스터마이징

---

## 4. 파일 경로 요약

```
packages/api/src/
├── services/intelligence/
│   ├── intelligence-comparison.service.ts    ← 신규
│   └── live-social-mention-bridge.service.ts ← 신규
├── routers/
│   └── intelligence.ts                       ← 신규
└── root.ts                                   ← 수정 (라우터 등록)

apps/web/src/
├── app/(dashboard)/intelligence/
│   ├── page.tsx                              ← 신규
│   └── compare/
│       └── page.tsx                          ← 신규
└── components/intelligence/
    └── LiveMentionStatusPanel.tsx            ← 신규
```

---

## 5. 관련 문서

- [INTELLIGENCE_ROUTE_ARCHITECTURE.md](./INTELLIGENCE_ROUTE_ARCHITECTURE.md)
- [LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md](./LIVE_SOCIAL_MENTION_RUNTIME_SPEC.md)
- [INTELLIGENCE_AB_COMPARISON_SPEC.md](./INTELLIGENCE_AB_COMPARISON_SPEC.md)
- [INTELLIGENCE_UI_ARCHITECTURE.md](./INTELLIGENCE_UI_ARCHITECTURE.md)
- [INTELLIGENCE_UI_IMPLEMENTATION_NOTES.md](./INTELLIGENCE_UI_IMPLEMENTATION_NOTES.md)
