# Hook 기반 UX 정책 자동 주입 (선택 사항)

> 1차 권장은 **Memory + CLAUDE.md Import** 방식입니다.
> Hook은 더 강력한 자동화가 필요할 때의 확장 옵션입니다.

---

## 현재 권장 방식: Memory + CLAUDE.md

### 장점
- 설정이 간단 (파일 생성만)
- 디버깅이 쉬움 (파일을 열어보면 됨)
- 프로젝트별 예외 관리가 자연스러움
- Claude Code가 메모리 로드 시 자동 참조

### 단점
- 사용자가 UX 관련 요청을 하지 않으면 자동으로 읽히지 않을 수 있음
- 새 프로젝트마다 CLAUDE.md에 수동 추가 필요

---

## 확장 옵션: UserPromptSubmit Hook

Claude Code는 `UserPromptSubmit` hook을 지원합니다. 이를 활용하면 **모든 프롬프트 제출 시** UX 정책을 자동으로 컨텍스트에 주입할 수 있습니다.

### 설정 방법

`~/.claude/settings.json`에 hook을 추가:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "command": "cat ~/.claude/ux-writing-global-guide.md"
      }
    ]
  }
}
```

### 주의사항
- **모든 프롬프트**에 UX 가이드가 주입되므로 컨텍스트 소비가 큼
- UX와 무관한 작업(git, 빌드, 테스트)에서도 주입됨
- matcher로 필터링 가능하지만, 정교한 매칭이 어려움

### 개선된 방식: 조건부 Hook

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "UX|문구|화면|컴포넌트|empty|error|버튼|카드",
        "command": "echo '전역 UX 정책을 참조하세요: ~/.claude/ux-global-principles.md, ~/.claude/ux-writing-global-guide.md'"
      }
    ]
  }
}
```

이 방식은 UX 관련 키워드가 프롬프트에 포함될 때만 짧은 리마인더를 주입합니다.

### 장점
- 완전 자동 (사용자가 잊어도 작동)
- 일관성 보장

### 단점
- 컨텍스트 소비
- 오탐 가능 (UX와 무관한 "화면" 언급에도 작동)
- 설정 난이도 (JSON 직접 편집)
- 디버깅 어려움

---

## 권장 우선순위

| 순위 | 방식 | 적합한 경우 |
|------|------|------------|
| 1 | Memory 등록 | 기본. 모든 프로젝트에 권장 |
| 2 | CLAUDE.md Import | 중요 프로젝트. 명시적 참조 필요 시 |
| 3 | 조건부 Hook | 팀에서 UX 일관성이 반복적으로 깨질 때 |
| 4 | 전체 Hook | 권장하지 않음 (과도한 컨텍스트 소비) |

---

## 결론

**지금 단계에서는 Memory + CLAUDE.md Import가 최선입니다.**

Hook은 나중에 팀이 커지고 UX 일관성 유지가 반복적 문제가 될 때 도입을 검토하면 됩니다.
