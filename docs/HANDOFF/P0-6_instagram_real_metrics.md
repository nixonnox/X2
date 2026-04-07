# P0-6: register 직후 실제 Instagram 메트릭 수집 & 저장

**상태:** 진단 완료. 구현 지시서.
**작성:** 채팅 Claude (reader/diagnostician)
**수신:** 터미널 Claude (writer)
**날짜:** 2026-04-08

---

## 0. 배경: 왜 P0인가

사용자가 production에서 `https://www.instagram.com/thecoffee.kr/`를 신규 등록해 테스트했을 때의 결과:

| 채널         | 실제 인스타              | X2 표시                |
| ------------ | ------------------------ | ---------------------- |
| thecoffee.kr | 게시물 139, 팔로워 1만   | **게시물 0, 팔로워 0** |
| genus_offcl  | 게시물 235, 팔로워 1.9만 | **게시물 0, 팔로워 0** |

증거 스크린샷 4장 첨부됨 (대화 로그 참조). 상세 페이지 KPI 카드 전부 0, 참여율 0.0%, 30일 성장률 0.0%, 콘텐츠 성과 "콘텐츠 데이터가 없습니다", 위험 신호 패널이 "데이터 수집이 필요해요"라고 자백 중.

하지만 사용자 UX 관점에서는:

1. 등록 성공 토스트 "✅ 분석을 시작합니다…"가 뜬다 → **거짓말** (실제로는 아무 분석도 시작 안 함)
2. `/channels` 목록의 "최근 분석일" 컬럼은 페이지 로드마다 현재 시각으로 mock 갱신 → **동작 중인 것처럼 보이는 거짓 신호**

사용자가 바로 신뢰 무너뜨리는 상황. **메시징이 아니라 실제 수집을 붙여야 한다.**

**근본 원인:** P1-9로 복원된 `register` procedure는 DB `channel.create`만 하고 provider 호출을 전혀 안 한다. 이건 원본 commit `3a268b8` 시점부터 그랬던 것 — 복원 자체는 정확하지만 원본이 미완성이었음.

---

## 1. 작업 범위 (Option A: 공개 웹 프로필 fetch, 무인증)

Instagram Graph API는 token 소유자 본인 계정만 쿼리 가능해서 thecoffee.kr 같은 제3자 계정은 못 건드린다. 대안 3가지 중 **Option A (공개 HTML/JSON 스크래핑)** 선택:

- **Option A — web_profile_info 엔드포인트** ⬅ 본 핸드오프가 구현할 것
  - URL: `https://i.instagram.com/api/v1/users/web_profile_info/?username={username}`
  - 필수 헤더: `X-IG-App-ID: 936619743392459`, `User-Agent: Mozilla/5.0 ...`
  - 무인증, 공개 프로필에 한해 동작, 팔로워/미디어 수/프로필 사진/bio 반환
  - 장점: 즉시 P0 해결, 비용 0, 외부 의존성 0
  - 단점: 인스타 rate limit (IP당 ~200 req/h 추정), TOS 그레이존, 언제든 구조 변경 가능
- Option B — Apify / RapidAPI 유료 스크래퍼 (P1에서 고려)
- Option C — Instagram Business Discovery API (사용자가 IG 비즈니스 계정 연동해야 함, P2 이상)

**Option A를 P0로 박고, P1에서 Option B로 업그레이드하는 2단 전략.**

---

## 2. 선행 작업: 내가 망가뜨린 파일 복구

채팅 Claude가 이전 세션 탐색 중 실수로 `packages/api/src/routers/channel.ts`를 잘라먹었다 (working tree에 172줄만 남음, HEAD는 265줄). git lock 때문에 복구 못 함.

**터미널 Claude 첫 작업:**

```bash
cd /sessions/epic-dazzling-allen/mnt/X2  # 또는 본인의 매핑 경로
git status packages/api/src/routers/channel.ts
# modified로 떠야 함 (unstaged)

git restore packages/api/src/routers/channel.ts
wc -l packages/api/src/routers/channel.ts
# 265가 나와야 함
```

이걸 먼저 해야 아래 작업이 깨끗한 base에서 시작됨.

---

## 3. 구현 순서

### 3-1. 공개 프로필 fetcher 추가

**파일:** `packages/social/src/instagram-public.ts` (신규)

