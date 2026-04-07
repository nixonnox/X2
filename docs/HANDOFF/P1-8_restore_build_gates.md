# P1-8: 빌드 게이트 복구 (typescript/eslint ignoreBuildErrors → false)

목표: `apps/web/next.config.ts`에서 `typescript.ignoreBuildErrors`와 `eslint.ignoreDuringBuilds`를 false로 복귀하고, 그 상태로 build 통과 확인.

---

## Part A. next.config.ts 플래그 flip

```diff
-  typescript: { ignoreBuildErrors: true },
-  eslint: { ignoreDuringBuilds: true },
+  typescript: { ignoreBuildErrors: false },
+  eslint: { ignoreDuringBuilds: false },
```

## Part B. 빌드 검증 후 분기

- Case A (clean): 단일 커밋 + push
- Case B (TS만): 메시지 보고
- Case C (ESLint 다수): 카테고리별 카운트 보고. 많으면 P1-8a (TS만) 먼저 머지, P1-8b ESLint 별도
- Case D (둘 다): 양쪽 보고
