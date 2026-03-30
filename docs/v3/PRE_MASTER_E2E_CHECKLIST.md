# PRE_MASTER_E2E_CHECKLIST

개발 서버(`pnpm dev`) 실행 후 수동으로 확인해야 하는 항목 목록.
모든 항목을 순서대로 확인하고, 통과 여부를 체크한다.

사전 조건:
- PostgreSQL 실행 중 (localhost:5432)
- `prisma db push` 완료
- `pnpm dev` 실행 중 (http://localhost:4020)

---

## A. Intelligence 저장/조회

Intelligence 페이지에서 키워드 분석의 전체 흐름을 확인한다.

- [ ] `/intelligence`에 접속한다
- [ ] 키워드 입력 필드에 테스트 키워드를 입력한다 (예: "AI 트렌드")
- [ ] "분석" 버튼을 클릭한다
- [ ] 분석 진행 중 로딩 상태가 표시되는지 확인한다
- [ ] 분석 완료 후 결과가 정상적으로 표시되는지 확인한다
- [ ] 결과에 감성 분석, 키워드 빈도 등의 데이터가 포함되는지 확인한다
- [ ] "트렌드" 탭을 클릭한다
- [ ] BenchmarkTrendChart가 렌더링되는지 확인한다
- [ ] 첫 분석의 경우 "데이터가 없습니다" 메시지가 표시되는 것은 정상이다
- [ ] 같은 키워드로 다시 "분석"을 클릭한다
- [ ] history에 2건이 누적되는지 확인한다
- [ ] 페이지를 새로고침한다 (F5 또는 Ctrl+R)
- [ ] 최근 키워드 패널에 이전 분석 기록이 표시되는지 확인한다
- [ ] 기록을 클릭하면 해당 분석 결과로 이동하는지 확인한다

### 예상 문제와 대응

| 증상 | 원인 | 대응 |
|------|------|------|
| 분석 버튼 클릭 후 무한 로딩 | API 라우트 오류 | 브라우저 Console + 서버 로그 확인 |
| 결과가 비어 있음 | YouTube API 키 미설정 | .env.local에 YOUTUBE_API_KEY 추가 |
| 새로고침 후 기록 사라짐 | DB 연결 실패 | DATABASE_URL 확인, pg_isready 실행 |

---

## B. Notifications/Alerts

분석 완료 후 알림이 정상적으로 생성되고 관리되는지 확인한다.

- [ ] 키워드 분석을 한 건 실행한다
- [ ] 분석 완료 후 헤더의 Bell 아이콘을 확인한다
- [ ] unread 배지(숫자)가 표시되는지 확인한다
  - LOW_CONFIDENCE 또는 PROVIDER_COVERAGE_LOW 조건에 해당할 때만 생성됨
  - 조건에 해당하지 않으면 알림이 생성되지 않는 것이 정상
- [ ] Bell 아이콘을 클릭한다
- [ ] 드롭다운에 알림 목록이 표시되는지 확인한다
- [ ] 개별 알림 항목을 클릭한다
- [ ] 읽음 처리가 되는지 확인한다 (배지 숫자 감소)
- [ ] deep-link로 관련 페이지 이동이 되는지 확인한다
- [ ] `/notifications` 페이지로 이동한다
- [ ] 전체 알림 목록이 표시되는지 확인한다
- [ ] 읽음/안읽음 필터가 동작하는지 확인한다
- [ ] "모두 읽음 처리" 버튼을 클릭한다
- [ ] Bell 아이콘의 배지가 사라지는지 확인한다
- [ ] 다시 분석을 실행하여 새 알림이 생성되는지 확인한다

### 알림 조건 참고

알림은 다음 조건에서 생성된다:
- `LOW_CONFIDENCE`: 분석 신뢰도가 threshold 미만일 때
- `PROVIDER_COVERAGE_LOW`: 소셜 provider 커버리지가 부족할 때

---

## C. Keyword History

키워드 저장 및 북마크 기능을 확인한다.

- [ ] 키워드 분석을 실행한다
- [ ] 대시보드로 이동한다
- [ ] Intelligence 카드에 방금 분석한 키워드가 표시되는지 확인한다
- [ ] 키워드 옆의 star(별) 아이콘을 클릭한다
- [ ] 북마크가 토글되는지 확인한다 (별 채워짐/비워짐)
- [ ] 페이지 새로고침 후에도 북마크 상태가 유지되는지 확인한다
- [ ] `/intelligence` 페이지로 이동한다
- [ ] quick keyword 버튼 목록이 표시되는지 확인한다
- [ ] quick keyword가 DB에서 로드되는지 확인한다
  - 새로고침 후에도 동일한 목록이 표시되어야 함
- [ ] quick keyword 클릭 시 해당 키워드로 분석이 시작되는지 확인한다

---

## D. Social Provider

소셜 미디어 provider 연결 상태와 데이터 수집을 확인한다.

- [ ] `/intelligence`에서 키워드 분석을 실행한다
- [ ] 결과에서 liveMentions 탭을 확인한다
- [ ] 소셜 미디어 언급 데이터가 표시되는지 확인한다
- [ ] YouTube provider 상태를 확인한다:
  - API 키가 설정된 경우: `CONNECTED` 표시
  - API 키가 미설정인 경우: `NOT_CONNECTED` 표시
- [ ] providerCoverage 정보를 확인한다
- [ ] isPartial 배지가 조건에 맞게 표시되는지 확인한다
  - 일부 provider만 연결된 경우 partial로 표시됨
- [ ] 각 provider별 데이터 건수가 표시되는지 확인한다

### Provider 상태별 예상 동작

| Provider | 키 설정 | 상태 | 데이터 |
|----------|---------|------|--------|
| YouTube | O | CONNECTED | 실제 데이터 반환 |
| YouTube | X | NOT_CONNECTED | 빈 결과 |
| Instagram | - | NOT_CONNECTED | 미구현 (향후) |
| TikTok | - | NOT_CONNECTED | 미구현 (향후) |
| X | - | NOT_CONNECTED | 미구현 (향후) |

---

## E. Compare/History

분석 결과 비교 기능을 확인한다.

- [ ] 같은 키워드로 최소 2회 이상 분석을 실행한다
- [ ] `/intelligence/compare` 페이지로 이동한다
- [ ] A/B 비교 실행:
  - 비교할 두 분석 결과를 선택한다
  - "비교" 버튼을 클릭한다
  - 비교 결과가 표시되는지 확인한다
- [ ] period_vs_period 비교를 시도한다
  - 데이터가 부족한 경우 경고 메시지가 표시되는지 확인한다
  - 메시지 내용이 적절한지 확인한다
- [ ] currentVsPrevious 비교를 시도한다
  - 최신 분석과 이전 분석의 차이가 표시되는지 확인한다
  - 수치 변화(증가/감소)가 시각적으로 구분되는지 확인한다
- [ ] 비교 결과에서 주요 지표가 모두 포함되는지 확인한다

---

## F. Alert Stability

알림 시스템의 안정성과 제한 기능을 확인한다.

### Cooldown 테스트

- [ ] 동일 키워드로 빠르게 연속 분석을 실행한다 (3~5회)
- [ ] 브라우저 개발자 도구 Console을 확인한다
- [ ] cooldown에 의해 중복 알림이 방지되는지 확인한다
- [ ] `console.info` 로그에 cooldown 관련 메시지가 출력되는지 확인한다
- [ ] 첫 분석에서만 알림이 생성되고 이후는 억제되는지 확인한다

### Daily Cap 테스트

- [ ] 20회 이상 분석을 실행한다 (다양한 키워드 사용)
- [ ] maxAlertsPerDay 한도에 도달하는지 확인한다
- [ ] `console.info` 로그에 daily cap 관련 메시지가 출력되는지 확인한다
- [ ] cap 도달 후 추가 알림이 생성되지 않는지 확인한다
- [ ] dailyCapped 플래그가 반환되는지 확인한다

### 확인 포인트

| 항목 | 기대 동작 | 로그 위치 |
|------|-----------|-----------|
| cooldown | 동일 키워드 중복 알림 방지 | console.info |
| maxAlertsPerDay | 일일 한도 초과 시 알림 중단 | console.info |
| remainingDailyCap | 루프 내 감소 + break | 서버 로그 |

---

## G. Settings

알림 설정 변경 및 적용을 확인한다.

- [ ] `/settings/notifications` 페이지로 이동한다
- [ ] 현재 알림 설정이 표시되는지 확인한다
- [ ] threshold 값을 변경한다
  - 예: LOW_CONFIDENCE threshold를 0.8에서 0.5로 변경
- [ ] "저장" 버튼을 클릭한다
- [ ] 저장 성공 메시지가 표시되는지 확인한다
- [ ] 키워드 분석을 실행한다
- [ ] 변경된 threshold 기준이 적용되는지 확인한다
  - threshold를 낮추면 알림이 덜 발생해야 함
  - threshold를 높이면 알림이 더 자주 발생해야 함
- [ ] 설정 페이지를 새로고침하여 저장된 값이 유지되는지 확인한다
- [ ] maxAlertsPerDay 값을 변경하고 저장한다
- [ ] 변경된 daily cap이 적용되는지 확인한다

---

## 체크리스트 완료 기준

모든 섹션(A~G)의 항목이 통과하면 E2E 검증 완료로 판단한다.

실패한 항목이 있는 경우:
1. 해당 항목의 예상 문제 표를 참고한다
2. 브라우저 Console과 서버 로그를 함께 확인한다
3. DB 연결 상태를 재확인한다
4. 문제를 해결한 후 해당 섹션을 재검증한다
