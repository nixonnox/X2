# 문서 일관성 감사 보고서 (Document Consistency Audit)

> **프로젝트**: X2 소셜 미디어 분석 플랫폼
> **감사 일자**: 2026-03-12
> **감사 범위**: `docs/v3/` 내 전체 문서 (40건)
> **발견 건수**: 12건 (S1: 5건, S2: 4건, S3: 3건)

---

## 요약 테이블

| ID      | 심각도 | 제목                           | 영향 받는 문서 수 | 상태   |
| ------- | ------ | ------------------------------ | ----------------- | ------ |
| DCA-001 | S1     | Phase 범위 중복 및 모순        | 6                 | 미해결 |
| DCA-002 | S1     | 분석 관련 용어 불일치          | 3                 | 미해결 |
| DCA-003 | S1     | 분석 엔진 수량 불일치          | 2                 | 미해결 |
| DCA-004 | S1     | 수집 아키텍처 범위 불일치      | 2                 | 미해결 |
| DCA-005 | S1     | 자동화 준비 상태 불일치        | 2                 | 미해결 |
| DCA-006 | S2     | 데이터 모델 정합성 불일치      | 2                 | 미해결 |
| DCA-007 | S2     | Repository-Service 매핑 불일치 | 1                 | 미해결 |
| DCA-008 | S2     | 화면 흐름 문서 정확도 미달     | 1                 | 미해결 |
| DCA-009 | S2     | 마이그레이션 전략 문서 노후화  | 1                 | 미해결 |
| DCA-010 | S3     | ERD 문서 간 구조 괴리          | 2                 | 미해결 |
| DCA-011 | S3     | Phase 구현 노트 형식 불일치    | 6                 | 미해결 |
| DCA-012 | S3     | 중복 정보 및 상충 결론         | 2                 | 미해결 |

---

## 심각도 분류 기준

| 등급 | 명칭     | 정의                                                 |
| ---- | -------- | ---------------------------------------------------- |
| S0   | Blocker  | 즉시 작업 중단이 필요한 수준의 오류                  |
| S1   | Critical | 개발/운영 판단에 직접적 오류를 유발할 수 있는 불일치 |
| S2   | High     | 구현 시 혼선을 초래할 수 있는 불일치                 |
| S3   | Medium   | 문서 품질 저하를 유발하지만 즉각적 위험은 낮음       |
| S4   | Low      | 서식, 오탈자 등 경미한 사항                          |

---

## 상세 감사 결과

---

### DCA-001: Phase 범위 중복 및 모순

| 항목          | 내용                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**    | S1 (Critical)                                                                                                                                                                                               |
| **분류**      | 범위 정의                                                                                                                                                                                                   |
| **영향 문서** | `PHASE5_IMPLEMENTATION_NOTES.md`, `PHASE6_IMPLEMENTATION_NOTES.md`, `PHASE7_IMPLEMENTATION_NOTES.md`, `PHASE8_IMPLEMENTATION_NOTES.md`, `PHASE9_IMPLEMENTATION_NOTES.md`, `PHASE10_IMPLEMENTATION_NOTES.md` |

**설명**

Phase 문서 간에 소유권(ownership)이 중복 정의되어 있다. 대표적으로 Phase 5에서 분석 엔진(Analytics Engine)을 자체 범위로 명시하고 있으나, Phase 7에서도 동일한 분석 엔진을 구현 범위로 주장하고 있다. 이로 인해 어느 Phase에서 해당 기능의 구현 책임을 지는지 판단할 수 없다.

**영향**

- 개발 일정 산정 시 동일 작업이 이중 계상될 수 있음
- Phase 간 의존성 판단 오류 발생 가능
- 담당자 배정 시 혼선 발생

**권고 조치**

1. 각 Phase 문서의 범위(Scope) 섹션을 통합 검토하여 단일 소유권 원칙(Single Ownership)을 적용
2. Phase 간 경계가 모호한 항목에 대해 RACI 매트릭스 작성
3. 통합 Phase 범위 매트릭스 문서를 별도 작성하여 각 Phase 문서에서 참조하도록 구조 변경

