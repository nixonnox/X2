# P1-10: ProviderConfig.authType 유니언에 "NONE" 추가

목표: @x2/api의 마지막 1건(`gdelt-news.adapter.ts`) 제거 → 모노레포 전체 typecheck = 0.

## 진단

`packages/api/src/services/intelligence/gdelt-news.adapter.ts:32`에서
`authType: "NONE"`을 쓰는데 ProviderConfig.authType 유니언은
`"API_KEY" | "OAUTH2" | "BEARER_TOKEN"`로 NONE 누락.

9개 adapter authType 분포:

- gdelt-news: "NONE" ← 유일
- global-news, naver-search(×5), youtube: "API_KEY"
- instagram: "OAUTH2"
- tiktok-research, x-api: "BEARER_TOKEN"

GDELT는 진짜로 무인증이라 의미상 정합. union에 NONE 추가.

## 사용처 점검

`grep -rn authType` 결과 (adapter 제외):

- `packages/api/src/routers/intelligence.ts:444`: 단순 통과 (`s.config.authType`)
- `packages/api/src/services/intelligence/social-provider-registry.service.ts:47`:
  타입 정의 자체

`switch (authType)` 같은 exhaustive narrowing 없음. union 1줄 추가만으로 안전.

## Fix

```diff
   envKeyName: string;
-  authType: "API_KEY" | "OAUTH2" | "BEARER_TOKEN";
+  authType: "API_KEY" | "OAUTH2" | "BEARER_TOKEN" | "NONE";
```
