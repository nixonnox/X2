# High-Risk Items Register (Phase 10)

## Blocker (출시 전 반드시 해결)

### RISK-001: 대시보드 Mock 데이터 프로덕션 노출 ✅ 해결됨

| 항목                | 내용                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Risk**            | 대시보드 KPI, 댓글 분석, 경쟁사 비교 등이 Mock 데이터를 프로덕션 경로에서 직접 사용 |
| **Impact**          | 사용자에게 허위 데이터 표시, 신뢰도 치명적 손상                                     |
| **Severity**        | CRITICAL                                                                            |
| **Mitigation**      | ✅ DemoBanner 컴포넌트를 대시보드/댓글/경쟁사 페이지에 추가                         |
| **Launch Decision** | **해결됨** — "데모 데이터" 배너 표시 완료                                           |

### RISK-002: 이메일 발송 기능 미동작

| 항목                | 내용                                                        |
| ------------------- | ----------------------------------------------------------- |
| **Risk**            | `MockEmailProvider`만 존재하여 리포트/알림 이메일 발송 불가 |
| **Impact**          | 자동화 발송 기능 완전 무효                                  |
| **Severity**        | HIGH                                                        |
| **Mitigation**      | SendGrid/Resend 연동 또는 IN_APP 알림 전용으로 제한 오픈    |
| **Launch Decision** | **제한 오픈** — IN_APP 채널만 활성화                        |

---

## 제한 오픈 (기능 범위 축소 후 오픈 가능)

### RISK-003: YouTube 외 플랫폼 수집 불가

| 항목                | 내용                                                          |
| ------------------- | ------------------------------------------------------------- |
| **Risk**            | Instagram, TikTok, X Provider가 스텁 상태                     |
| **Impact**          | 멀티 플랫폼 분석 불가, YouTube 단일 채널만 지원               |
| **Severity**        | HIGH                                                          |
| **Mitigation**      | "YouTube 전용" 으로 명시하고 오픈, 다른 플랫폼 연결 UI 비노출 |
| **Launch Decision** | **제한 오픈** — YouTube 전용으로 Beta                         |

### RISK-004: AI/LLM 분석 미연동

| 항목                | 내용                                                        |
| ------------------- | ----------------------------------------------------------- |
| **Risk**            | Claude Haiku 리스크 분류, GPT 인사이트 생성 등 AI 기능 TODO |
| **Impact**          | 규칙 기반 분석만 동작, 고품질 인사이트 생성 불가            |
| **Severity**        | HIGH                                                        |
| **Mitigation**      | 규칙 기반 분석 결과에 "AI 분석 준비 중" 표시                |
| **Launch Decision** | **제한 오픈** — 규칙 기반 분석으로 Beta                     |

### RISK-005: BullMQ 큐 시스템 미연동

| 항목                | 내용                                                      |
| ------------------- | --------------------------------------------------------- |
| **Risk**            | 비동기 작업 처리 불가 (수집, 분석, 자동화 스케줄)         |
| **Impact**          | 대용량 데이터 처리 시 타임아웃, 스케줄 트리거 미동작      |
| **Severity**        | HIGH                                                      |
| **Mitigation**      | 소량 데이터 동기 처리로 Beta 운영, 스케줄 자동화 비활성화 |
| **Launch Decision** | **제한 오픈** — 수동 트리거만 허용                        |

### RISK-006: AEO 서비스 API 미연동

| 항목                | 내용                                          |
| ------------------- | --------------------------------------------- |
| **Risk**            | `visibilityScore: 0`, `citedSources: []` 반환 |
| **Impact**          | GEO/AEO 분석 기능 완전 무효                   |
| **Severity**        | MEDIUM                                        |
| **Mitigation**      | GEO/AEO 메뉴 비노출 또는 "준비 중" 표시       |
| **Launch Decision** | **제한 오픈** — `geoAeoEnabled: false`        |

### RISK-007: API Rate Limiting 부재 ✅ 해결됨

| 항목                | 내용                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Risk**            | DDoS, 무차별 대입 공격에 취약                                                                    |
| **Impact**          | 서비스 가용성 위협                                                                               |
| **Severity**        | HIGH                                                                                             |
| **Mitigation**      | ✅ Edge middleware에 IP 기반 sliding window rate limiter 추가 (API: 60req/min, Page: 120req/min) |
| **Launch Decision** | **해결됨** — 429 응답 + Retry-After 헤더 반환. 프로덕션 확장 시 @upstash/ratelimit 전환 권장     |

---

## 추후 개선 (출시 후 로드맵)

### RISK-008: 수집/분석 로그 in-memory 저장

| 항목                | 내용                                             |
| ------------------- | ------------------------------------------------ |
| **Risk**            | 서버 재시작 시 로그 유실                         |
| **Impact**          | 장애 원인 분석 불가                              |
| **Severity**        | MEDIUM                                           |
| **Mitigation**      | 출시 후 1개월 내 DB 또는 외부 로그 서비스로 전환 |
| **Launch Decision** | **추후 개선**                                    |

### RISK-009: 전환 단가 하드코딩

| 항목                | 내용                                   |
| ------------------- | -------------------------------------- |
| **Risk**            | 캠페인 ROI/ROAS 지표가 $50 고정값 기준 |
| **Impact**          | 실제 비즈니스 지표와 괴리              |
| **Severity**        | MEDIUM                                 |
| **Mitigation**      | 캠페인 설정에 전환 단가 입력 필드 추가 |
| **Launch Decision** | **추후 개선**                          |

### RISK-010: WebSocket 실시간 알림 미구현

| 항목                | 내용                               |
| ------------------- | ---------------------------------- |
| **Risk**            | IN_APP 알림이 폴링 기반으로만 동작 |
| **Impact**          | 실시간성 부족, 사용자 경험 저하    |
| **Severity**        | LOW                                |
| **Mitigation**      | 페이지 새로고침 시 알림 확인 가능  |
| **Launch Decision** | **추후 개선**                      |