---

### DCA-002: 분석 관련 용어 불일치

| 항목          | 내용                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| **심각도**    | S1 (Critical)                                                                               |
| **분류**      | 용어 표준화                                                                                 |
| **영향 문서** | `ANALYTICS_ENGINE_MAP.md`, `INSIGHT_ACTION_REPORT_FLOW.md`, `ROLE_BASED_OUTPUT_STRATEGY.md` |

**설명**

동일한 개념에 대해 문서별로 다른 용어를 사용하고 있다:

| 문서                            | 사용 용어      |
| ------------------------------- | -------------- |
| `ANALYTICS_ENGINE_MAP.md`       | "Engine"       |
| `INSIGHT_ACTION_REPORT_FLOW.md` | "Insight"      |
| `ROLE_BASED_OUTPUT_STRATEGY.md` | "Intelligence" |

또한 한국어 "분석"과 영문 "Analytics", "Intelligence", "Insight"가 혼용되어, 동일 기능을 지칭하는지 별개 기능을 지칭하는지 판단이 불가능하다.

**영향**

- 신규 참여 개발자가 문서를 읽을 때 동일 개념을 별개 시스템으로 오인할 위험
- 코드 네이밍과 문서 용어 간 추적성(traceability) 상실
- 요구사항 검증(verification) 시 매핑 불가

**권고 조치**

1. 용어 사전(Glossary) 문서를 작성하여 각 용어의 정의와 동의어 관계를 명확히 정리
2. 모든 v3 문서에 대해 합의된 용어로 일괄 치환
3. 한국어/영어 병기 규칙 수립 (예: "분석 엔진(Analytics Engine)")

---

### DCA-003: 분석 엔진 수량 불일치

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **심각도**    | S1 (Critical)                                               |
| **분류**      | 사실 정합성                                                 |
| **영향 문서** | `ANALYTICS_ENGINE_MAP.md`, `PHASE7_IMPLEMENTATION_NOTES.md` |

**설명**

`ANALYTICS_ENGINE_MAP.md`에서는 분석 엔진을 8개로 정의하고 있으나, `PHASE7_IMPLEMENTATION_NOTES.md`에서는 추가 엔진을 언급하여 총 수가 10개로 늘어난다. 어느 쪽이 최신 정보인지 명시되어 있지 않으며, 추가된 2개 엔진의 사양도 `ANALYTICS_ENGINE_MAP.md`에 반영되어 있지 않다.

**영향**

- 엔진별 입출력 스키마(`ENGINE_INPUT_OUTPUT_SCHEMA.md`) 정합성 파괴
- 테스트 커버리지 산정 오류
- 성능/스케일링 계획(`PERFORMANCE_AND_SCALING_NOTES.md`)에 누락된 엔진이 반영되지 않을 위험

**권고 조치**

1. 엔진 목록을 `ANALYTICS_ENGINE_MAP.md`에 단일 정의(Single Source of Truth)로 통합
2. Phase 7에서 추가된 엔진이 확정 사항인지 검토 후, 확정 시 MAP 문서에 반영
3. `ENGINE_INPUT_OUTPUT_SCHEMA.md` 및 관련 문서 동기화

---

### DCA-004: 수집 아키텍처 범위 불일치

| 항목          | 내용                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| **심각도**    | S1 (Critical)                                                                |
| **분류**      | 사실 정합성                                                                  |
| **영향 문서** | `REAL_COLLECTION_CONNECTION_STATUS.md`, `REAL_DATA_PIPELINE_ARCHITECTURE.md` |

**설명**

`REAL_COLLECTION_CONNECTION_STATUS.md`에서는 YouTube만 프로덕션 준비(production-ready) 상태라고 명시하고 있으나, `REAL_DATA_PIPELINE_ARCHITECTURE.md`에서는 멀티 플랫폼이 준비된 것처럼 기술하고 있다. 두 문서가 동일 시점의 상태를 기술하는지, 현재(as-is)와 목표(to-be)를 각각 기술하는지 구분이 되어 있지 않다.

