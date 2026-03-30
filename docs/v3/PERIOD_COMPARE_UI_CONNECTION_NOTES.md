# Period Compare UI Connection Notes

> Date: 2026-03-15
> Status: IMPLEMENTED

## 목적

Compare 페이지의 `period_vs_period` 비교 타입을 실제 DB 이력과 연결하여 기간별 비교를 수행할 수 있도록 한다.

## 변경 사항

### 1. Compare 페이지 입력 UI 개선

- **기간 비교 선택 시:** Side B의 키워드 입력이 Side A와 동일하게 자동 설정
- **날짜 선택기 추가:** 각 Side에 start/end date picker 표시
- **저장된 Run 지원:** URL param으로 `leftRunId`, `rightRunId` 전달 가능
  - 이력 페이지에서 "비교" 클릭 시 자동으로 URL에 runId 포함

### 2. URL Parameters

| Param | 용도 |
|-------|------|
| `keyword` | 초기 키워드 설정 |
| `type` | 비교 유형 (`period_vs_period` 등) |
| `leftRunId` | Side A에 사용할 저장된 run ID |
| `rightRunId` | Side B에 사용할 저장된 run ID |

### 3. 기간 비교 데이터 흐름

```
1. 사용자가 기간 A/B 날짜 선택 (또는 runId 지정)
2. compare mutation 호출 → backend analyzeOne()
3. analyzeOne():
   a. runId가 있으면 → DB에서 저장된 run 로드 (isStaleBased: true)
   b. periodStart/End가 있으면 → DB에서 해당 기간의 최신 run 로드
   c. 둘 다 없으면 → 라이브 분석 실행
4. 비교 결과 반환 + periodDataAvailability 포함
```

### 4. periodDataAvailability 표시

- **양쪽 다 과거 데이터 없음:** 주황 경고 + "양쪽 모두 저장된 과거 데이터가 없습니다"
- **한쪽만 없음:** 주황 경고 + "한쪽의 과거 데이터가 부족합니다. 현재 분석 결과로 대체"
- **양쪽 다 있음:** 파란 정보 + 각 Side의 분석 날짜 표시

### 5. Stale Snapshot 표시

- `metadata.isStaleBased === true`인 Side에 대해 "과거 저장 데이터 (날짜)" 뱃지 표시
- 사용자가 어떤 데이터가 과거 것인지 명확히 인지할 수 있음

## 제한사항

- 기간 내에 분석 기록이 없으면 라이브 분석으로 fallback (warning 표시)
- 날짜 선택 없이 runId만으로도 비교 가능
- Period picker는 native HTML date input 사용 (향후 캘린더 UI로 교체 가능)
