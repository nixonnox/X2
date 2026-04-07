# P0-7 — Channel register: soft-delete revival + client-side IG metrics

**Local commit:** `d9715db`
**Status:** ✅ committed on master locally, **NOT pushed**
**Files:** `packages/api/src/routers/channel.ts`, `apps/web/src/app/(dashboard)/channels/new/page.tsx`

## Why

P0-6 production verification revealed two blockers:

1. **Vercel iad1 IP blocked by Instagram (HTTP 429).** Runtime log on `dpl_DNbMffDShcqA9ehHzgS8h31RhN3z` showed `[instagram-public] creamunion.official → HTTP 429`. The server-side fetcher we shipped in P0-6 cannot work from Vercel's data center IPs.
2. **Soft-delete unique-constraint collision.** `channel.delete` is soft-delete (`deletedAt = now()`), but `Channel @@unique([projectId, platform, platformChannelId])` does not scope by `deletedAt`. Re-registering a previously-deleted channel throws Prisma P2002. All 3 stub channels (thecoffee.kr, goldbean_24k, genus_offcl) hit this in production.

## What changed

### `packages/api/src/routers/channel.ts` — `register` procedure

1. **Optional `metrics` input** added to the zod schema:

   ```ts
   metrics: z.object({
     platformChannelId,
     username,
     fullName,
     profilePicUrl,
     followersCount,
     mediaCount,
   }).optional();
   ```

   When the client provides `metrics`, the server uses it directly. The server-side fetcher only runs as a fallback (and is expected to fail from Vercel IPs).

2. **Soft-delete revival.** Before creating, we now look up `existing` two ways:
   - by URL (`projectId + url`)
   - by the unique key (`projectId + platform + finalPlatformChannelId`)

   If `existing.deletedAt !== null`, we **revive** the row: clear `deletedAt`, set `status: ACTIVE`, update name/url/platformChannelId/channelType, and patch metrics if we have real ones. No more P2002 on re-registration.

3. Real-metrics gating: only sets `subscriberCount`, `contentCount`, and `lastSyncedAt` when we actually have a non-zero `followersCount` or `mediaCount`. Stub registrations leave the existing values alone.

### `apps/web/src/app/(dashboard)/channels/new/page.tsx`

1. New helper `fetchInstagramFromBrowser(username)` calls `https://i.instagram.com/api/v1/users/web_profile_info/?username=…` with `X-IG-App-ID: 936619743392459` and `credentials: 'omit'`. Returns `null` on any error (CORS, 4xx, parse).
2. In `handleSubmit`, when the resolved platform is `instagram`, the browser tries the fetch first and includes the result as `metrics` on the tRPC call. If the fetch fails (CORS or rate-limit on the user's IP), we still submit — the server falls through to the same stub path as before but the soft-delete revival fix means re-registration always succeeds.

## Risks / known caveats

- **CORS unknown.** `i.instagram.com` may not return `Access-Control-Allow-Origin: *` for the user's origin (`x2-nixonnox.vercel.app`). If it doesn't, the browser fetch will throw, `metrics` stays `null`, and the channel registers as a stub (subs=0). The soft-delete revival patch is the only thing guaranteed to ship value in that scenario. If CORS blocks us, P0-8 needs Apify or RapidAPI.
- **Real-metrics gating means stub channels stay at 0.** If both client + server fetch fail, the row will exist but display 0/0. The user can still rename/edit and the existing P0-3 polling worker (if it exists) can backfill later.

## Verification plan after deploy

1. `https://www.instagram.com/thecoffee.kr/` → register → expect: revives the soft-deleted row (no P2002), populates real follower count if browser fetch worked
2. Same for `goldbean_24k`, `genus_offcl`
3. `https://www.instagram.com/creamunion.official/` → register → already exists (the one from P0-6), so this will be a CONFLICT (active row). Need to soft-delete it first via UI, then re-register.
4. Open browser devtools → Network tab → look for the `i.instagram.com` request status code. 200 = win, CORS error = fall back to Apify in P0-8.

## Push checklist (terminal Claude)

- [ ] `git status` — confirm only the expected files differ from origin/master
- [ ] If chat-Claude's plumbing path left the index out of sync, run `git restore --staged .` (sync index to HEAD)
- [ ] `git push origin master`
- [ ] Watch Vercel build, then run the verification plan