**영향**

- 출시 판단(Launch Decision) 시 잘못된 전제에 기반한 의사결정 위험
- `LAUNCH_READINESS_CHECKLIST.md`의 판정 기준과 충돌
- 운영팀이 실제 지원 가능 플랫폼을 오인할 수 있음

**권고 조치**

1. 각 문서에 기술 시점(as-is / to-be)을 명시적으로 표기
2. `REAL_COLLECTION_CONNECTION_STATUS.md`를 현재 상태의 단일 정보원으로 지정
3. 파이프라인 아키텍처 문서에서는 현재 상태를 참조하고, 목표 아키텍처를 별도 섹션으로 분리

---

### DCA-005: 자동화 준비 상태 불일치

| 항목          | 내용                                                          |
| ------------- | ------------------------------------------------------------- |
| **심각도**    | S1 (Critical)                                                 |
| **분류**      | 코드-문서 정합성                                              |
| **영향 문서** | `AUTOMATION_ARCHITECTURE.md`, `LAUNCH_READINESS_CHECKLIST.md` |

**설명**

`AUTOMATION_ARCHITECTURE.md`에서는 EMAIL 및 WEBHOOK 전달(delivery) 기능이 준비 완료된 것으로 기술하고 있으나, 실제 코드(`packages/api/src/services/automation/`)에서는 placeholder 수준의 구현만 존재한다. `LAUNCH_READINESS_CHECKLIST.md`에서는 자동화를 "부분 준비(partially ready)"로 표기하고 있으나, 구체적으로 어떤 부분이 미완인지 명시하지 않았다.

**영향**

- 문서를 신뢰하고 자동화 기능을 출시할 경우 장애 발생
- QA 팀이 테스트 범위를 잘못 산정할 수 있음
- 이해관계자에게 잘못된 진척 상황 보고

**권고 조치**

1. `AUTOMATION_ARCHITECTURE.md`에 각 전달 채널의 구현 상태를 정확히 반영 (Ready / Stub / Not Started)
2. `LAUNCH_READINESS_CHECKLIST.md`의 자동화 항목에 세부 체크리스트 추가
3. 코드 내 placeholder에 `// TODO` 또는 `@NotImplemented` 어노테이션을 일관되게 적용

---

### DCA-006: 데이터 모델 정합성 불일치

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **심각도**    | S2 (High)                                      |
| **분류**      | 코드-문서 정합성                               |
| **영향 문서** | `CORE_DATA_MODEL.md`, `PRISMA_SCHEMA_DRAFT.md` |

**설명**

실제 `packages/db/prisma/schema.prisma`는 50개 모델, 48개 enum, 1,902줄 규모이나, `CORE_DATA_MODEL.md`와 `PRISMA_SCHEMA_DRAFT.md`에서 기술하는 모델 목록이 이와 일치하지 않는다. 문서에 존재하지만 스키마에 없는 모델, 스키마에 존재하지만 문서에 없는 모델이 각각 존재한다.

**영향**

- 신규 개발자가 문서 기반으로 데이터 모델을 이해할 경우 실제 구조와 불일치
- 마이그레이션 계획 수립 시 누락 또는 잘못된 전제 발생
- API 엔드포인트 설계 시 존재하지 않는 모델을 참조할 위험

**권고 조치**

1. `schema.prisma`에서 모델/enum 목록을 자동 추출하여 문서와 대조하는 스크립트 작성
2. `CORE_DATA_MODEL.md`를 실제 스키마 기준으로 갱신
3. `PRISMA_SCHEMA_DRAFT.md`는 초안(draft) 문서이므로, 확정 후 `CORE_DATA_MODEL.md`로 통합하거나 아카이브 처리

---

### DCA-007: Repository-Service 매핑 불일치

| 항목          | 내용                        |
| ------------- | --------------------------- |
| **심각도**    | S2 (High)                   |
| **분류**      | 코드-문서 정합성            |
| **영향 문서** | `REPOSITORY_SERVICE_MAP.md` |

**설명**