```typescript
/**
 * Instagram 공개 프로필 정보 fetcher.
 *
 * web_profile_info 엔드포인트는 인스타그램이 웹 프로필 페이지 렌더링에
 * 사용하는 비공식 공개 API다. 인증 없이 공개 계정의 메타데이터
 * (팔로워, 미디어 수, 프로필 사진, bio, verified 여부)를 반환한다.
 *
 * ⚠️ 주의: Instagram TOS 그레이존이고 IP 기반 rate limit이 있다.
 * - P0 목적: production에서 신규 등록 시 "최소 1회" 호출
 * - P1에서 Apify/RapidAPI로 대체 예정
 * - rate limit 초과 시 null 반환 → 호출자가 stub 저장으로 fallback
 */

const PROFILE_URL =
  "https://i.instagram.com/api/v1/users/web_profile_info/?username=";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "X-IG-App-ID": "936619743392459",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
} as const;

export interface InstagramPublicProfile {
  platformChannelId: string; // Instagram numeric user ID
  username: string;
  fullName: string | null;
  biography: string | null;
  profilePicUrl: string | null;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl: string | null;
}

export async function fetchInstagramPublicProfile(
  username: string,
): Promise<InstagramPublicProfile | null> {
  const cleanUsername = username.replace(/^@/, "").trim();
  if (!cleanUsername) return null;

  try {
    const res = await fetch(
      `${PROFILE_URL}${encodeURIComponent(cleanUsername)}`,
      {
        headers: HEADERS,
        // 인스타그램이 느릴 때도 있어서 8초 타임아웃
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      console.warn(`[instagram-public] ${cleanUsername} → HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as {
      data?: { user?: Record<string, unknown> };
    };

    const user = json.data?.user;
    if (!user) return null;

    return {
      platformChannelId: String(user.id ?? cleanUsername),
      username: String(user.username ?? cleanUsername),
      fullName: (user.full_name as string) || null,
      biography: (user.biography as string) || null,
      profilePicUrl:
        (user.profile_pic_url_hd as string) ||
        (user.profile_pic_url as string) ||
        null,
      followersCount: Number(
        (user.edge_followed_by as { count?: number } | undefined)?.count ?? 0,
      ),
      followingCount: Number(
        (user.edge_follow as { count?: number } | undefined)?.count ?? 0,
      ),
      mediaCount: Number(
        (user.edge_owner_to_timeline_media as { count?: number } | undefined)
          ?.count ?? 0,
      ),
      isVerified: Boolean(user.is_verified),
      isPrivate: Boolean(user.is_private),
      externalUrl: (user.external_url as string) || null,
    };
  } catch (err) {
    console.warn(
      `[instagram-public] ${cleanUsername} fetch failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
```

### 3-2. `packages/social/src/index.ts`에 export 추가

기존 export 목록 하단에 한 줄:

```typescript
export {
  fetchInstagramPublicProfile,
  type InstagramPublicProfile,
} from "./instagram-public";
```

확인: `pnpm --filter @x2/social build`가 깨끗하게 통과해야 함.

### 3-3. `register` procedure에 호출 추가

**파일:** `packages/api/src/routers/channel.ts`

`channel.create({...})` 직후, 토스트 반환 직전에 아래 블록 삽입:

```typescript
// register procedure 내부, create 직후:
const channel = await ctx.db.channel.create({
  data: {
    projectId: input.projectId,
    platform,
    platformChannelId,
    name: input.name,
    url: normalizedUrl,
    channelType: channelTypeMap[input.channelType],
    connectionType: "BASIC",
    status: "ACTIVE",
  },
});

// 🆕 Instagram인 경우, 공개 프로필 정보를 즉시 한 번 fetch해서 반영
if (platform === "INSTAGRAM") {
  try {
    const username = platformChannelId;
    const profile = await fetchInstagramPublicProfile(username);
    if (profile) {
      await ctx.db.channel.update({
        where: { id: channel.id },
        data: {
          platformChannelId: profile.platformChannelId, // 숫자 ID로 교체
          name: profile.fullName || profile.username,
          thumbnailUrl: profile.profilePicUrl,
          subscriberCount: profile.followersCount,
          contentCount: profile.mediaCount,
          lastSyncedAt: new Date(),
          // description / bio 저장 필드가 있으면 추가
        },
      });
      // 재조회해서 최신 상태 반환
      const updated = await ctx.db.channel.findUnique({
        where: { id: channel.id },
      });
      return { success: true, channel: updated ?? channel };
    }
  } catch (err) {
    // 공개 프로필 fetch 실패는 등록 자체를 실패시키지 않는다.
    // stub 상태로 남고, P1의 background sync가 나중에 채운다.
    console.warn(
      "[channel.register] instagram public fetch failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

return { success: true, channel };
```

### 3-4. import 추가

`channel.ts` 상단:

```typescript
import { YouTubeProvider, fetchInstagramPublicProfile } from "@x2/social";
```

### 3-5. Prisma schema 확인

`packages/db/prisma/schema.prisma`의 Channel 모델에 `subscriberCount`, `contentCount`, `thumbnailUrl`, `lastSyncedAt` 컬럼 존재 여부 확인. `add` procedure가 이미 쓰고 있으니 있을 것이지만, **등록 전에 반드시 grep 확인**:

```bash
grep -nE "subscriberCount|contentCount|thumbnailUrl|lastSyncedAt" packages/db/prisma/schema.prisma
```

없으면 핸드오프 중단하고 사용자에게 보고 (마이그레이션 필요).

### 3-6. (선택) 거짓 토스트 문구 수정

`apps/web/src/app/(dashboard)/channels/new/page.tsx`에서 성공 토스트가 "✅ [name] 채널이 등록되었습니다! 분석을 시작합니다…"로 되어 있으면, 일단 정직하게 고치기:

```typescript
toast.success(`✅ ${name} 채널이 등록되었습니다.`);
```

"분석을 시작합니다" 문구 제거. P1에서 실제 background sync가 붙으면 그때 되살린다.

---

## 4. 검증 체크리스트

터미널 Claude 커밋 **전**:

1. [ ] `git restore packages/api/src/routers/channel.ts` 선행 완료, `wc -l` = 265
2. [ ] `packages/social/src/instagram-public.ts` 생성됨
3. [ ] `packages/social/src/index.ts`에 export 한 줄 추가됨
4. [ ] `packages/api/src/routers/channel.ts`의 register procedure에 Instagram 분기 추가됨
5. [ ] import 구문에 `fetchInstagramPublicProfile` 추가됨
6. [ ] schema.prisma에 필요 컬럼 4개 존재 확인 (`grep`)
7. [ ] `pnpm --filter @x2/social build` 통과
8. [ ] `pnpm --filter @x2/api build` 통과 (또는 프로젝트 전체 `pnpm build`)
9. [ ] `pnpm --filter @x2/api typecheck` (있으면) 통과
10. [ ] `git diff --stat`으로 변경 범위 확인 (3개 파일 정도여야 함)

커밋 후:

11. [ ] Vercel 자동 배포 READY 대기 (채팅 Claude가 `get_deployment`로 확인)
12. [ ] 사용자 테스트: 새 Instagram 프로필 등록 시 팔로워/게시물 수가 실제 값으로 표시되는지

---

## 5. 커밋 메시지

```
feat(api): register 직후 Instagram 공개 프로필 메트릭 fetch (P0-6)

- 신규 instagram-public.ts: web_profile_info 엔드포인트로 무인증 공개
  프로필(팔로워/미디어/프사/verified 등) 조회
- channel.register가 Instagram 플랫폼이면 create 직후 1회 fetch,
  성공 시 channel row를 실제 값으로 update하고 반환
- fetch 실패 시 stub 상태로 남김 (등록 자체는 실패시키지 않음)
- "분석을 시작합니다" 거짓 토스트 제거

이전에는 register가 DB row만 생성하고 외부 호출을 전혀 안 해서
상세 페이지 KPI 카드가 전부 0으로 표시되던 문제를 해결한다.
실제 사용자가 thecoffee.kr 등록 후 팔로워 0, 게시물 0으로 찍히는
스크린샷을 제보하면서 드러남.

Refs: docs/HANDOFF/P0-6_instagram_real_metrics.md
```

---

## 6. 리스크 & 롤백

**리스크:**

1. `i.instagram.com/api/v1/users/web_profile_info`가 갑자기 401/429 주기적으로 뱉을 수 있음 → 이미 try/catch로 null fallback, 등록은 성공
2. Vercel serverless function이 `AbortSignal.timeout(8000)` 이후에도 cold start로 더 길어질 수 있음 → 8초는 넉넉히 잡음, 함수 전체 timeout(기본 10초) 안에 들어옴
3. 인스타 user.id가 숫자 → string으로 저장되는데 `@@unique([projectId, platform, platformChannelId])` 제약이 깨질 수 있음 (기존 stub row가 username 문자열로 있고 새 등록이 숫자 ID로 들어오면 별개로 취급) → **첫 시도에서는 괜찮음**, 같은 채널 중복 등록 시만 문제. P1에서 backfill 마이그레이션 필요.

**롤백:**

- commit revert 1개로 끝. DB 스키마 변경 없음.
- 이미 업데이트된 channel row는 그대로 둬도 무해 (다만 0인 row는 0으로 영구 고정).

---

## 7. P1으로 미루는 것 (이번 핸드오프에서 건드리지 말 것)

- `/channels` 목록의 "최근 분석일" mock 제거 (별도 작업)
- `register` 중복 체크 기준(URL) vs DB unique 제약(platform+id) 불일치 (별도 작업)
- URL 정규화에서 `?igsh=...` 쿼리스트링 strip
- YouTube/TikTok/X용 동일 공개 프로필 fetcher (Instagram P0 검증 후 확장)
- Background re-sync job (매일 새벽 analyzer worker가 모든 채널 refresh)
- Apify/RapidAPI 전환 (Option B)

---

## 8. 최종 검증 시나리오 (채팅 Claude가 실행)

배포 완료 후:

1. Chrome MCP로 production `/channels/new` 방문
2. `form.requestSubmit()` 방식으로 thecoffee.kr 신규 등록 (이전 stub은 삭제하거나 그대로 두고 컬리전 확인)
3. 리다이렉트된 상세 페이지에서 팔로워 카드 확인 → `10000` 근방 값이어야 함
4. 게시물 카드 → `139` 근방
5. 프로필 사진 렌더링 여부
6. Vercel runtime logs에서 `[instagram-public]` warn 없는지 확인

실패 시:

- 로그 스냅샷 캡처
- 핸드오프 수정판 작성

---

끝.
