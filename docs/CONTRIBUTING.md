# Contributing

X2 프로젝트 기여 가이드. 사람과 AI 도구 모두 이 규칙을 따른다.

## 개발 환경 세팅

[GETTING_STARTED.md](./GETTING_STARTED.md) 참고.

## 작업 흐름

### 1. 이슈 확인

- 작업 전 관련 이슈가 있는지 확인한다.
- 없으면 이슈를 먼저 생성하고, 작업 범위를 명확히 한다.

### 2. 브랜치 생성

```bash
# 브랜치 네이밍: [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) 참고
git checkout -b feat/channel-list
```

### 3. 코드 작성

- [CODE_STYLE.md](./CODE_STYLE.md) — 네이밍, 파일 구성 규칙
- [UI_GUIDELINES.md](./UI_GUIDELINES.md) — 컴포넌트 설계, RSC/RCC 분리
- [API_GUIDELINES.md](./API_GUIDELINES.md) — API 응답, 에러 처리

### 4. 커밋

```bash
# 커밋 메시지: [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) 참고
git commit -m "feat(channel): add channel list page"
```

### 5. PR 생성

```markdown
## 요약

- 변경 내용을 1~3줄로 설명

## 변경 사항

- 구체적인 변경 목록

## 테스트

- [ ] 어떻게 테스트했는지
```

## 코드 리뷰 원칙

1. **동작 여부** — 의도대로 동작하는가?
2. **일관성** — 기존 코드 패턴과 일치하는가?
3. **단순성** — 더 간단한 방법이 있는가?
4. **안전성** — 보안 이슈나 에러 케이스를 놓치지 않았는가?

불필요한 스타일 논쟁은 하지 않는다. Prettier와 ESLint가 해결한다.

## 패키지 간 의존성 규칙

```
apps/web → packages/* (모두 사용 가능)
packages/api → packages/db, packages/types
packages/social → packages/types
packages/ai → packages/types
packages/ui → (외부 의존성만, 다른 @x2 패키지 참조 금지)
packages/types → (의존성 없음, 순수 타입만)
```

**원칙**: `packages/types`와 `packages/ui`는 다른 `@x2/*` 패키지에 의존하지 않는다. 순환 의존을 방지하기 위함이다.

## 새 파일 추가 시 체크리스트

- [ ] 파일명이 kebab-case인가?
- [ ] 적절한 디렉토리에 위치하는가?
- [ ] 필요하면 index.ts에서 re-export 했는가?
- [ ] 타입이 명시적으로 선언되어 있는가?
- [ ] 컴포넌트라면 `"use client"` 여부를 결정했는가?

## 새 패키지 추가 시

1. `packages/` 하위에 디렉토리 생성
2. `package.json` 작성 (name: `@x2/패키지명`)
3. `tsconfig.json` 작성 (extends: `@x2/tsconfig/library`)
4. `src/index.ts` 생성
5. 사용하는 앱/패키지의 `package.json`에 의존성 추가
6. `pnpm install` 실행