`REPOSITORY_SERVICE_MAP.md`에서 나열하는 서비스 목록이 실제 서비스 컨테이너에서 인스턴스화되는 47개 서비스와 일치하지 않는다. 문서에 기재된 커버리지 수치도 실제와 다르다.

**영향**

- 의존성 분석(dependency analysis) 시 누락 발생
- 서비스 간 호출 관계 파악 오류
- 리팩토링 계획(`BACKEND_REFACTOR_SEQUENCE.md`) 수립 시 잘못된 전제

**권고 조치**

1. 서비스 컨테이너 초기화 코드에서 등록된 서비스 목록을 자동 추출
2. 문서의 서비스 목록과 대조하여 누락/추가 항목 식별
3. 커버리지 수치를 자동 계산 기반으로 갱신

---

### DCA-008: 화면 흐름 문서 정확도 미달

| 항목          | 내용                           |
| ------------- | ------------------------------ |
| **심각도**    | S2 (High)                      |
| **분류**      | 코드-문서 정합성               |
| **영향 문서** | `SCREEN_FLOW_AND_ENTRY_MAP.md` |

**설명**

`SCREEN_FLOW_AND_ENTRY_MAP.md`에서 기술하는 화면 및 흐름 중 실제 코드베이스 UI(`apps/web/src/`)에 존재하지 않는 항목이 포함되어 있다. 반대로, 실제 구현된 페이지 중 문서에 기재되지 않은 항목도 존재한다.

**영향**

- UX/UI 검토 시 존재하지 않는 화면을 기준으로 피드백이 이루어질 수 있음
- 테스트 시나리오 작성 시 실제 존재하지 않는 경로를 포함하게 됨
- 신규 화면 추가 시 기존 흐름과의 관계를 파악하기 어려움

**권고 조치**

1. `apps/web/src/app/` 디렉토리의 라우트 구조와 문서를 대조
2. 미구현 화면은 "(미구현)" 또는 "(Planned)" 태그 부착
3. 문서 미등록 화면을 식별하여 추가

---

### DCA-009: 마이그레이션 전략 문서 노후화

| 항목          | 내용                    |
| ------------- | ----------------------- |
| **심각도**    | S2 (High)               |
| **분류**      | 문서 유효성             |
| **영향 문서** | `MIGRATION_STRATEGY.md` |

**설명**

`MIGRATION_STRATEGY.md`에 기재된 마이그레이션 단계 중 이미 완료되었거나 더 이상 유효하지 않은 항목이 포함되어 있다. 현재 시점에서 어떤 단계가 유효한지 판단하기 어렵다.

**영향**

- 마이그레이션 실행 시 불필요한 단계를 수행하거나 필요한 단계를 건너뛸 위험
- `MIGRATION_PRECHECK_FINAL.md`, `MIGRATION_RISK_CHECKLIST.md`와의 정합성 저하

**권고 조치**

1. 각 마이그레이션 단계에 상태 표기 추가 (완료 / 진행 중 / 대기 / 폐기)
2. 완료된 단계는 완료 일자와 결과 요약을 기재
3. `MIGRATION_PRECHECK_FINAL.md`와 동기화

---

### DCA-010: ERD 문서 간 구조 괴리

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **심각도**    | S3 (Medium)                                    |
| **분류**      | 문서 정합성                                    |
| **영향 문서** | `ERD_OVERVIEW.md`, `ERD_EXPANDED_BLUEPRINT.md` |

**설명**

`ERD_OVERVIEW.md`와 `ERD_EXPANDED_BLUEPRINT.md`에서 동일 엔티티에 대해 서로 다른 관계(relationship) 구조를 표현하고 있다. 개요 문서가 간략화된 버전이라 하더라도, 관계의 방향이나 카디널리티가 달라서는 안 된다.

**영향**

- 데이터 모델 이해 시 혼선
- 스키마 변경 검토 시 잘못된 참조

**권고 조치**

1. `ERD_EXPANDED_BLUEPRINT.md`를 정본(canonical)으로 지정
2. `ERD_OVERVIEW.md`는 정본의 간략 버전으로 재작성하되, 관계 방향과 카디널리티는 동일하게 유지
3. 두 문서 간 마지막 동기화 일자를 명시

