# X2 v3 — Platform Architecture Documents

> 실서비스(실데이터) 전환을 위한 제품 재설계 문서

---

## 문서 구성

| #   | 문서                                                                    | 내용                                                         |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | [PRODUCT_RESET](./PRODUCT_RESET.md)                                     | 제품 재정의, 핵심 문제, 차별화, 7-Stage Loop, 불변 원칙      |
| 2   | [USER_JOURNEY_3PATHS](./USER_JOURNEY_3PATHS.md)                         | 소셜/리스닝/댓글 3가지 시작점, 싱글 인텔리전스 수렴, 화면 IA |
| 3   | [CORE_DATA_MODEL](./CORE_DATA_MODEL.md)                                 | 핵심 엔티티 목록, 데이터 연결 구조, 용어 사전                |
| 4   | [ERD_OVERVIEW](./ERD_OVERVIEW.md)                                       | 도메인별 상세 ERD, 확장 포인트, Intelligence Graph           |
| 5   | [REAL_DATA_PIPELINE_ARCHITECTURE](./REAL_DATA_PIPELINE_ARCHITECTURE.md) | 수집/정제/저장 파이프라인, API 전략, Mock 원칙               |
| 6   | [ANALYTICS_ENGINE_MAP](./ANALYTICS_ENGINE_MAP.md)                       | 8개 분석 엔진 상세, 입출력, AI 비용 관리                     |
| 7   | [OPS_AND_ADMIN_OVERVIEW](./OPS_AND_ADMIN_OVERVIEW.md)                   | 수집/AI/리포트/플랜 관제, 실패/재시도/알림                   |
| 8   | [CODE_REUSE_AUDIT](./CODE_REUSE_AUDIT.md)                               | 200+ 파일 재사용/폐기 판정, Tier 1~4 분류                    |
| 9   | [BENCHMARK_DNA_MAP](./BENCHMARK_DNA_MAP.md)                             | 6개 벤치마크 DNA → 7-Stage 매핑, Cross-DNA 시너지            |
| 10  | [GEO_AEO_EXTENSION_PLAN](./GEO_AEO_EXTENSION_PLAN.md)                   | Source Registry, Citation Log, AI-friendly 구조, 확장 영역   |

---

## 불변 원칙

1. Mock/Hardcoded 데이터 금지 (Fallback/테스트 전용만 허용)
2. 공식 API 우선, 합법적 공개 범위만 수집
3. GEO/AEO Citation 추적 필수
4. Execute → Measure → Re-Discover 순환 루프 필수
