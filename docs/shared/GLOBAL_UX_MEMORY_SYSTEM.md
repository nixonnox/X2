# Global UX Memory System

> 이 문서는 Claude Code가 모든 프로젝트에서 자동으로 참조하는 전역 UX 정책 시스템의 구조를 설명합니다.

---

## 목적

매번 새 프로젝트마다 UX 원칙을 반복 설명하지 않아도, Claude Code가 **기본값처럼** 읽고 따를 수 있는 UX 기준을 제공합니다.

---

## 시스템 구조

```
┌─────────────────────────────────────────────┐
│  ~/.claude/ (전역 — 모든 프로젝트 공통)       │
│                                              │
│  ux-global-principles.md      ← 화면 구조     │
│  ux-writing-global-guide.md   ← 문구 원칙     │
│  empty-state-global-library.md ← 상태 문구    │
│  decision-ui-global-guide.md  ← 선택 UI      │
│  project-bootstrap-ux-checklist.md ← 점검표   │
│                                              │
│  projects/{project}/memory/                  │
│    feedback_ux_policy.md      ← 전역 참조 등록 │
└─────────────────────────────────────────────┘
         │
         │ 참조
         ▼
┌─────────────────────────────────────────────┐
│  프로젝트/docs/shared/ (프로젝트 특수 규칙)   │
│                                              │
│  UX_GLOBAL_PRINCIPLES.md     ← 도메인 용어    │
│  UX_WRITING_GLOBAL_GUIDE.md  ← 화면별 문구    │
│  CARD_SELECTION_AND_DECISION_UI_GUIDE.md     │
│  EMPTY_STATE_GLOBAL_LIBRARY.md               │
│  UX_REFACTOR_TARGET_LIST.md                  │
│  PROJECT_BOOTSTRAP_UX_CHECKLIST.md           │
└─────────────────────────────────────────────┘
```

---

## 동작 방식

### 1. 자동 참조 (Memory 기반)
- `~/.claude/projects/{project}/memory/feedback_ux_policy.md`에 전역 파일 경로가 등록되어 있음
- Claude Code가 대화 시작 시 메모리를 로드하면 전역 UX 정책 참조를 인식

### 2. 명시적 참조 (CLAUDE.md Import)
- 프로젝트의 `CLAUDE.md`에서 전역 파일을 직접 참조 가능
- 가장 확실한 방식

### 3. 요청 시 참조
- 사용자가 "UX 정책 따라서" 또는 "해요체로" 등 요청 시, 메모리에서 정책 파일 경로를 찾아 읽음

---

## 파일별 역할

| 파일 | 역할 | 언제 읽는가 |
|------|------|------------|
| `ux-global-principles.md` | 화면 구조, 선택 방식, 정보 계층, CTA 정책 | 새 화면을 설계할 때 |
| `ux-writing-global-guide.md` | 해요체, 능동형, 버튼 문구, 금지/권장 표현 | 문구를 쓸 때 |
| `empty-state-global-library.md` | 7가지 상태별 템플릿과 예시 | empty/error 화면을 만들 때 |
| `decision-ui-global-guide.md` | 카드 선택 vs 라디오 기준, 예시 | 선택 UI를 만들 때 |
| `project-bootstrap-ux-checklist.md` | 새 프로젝트 시작 시 UX 점검 | 프로젝트 시작 시 |

---

## 업데이트 정책

- 전역 파일은 프로젝트와 무관하게 업데이트 가능
- 프로젝트별 예외는 `docs/shared/`에서만 관리
- 전역 원칙에 프로젝트별 용어/문구를 섞지 않는다