---

### DCA-011: Phase 구현 노트 형식 불일치

| 항목          | 내용                                                                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **심각도**    | S3 (Medium)                                                                                                                                                                                                 |
| **분류**      | 문서 표준화                                                                                                                                                                                                 |
| **영향 문서** | `PHASE5_IMPLEMENTATION_NOTES.md`, `PHASE6_IMPLEMENTATION_NOTES.md`, `PHASE7_IMPLEMENTATION_NOTES.md`, `PHASE8_IMPLEMENTATION_NOTES.md`, `PHASE9_IMPLEMENTATION_NOTES.md`, `PHASE10_IMPLEMENTATION_NOTES.md` |

**설명**

Phase 5~10의 구현 노트가 각각 다른 형식과 상세 수준으로 작성되어 있다. 일부는 상세한 기술 사양을 포함하고, 일부는 개조식 요약만 포함한다. 공통 템플릿이 적용되지 않았다.

**영향**

- Phase 간 진척도 비교가 어려움
- 문서 검색 및 참조 효율 저하

**권고 조치**

1. Phase 구현 노트 공통 템플릿 정의 (범위, 주요 변경사항, 의존성, 잔여 작업, 리스크)
2. 기존 문서를 템플릿에 맞추어 재구성

---

### DCA-012: 중복 정보 및 상충 결론

| 항목          | 내용                                                              |
| ------------- | ----------------------------------------------------------------- |
| **심각도**    | S3 (Medium)                                                       |
| **분류**      | 문서 구조                                                         |
| **영향 문서** | `SECURITY_AND_ACCESS_REVIEW.md`, `PRODUCTION_HARDENING_REPORT.md` |

**설명**

보안 관련 내용이 두 문서에 중복 기술되어 있으며, 일부 항목에 대해 서로 다른 결론을 내리고 있다. 예를 들어, 특정 보안 조치의 적용 여부에 대해 한 문서에서는 "적용 완료", 다른 문서에서는 "미적용"으로 기재할 수 있는 구조적 위험이 존재한다.

**영향**

- 보안 감사(security audit) 시 혼선
- 프로덕션 배포 체크리스트 신뢰도 저하

**권고 조치**

1. 보안 관련 사항은 `SECURITY_AND_ACCESS_REVIEW.md`를 단일 정보원으로 지정
2. `PRODUCTION_HARDENING_REPORT.md`에서는 보안 섹션을 참조 링크로 대체
3. 상충하는 결론에 대해 실제 코드 기준으로 정오 확인 후 통일

---

## 문서 간 상호 참조 매트릭스

아래 매트릭스는 이번 감사에서 확인된 충돌 관계를 표시한다.
`X` = 직접 충돌, `~` = 간접 영향, `-` = 관련 없음

|              | PHASE5 | PHASE7 | AE_MAP | INSIGHT | ROLE_OUT | COLLECT | PIPELINE | AUTO | LAUNCH | CORE_DM | PRISMA_D | REPO_SVC | SCREEN | MIGRA | ERD_O | ERD_E | SECURITY | PROD_H |
| ------------ | ------ | ------ | ------ | ------- | -------- | ------- | -------- | ---- | ------ | ------- | -------- | -------- | ------ | ----- | ----- | ----- | -------- | ------ |
| **PHASE5**   | -      | X      | ~      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **PHASE7**   | X      | -      | X      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **AE_MAP**   | ~      | X      | -      | X       | X        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **INSIGHT**  | -      | -      | X      | -       | ~        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **ROLE_OUT** | -      | -      | X      | ~       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **COLLECT**  | -      | -      | -      | -       | -        | -       | X        | -    | ~      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **PIPELINE** | -      | -      | -      | -       | -        | X       | -        | -    | ~      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **AUTO**     | -      | -      | -      | -       | -        | -       | -        | -    | X      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **LAUNCH**   | -      | -      | -      | -       | -        | ~       | ~        | X    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **CORE_DM**  | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | X        | -        | -      | -     | ~     | ~     | -        | -      |
| **PRISMA_D** | -      | -      | -      | -       | -        | -       | -        | -    | -      | X       | -        | -        | -      | -     | ~     | ~     | -        | -      |
| **REPO_SVC** | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **SCREEN**   | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **MIGRA**    | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | -      |
| **ERD_O**    | -      | -      | -      | -       | -        | -       | -        | -    | -      | ~       | ~        | -        | -      | -     | -     | X     | -        | -      |
| **ERD_E**    | -      | -      | -      | -       | -        | -       | -        | -    | -      | ~       | ~        | -        | -      | -     | X     | -     | -        | -      |
| **SECURITY** | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | -        | X      |
| **PROD_H**   | -      | -      | -      | -       | -        | -       | -        | -    | -      | -       | -        | -        | -      | -     | -     | -     | X        | -      |

