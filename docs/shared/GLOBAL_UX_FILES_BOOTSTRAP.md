# Global UX Files Bootstrap

> `~/.claude/` 아래에 어떤 파일을 두고, 각각 어떤 역할을 하는지 정리합니다.

---

## 파일 목록

### 1. `ux-global-principles.md`
**역할:** 모든 프로젝트의 UX 기본 원칙

**포함 내용:**
- 한 화면 = 한 핵심 행동 원칙
- CTA 계층 (주/보조/위험)
- 쉬운 말 우선 원칙 + 공통 용어 변환표
- 카드형 선택 우선 원칙
- 정보 구조 원칙 (핵심→이유→근거→세부)
- 상태 UX 원칙 (empty/error/partial/stale/low confidence)
- 버튼/CTA 정책
- 보편 원칙 vs 프로젝트 가변 영역 구분

### 2. `ux-writing-global-guide.md`
**역할:** 모든 제품 문구의 작성 기준

**포함 내용:**
- 톤앤매너 (친근+존중+간결+약한 재치)
- 해요체 원칙
- 능동형/긍정형 원칙
- 과한 경어 지양
- 명사 덩어리 풀기
- 불필요한 단어 제거
- 금지 표현 목록
- 권장 표현 패턴
- 버튼 문구 변환표
- 다이얼로그/툴팁/토스트/배너 가이드

### 3. `empty-state-global-library.md`
**역할:** 상태별 문구 템플릿과 예시

**포함 내용:**
- 공통 구조 (아이콘+제목+설명+CTA)
- Empty (빈 상태) 템플릿 + 5개 예시
- Error (오류) 템플릿 + 3개 예시
- Partial (부분 반영) 템플릿 + 2개 예시
- Stale (오래된 데이터) 템플릿 + 2개 예시
- Low Confidence (낮은 신뢰도) 템플릿
- Insufficient Coverage (범위 부족) 템플릿
- Loading 문구 표

### 4. `decision-ui-global-guide.md`
**역할:** 선택 UI 설계 기준

**포함 내용:**
- 카드 선택 vs 라디오 버튼 판단 기준
- 카드 선택 구조 (아이콘+제목+설명+선택 상태)
- 4가지 적용 예시 (업종/비교/알림/문서)
- 전환 대상 식별 체크리스트

### 5. `project-bootstrap-ux-checklist.md`
**역할:** 새 프로젝트 시작 시 UX 점검표

**포함 내용:**
- 시작 전 확인 (사용자, 핵심 행동, 톤, 용어)
- 화면별 체크 (핵심 행동, 용어, 선택 UI, 상태, writing, 정보 구조)
- 프로젝트 예외 확인
- 출시 전 최종 점검

---

## 초기 설치 방법

전역 파일은 이미 생성되어 있습니다:

```bash
ls ~/.claude/ux-global-principles.md
ls ~/.claude/ux-writing-global-guide.md
ls ~/.claude/empty-state-global-library.md
ls ~/.claude/decision-ui-global-guide.md
ls ~/.claude/project-bootstrap-ux-checklist.md
```

새 환경에서 복원이 필요하면, X2 프로젝트의 `docs/shared/` 아래 로컬 사본을 참조합니다.
