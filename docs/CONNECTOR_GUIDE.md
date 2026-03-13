# 커넥터 개발 가이드

## 새 커넥터 추가 방법

### 1. 커넥터 파일 생성

`apps/web/src/lib/collection/connectors/` 에 새 파일 생성:

```typescript
// connectors/my-platform.ts
import type { PlatformCode, SourceType, CollectionType, ... } from "../types";
import { BaseConnector } from "./base";

export class MyPlatformConnector extends BaseConnector {
  readonly id = "my-platform-api";
  readonly platform: PlatformCode = "custom"; // 또는 types.ts에 새 코드 추가
  readonly sourceType: SourceType = "api";
  readonly supportedCollections: CollectionType[] = ["channel", "content"];

  constructor(config: ConnectorConfig = {}) {
    super(config);
    // 인증 정보 초기화
  }

  async collectChannel(target: CollectionTarget) {
    const start = Date.now();
    // 실제 API 호출 구현
    return this.buildResult("channel", data, 1, start);
  }

  async collectContent(target: CollectionTarget) {
    const start = Date.now();
    // 실제 API 호출 구현
    return this.buildResult("content", items, items.length, start);
  }

  async healthCheck() {
    // API 연결 확인
  }
}
```

### 2. 배럴 export 추가

`connectors/index.ts`에 export 추가:

```typescript
export { MyPlatformConnector } from "./my-platform";
```

### 3. 레지스트리에 등록

`registry.ts`의 `createDefaultRegistry()`에 추가:

```typescript
registry.register(new MyPlatformConnector());
```

### 4. 정규화 함수 추가 (필요 시)

`normalization.ts`에 플랫폼별 정규화 로직 추가:

```typescript
case "my_platform":
  return normalizeMyPlatformChannel(raw, now);
```

### 5. 플랫폼 메타데이터 추가

`types.ts`의 `PLATFORMS` 상수에 추가:

```typescript
my_platform: {
  code: "my_platform",
  name: "My Platform",
  icon: "Globe",
  preferredSource: "api",
  supportedCollections: ["channel", "content"],
  note: "설명...",
},
```

## BaseConnector 헬퍼 메서드

| 메서드                                      | 용도                             |
| ------------------------------------------- | -------------------------------- |
| `buildResult(type, data, count, startTime)` | 성공 결과 생성                   |
| `buildError(type, message, startTime)`      | 실패 결과 생성                   |
| `this.config`                               | 커넥터 설정 (apiKey, timeout 등) |

## Mock 커넥터

`MockConnector`는 아무 플랫폼이나 시뮬레이션 가능:

```typescript
const mock = new MockConnector("youtube", {
  simulatedLatencyMs: 500, // 지연 시뮬레이션
  failureRate: 0.1, // 10% 실패율
});
```

## 커넥터 해결 우선순위

`connectorRegistry.resolve()` 호출 시:

1. `preferredSource`로 지정된 소스 타입 우선
2. 없으면 api → crawler → mock → manual 순서

## 환경변수 가이드

```env
# YouTube
YOUTUBE_API_KEY=your_api_key

# Instagram
INSTAGRAM_ACCESS_TOKEN=your_access_token

# TikTok
TIKTOK_ACCESS_TOKEN=your_access_token

# X (Twitter)
X_BEARER_TOKEN=your_bearer_token
```