### 매트릭스 약어 범례

| 약어     | 문서명                                 |
| -------- | -------------------------------------- |
| PHASE5   | `PHASE5_IMPLEMENTATION_NOTES.md`       |
| PHASE7   | `PHASE7_IMPLEMENTATION_NOTES.md`       |
| AE_MAP   | `ANALYTICS_ENGINE_MAP.md`              |
| INSIGHT  | `INSIGHT_ACTION_REPORT_FLOW.md`        |
| ROLE_OUT | `ROLE_BASED_OUTPUT_STRATEGY.md`        |
| COLLECT  | `REAL_COLLECTION_CONNECTION_STATUS.md` |
| PIPELINE | `REAL_DATA_PIPELINE_ARCHITECTURE.md`   |
| AUTO     | `AUTOMATION_ARCHITECTURE.md`           |
| LAUNCH   | `LAUNCH_READINESS_CHECKLIST.md`        |
| CORE_DM  | `CORE_DATA_MODEL.md`                   |
| PRISMA_D | `PRISMA_SCHEMA_DRAFT.md`               |
| REPO_SVC | `REPOSITORY_SERVICE_MAP.md`            |
| SCREEN   | `SCREEN_FLOW_AND_ENTRY_MAP.md`         |
| MIGRA    | `MIGRATION_STRATEGY.md`                |
| ERD_O    | `ERD_OVERVIEW.md`                      |
| ERD_E    | `ERD_EXPANDED_BLUEPRINT.md`            |
| SECURITY | `SECURITY_AND_ACCESS_REVIEW.md`        |
| PROD_H   | `PRODUCTION_HARDENING_REPORT.md`       |

---

## 종합 권고사항

### 즉시 조치 (S1 항목)

1. **단일 정보원(Single Source of Truth) 원칙 수립**: 각 도메인별로 정본 문서를 지정하고, 나머지 문서에서는 참조만 허용
2. **용어 사전(Glossary) 작성**: 한/영 대조 용어 사전을 작성하여 모든 문서에서 일관된 용어 사용 강제
3. **코드-문서 동기화 프로세스 도입**: 자동화 상태, 수집 상태 등 코드 상태와 문서 기술이 괴리되는 항목에 대해 CI 단계에서 검증하는 체계 검토

### 중기 조치 (S2 항목)

4. **스키마-문서 자동 대조 스크립트 구축**: `schema.prisma` 변경 시 `CORE_DATA_MODEL.md` 갱신 여부를 자동 확인
5. **라우트-문서 자동 대조**: `apps/web/src/app/` 라우트 구조와 `SCREEN_FLOW_AND_ENTRY_MAP.md`의 자동 비교
6. **노후 문서 아카이브 정책**: 유효 기간이 지난 문서는 아카이브 디렉토리로 이동

### 장기 개선 (S3 항목)

7. **문서 템플릿 표준화**: Phase 노트 등 시리즈 문서에 공통 템플릿 적용
8. **중복 제거 및 참조 구조화**: 동일 주제를 다루는 문서 간 역할을 명확히 구분

---

> **다음 감사 예정**: 권고 조치 이행 후 2주 내 후속 감사 실시
