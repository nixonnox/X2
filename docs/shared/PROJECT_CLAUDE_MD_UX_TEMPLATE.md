# 새 프로젝트용 CLAUDE.md UX Import 템플릿

> 새 프로젝트의 `CLAUDE.md`에 아래 내용을 추가하면, Claude Code가 전역 UX 정책을 자동으로 따릅니다.

---

## 권장 CLAUDE.md 구조

```markdown
# Project Name

## UX 정책

이 프로젝트는 전역 UX 정책을 따릅니다.
새 화면을 만들거나 문구를 쓸 때 아래 파일을 먼저 참조하세요:

- 화면 구조/선택 방식: ~/.claude/ux-global-principles.md
- 문구 작성 원칙: ~/.claude/ux-writing-global-guide.md
- 상태 화면 문구: ~/.claude/empty-state-global-library.md
- 선택 UI 가이드: ~/.claude/decision-ui-global-guide.md
- 시작 점검표: ~/.claude/project-bootstrap-ux-checklist.md

### 프로젝트별 예외

- 톤: (예: 이 프로젝트는 좀 더 포멀한 톤을 사용한다)
- 도메인 용어: (예: "포트폴리오"는 바꾸지 않는다)
- 규제 문구: (예: 금융 상품 안내는 법적 문구를 유지한다)
- 시각화: (예: 차트보다 테이블을 우선한다)

### 기술 스택

(프로젝트별 기술 정보)
```

---

## 적용 절차

### 1단계: 프로젝트 시작
```bash
# 새 프로젝트 디렉터리 생성 후
cd new-project
# CLAUDE.md 생성
```

### 2단계: CLAUDE.md에 UX 섹션 추가
위 템플릿의 `## UX 정책` 섹션을 CLAUDE.md에 붙여넣기

### 3단계: 프로젝트별 예외 정의
- 도메인 용어 사전 작성
- 톤 수준 결정 (캐주얼 ↔ 포멀)
- 규제/법률 요구사항 확인

### 4단계: 첫 화면 만들기 전 점검
`~/.claude/project-bootstrap-ux-checklist.md`의 체크리스트를 확인

---

## 메모리 기반 자동 참조 (선택)

CLAUDE.md에 명시하지 않더라도, 메모리에 `feedback_ux_policy.md`가 등록되어 있으면 Claude Code가 UX 작업 시 자동으로 전역 파일을 참조합니다.

메모리 파일 위치:
```
~/.claude/projects/{project-path}/memory/feedback_ux_policy.md
```
