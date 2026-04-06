# P0-1 Listening Hub 수정 핸드오프

작성자: 채팅 Claude (read-only 진단)
대상: 터미널 Claude Code (writer)
작성일: 2026-04-07

## 문제 (확인된 것만)

리스닝 허브 페이지의 **하단 3개 섹션(Insight / Action / Evidence)** 중 Action/Evidence는 데이터가 절대 안 들어옴. Insight 섹션은 동작함(직접 cluster/pathfinder에서 추출).

## 근본 원인

타입과 백엔드가 어긋나 있음:

1. **백엔드 (`apps/web/src/services/search-intelligence/types.ts:129`)** — `SearchIntelligenceResult`는 4개 엔진(`pathfinder, roadview, persona, cluster`)만 가짐. `insight/action/evidence` 필드 없음.
2. **백엔드 오케스트레이터 + API route** — 4개 엔진만 실행, `{success, data: SearchIntelligenceResult}` 반환. `insight/action/evidence` 생성 안 함.
3. **`EngineExecutionResult.engine`** — 리터럴 유니언이 4개로 잠겨 있어서 새 엔진 타입 추가 불가.
4. **프론트엔드 (`apps/web/src/app/(dashboard)/listening-hub/page.tsx:27-31`)** — `ListeningHubResponse = SearchIntelligenceResult & { insight?, action?, evidence? }` ← **거짓 타입**. 백엔드가 안 채우는 필드를 옵셔널로 선언해놓음.
5. **page.tsx:184-191** — `<SearchActionSection actionResult={result?.action} />`, `<SearchEvidenceSection evidenceResult={result?.evidence} />` ← 항상 `undefined` 전달 → 빈 placeholder만 렌더링.
6. **page.tsx:71** — `setResult(json.data ?? json)` ← API 응답 wrapping 일관성 없을 때 대비한 방어 코드. 통합 필요.

## 권장 수정 (Option A, 2-3h)

백엔드 미구현 기능을 P1로 미루고, 프론트엔드를 백엔드 현실에 맞춤.

### 변경 1 — `apps/web/src/app/(dashboard)/listening-hub/page.tsx`

```diff
-import type {
-  SearchIntelligenceResult,
-  EngineExecutionResult,
-} from "@/services/search-intelligence";
+import type { SearchIntelligenceResult } from "@/services/search-intelligence";

-/**
- * API 응답은 SearchIntelligenceResult + 추가 통합 엔진 결과.
- * ...
- */
-type ListeningHubResponse = SearchIntelligenceResult & {
-  insight?: EngineExecutionResult<unknown>;
-  action?: EngineExecutionResult<unknown>;
-  evidence?: EngineExecutionResult<unknown>;
-};
+/** API 응답 envelope (route.ts에서 NextResponse.json({success, data})로 반환) */
+type AnalyzeApiResponse =
+  | { success: true; data: SearchIntelligenceResult }
+  | { success: false; error: string };
```

`useState`도 단순화:

```diff
-const [result, setResult] = useState<ListeningHubResponse | null>(null);
+const [result, setResult] = useState<SearchIntelligenceResult | null>(null);
```

`handleAnalyze` 본문에서 wrapping fallback 제거:

```diff
-      const json = await res.json();
-      setResult(json.data ?? json);
+      const json = (await res.json()) as AnalyzeApiResponse;
+      if (!json.success) {
+        throw new Error(json.error || "분석에 실패했어요");
+      }
+      setResult(json.data);
```

### 변경 2 — Action / Evidence 섹션 처리

두 섹션을 **"준비 중" placeholder로 영구 표시** 또는 **조건부로 숨김**. 추천은 후자(스코프 동결 원칙).

`page.tsx`에서 두 `<ErrorBoundary>` 블록 제거:

```diff
-        {/* Section 7: Actions */}
-        <ErrorBoundary>
-          <SearchActionSection actionResult={result?.action} />
-        </ErrorBoundary>
-
-        {/* Section 8: Evidence */}
-        <ErrorBoundary>
-          <SearchEvidenceSection evidenceResult={result?.evidence} />
-        </ErrorBoundary>
```

import도 함께 제거:

```diff
-import { SearchActionSection } from "@/components/listening-hub/SearchActionSection";
-import { SearchEvidenceSection } from "@/components/listening-hub/SearchEvidenceSection";
```

`SearchActionSection.tsx`와 `SearchEvidenceSection.tsx` 파일은 **삭제하지 말 것**. P1에서 백엔드 어그리게이터 추가 시 다시 마운트할 거라 그대로 두고, 현재 렌더 트리에서만 빠짐.

### 변경 3 — `SearchInsightSection.tsx` 타입 수술 불필요

이 컴포넌트는 이미 `result: SearchIntelligenceResult | null`을 받아서 `result.cluster`, `result.pathfinder` 등에서 직접 추출함. 변경 1로 page에서 넘기는 타입이 `SearchIntelligenceResult`로 정리되면 그대로 호환됨. 손대지 마.

### 변경 4 — `ListeningHubLayout.tsx` 그리드 조정 (선택)

8섹션 → 6섹션으로 줄어드니 그리드/레이아웃이 빈 칸 없이 잘 채워지는지 확인. 현재 코드 안 봤지만 한 번 열어보고 카드 폭/그리드 컬럼 수만 점검.

## 검증 절차

1. `pnpm --filter web typecheck` → 타입 에러 0 (특히 `ListeningHubResponse` 제거 후 잔존 참조 없는지)
2. `pnpm --filter web build` 통과
3. 로컬에서 `/listening-hub` 진입 → 시드 키워드 입력 → 분석 → 1~6번 섹션 모두 데이터 표시 확인 (API mock이라도 OK)
4. Network 탭에서 `/api/search-intelligence/analyze` 응답이 `{success: true, data: {...}}` 모양인지 확인
5. 에러 케이스: 일부러 빈 키워드 → 에러 배너 표시
6. push → Vercel 자동 빌드 → production에서 동일 검증

## 커밋 메시지 제안

```
fix(P0-1): listening-hub 타입 정리 + response wrapping 통합

- ListeningHubResponse 거짓 타입 제거 (insight/action/evidence는 백엔드 미구현)
- API 응답을 AnalyzeApiResponse discriminated union으로 명시
- json.data ?? json 방어 fallback 제거 → success 분기로 통합
- Action/Evidence 섹션을 렌더 트리에서 일시 제거 (P1 백엔드 어그리게이터 추가 시 복구)
- Insight 섹션은 그대로 (cluster/pathfinder에서 직접 추출)
```

## 만약 Option B를 가고 싶다면

백엔드에 action/evidence 어그리게이터 추가 (4-6h 추가 소요):

- `searchIntelligenceOrchestrator.ts`에 4개 엔진 결과 후처리 단계 추가
- `SearchIntelligenceResult` 타입에 `insight?, action?, evidence?: AggregatedResult` 추가 (별도 타입, `EngineExecutionResult` 재사용 X)
- `EngineExecutionResult.engine` 유니언 확장 금지 — 어그리게이트는 별도 envelope 사용

비추천. 지금은 안정화 단계라 새 백엔드 기능 추가는 P1 이후로 미루는 게 합의된 원칙(scope freeze).
