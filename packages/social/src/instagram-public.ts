/**
 * Instagram 공개 프로필 정보 fetcher.
 *
 * Instagram `web_profile_info` 엔드포인트를 이용해 인증 없이 공개 계정의
 * 메타데이터(팔로워 수, 미디어 수, 프로필 사진, bio, verified 여부 등)를
 * 조회한다. 이 엔드포인트는 Instagram 웹 프로필 페이지가 내부적으로 사용하는
 * 비공식 공개 API다.
 *
 * ⚠️ 주의사항:
 * - Instagram TOS 그레이존이며 IP 기반 rate limit이 존재한다 (대략 200 req/h/IP).
 * - 구조가 언제든 변경될 수 있다. 실패는 조용히 null 반환으로 처리한다.
 * - 비공개 계정은 기본 메타만 반환된다 (follower count 등은 0).
 * - 장기적으로는 Apify/RapidAPI 같은 유료 스크래퍼로 대체 예정.
 */

const PROFILE_URL =
  "https://i.instagram.com/api/v1/users/web_profile_info/?username=";

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-IG-App-ID": "936619743392459",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

export interface InstagramPublicProfile {
  /** Instagram numeric user ID */
  platformChannelId: string;
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

/**
 * 주어진 username으로 Instagram 공개 프로필 정보를 조회한다.
 * 실패 시 null을 반환하며, 절대 throw하지 않는다 (호출자가 stub 저장 fallback).
 */
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
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      console.warn(
        `[instagram-public] ${cleanUsername} → HTTP ${res.status}`,
      );
      return null;
    }

    const json = (await res.json()) as {
      data?: { user?: Record<string, unknown> };
    };

    const user = json.data?.user;
    if (!user) {
      console.warn(`[instagram-public] ${cleanUsername} → no user in response`);
      return null;
    }

    const edgeFollowedBy = user.edge_followed_by as
      | { count?: number }
      | undefined;
    const edgeFollow = user.edge_follow as { count?: number } | undefined;
    const edgeMedia = user.edge_owner_to_timeline_media as
      | { count?: number }
      | undefined;

    return {
      platformChannelId: String(user.id ?? cleanUsername),
      username: String(user.username ?? cleanUsername),
      fullName: (user.full_name as string) || null,
      biography: (user.biography as string) || null,
      profilePicUrl:
        (user.profile_pic_url_hd as string) ||
        (user.profile_pic_url as string) ||
        null,
      followersCount: Number(edgeFollowedBy?.count ?? 0),
      followingCount: Number(edgeFollow?.count ?? 0),
      mediaCount: Number(edgeMedia?.count ?? 0),
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
