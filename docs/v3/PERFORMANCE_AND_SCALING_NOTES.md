# Performance & Scaling Notes (Phase 10)

## N+1 쿼리 패턴

### ✅ 수정됨

| 위치                                    | 문제                                                | 수정 내용                |
| --------------------------------------- | --------------------------------------------------- | ------------------------ |
| `risk-signal.service.ts:126-133`        | 토픽 루프 내 `findActive(projectId)` 반복 호출      | 루프 밖으로 한 번만 조회 |
| `listening-analysis.service.ts:104-111` | 키워드 루프 내 `findByProject(projectId)` 반복 호출 | 루프 밖으로 한 번만 조회 |

### ⚠️ 미수정

| 위치                                 | 문제                                                        | 권장                                 |
| ------------------------------------ | ----------------------------------------------------------- | ------------------------------------ |
| `reportAutomationService.ts:168-191` | 섹션 생성 루프 내 `reportSection.create` + `attachEvidence` | `createMany` 또는 트랜잭션 일괄 처리 |

---

## 무거운 쿼리 식별

### InsightReport 생성

- `reportAutomationService.ts`: 리포트 생성 시 4개 섹션 × 섹션당 evidence 연결 = 최소 8회 DB 호출
- **권장**: Prisma `$transaction` 으로 일괄 처리

### 자동화 규칙 평가

- `automationOrchestratorService.ts`: 규칙 N개 × (중복체크 + 쿨다운 + 플랜체크) = 최소 3N회 DB 호출
- **권장**: 규칙 수가 50개 이하이므로 현재 수준 허용, 추후 벌크 조회 최적화

### 대시보드 로딩

- 현재 Mock 데이터 사용으로 성능 문제 없음
- tRPC 연결 후 KPI 집계 쿼리 최적화 필요 (materialized view 또는 캐시)

---

## 캐시 가능 영역

| 데이터                 | TTL   | 전략             |
| ---------------------- | ----- | ---------------- |
| 워크스페이스 플랜 정보 | 5분   | in-memory (소량) |
| 대시보드 KPI 집계      | 15분  | Redis            |
| 키워드 트렌드 데이터   | 1시간 | Redis            |
| GEO/AEO 점수           | 6시간 | Redis            |
| 리포트 목록            | 5분   | in-memory        |

---

## Pagination / Lazy Load

- `getExecutionHistory()`: 이미 offset/limit 파라미터 지원
- `getActionsByPriority()`: 날짜 필터만 있고 pagination 없음 → 추가 필요
- `listRules()`: pagination 지원 완료
- 대시보드 댓글 목록: 무한 스크롤 구현 필요

---

## 배치 처리 부하

### 수집 파이프라인

- YouTube API: Rate limiter 적용 (10 req/sec)
- Instagram/TikTok/X: 스텁 상태로 부하 없음
- **권장**: BullMQ 연동 후 동시 수집 워커 수 제한 (concurrency: 3)

### 분석 엔진

- 현재 규칙 기반 동기 실행
- LLM 연동 시 비동기 큐 처리 필수 (응답 시간 3~10초)

### 자동화 실행

- 현재 동기 실행 구조
- **권장**: BullMQ 워커로 비동기 전환, 동시 실행 수 제한

---

## 확장 포인트

1. **Read Replica**: 분석 쿼리를 읽기 전용 복제본으로 라우팅
2. **Connection Pooling**: Prisma connection pool 설정 (기본 5 → 프로덕션 20)
3. **Edge Caching**: 정적 대시보드 데이터 Vercel Edge Cache 활용
4. **Queue Workers**: BullMQ 워커 수평 확장 (채널 수집, 분석, 자동화 분리)
