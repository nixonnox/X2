/**
 * TikTokResearchApiAdapter
 *
 * TikTok Research API를 통해 키워드 관련 영상/댓글을 수집.
 *
 * 제약사항:
 * - Research API 승인 필요 (학술/상업용 별도 신청)
 * - Display API는 자체 콘텐츠만 조회 가능 — 키워드 검색 불가
 * - Rate Limit: 100 requests/min (Research API)
 * - Data Access: 최근 30일 데이터만 제공
 *
 * API Endpoints (Research API 승인 후):
 * - POST /v2/research/video/query → 키워드 기반 영상 검색
 * - POST /v2/research/video/comment/list → 영상별 댓글 목록
 *
 * 현재 상태: SCAFFOLD — Research API 승인 대기, 구조만 준비
 */

import type {
  SocialProviderAdapter,
  ProviderConfig,
  ProviderFetchResult,
  SocialMention,
} from "./social-provider-registry.service";

export class TikTokResearchApiAdapter implements SocialProviderAdapter {
  readonly config: ProviderConfig = {
    name: "tiktok",
    platform: "TIKTOK",
    requiresApiKey: true,
    envKeyName: "TIKTOK_ACCESS_TOKEN",
    authType: "BEARER_TOKEN",
    rateLimitPerDay: 144000, // 100/min × 1440 min/day
    documentation: "https://developers.tiktok.com/doc/research-api-get-started",
  };

  private accessToken: string | undefined;
  private baseUrl = "https://open.tiktokapis.com/v2";

  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  }

  isConfigured(): boolean {
    return (
      !!this.accessToken && this.accessToken !== "your-tiktok-access-token"
    );
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        error:
          "TIKTOK_ACCESS_TOKEN 미설정 — Research API 승인 후 토큰 발급 필요",
      };
    }

    try {
      // Test: Query a single video to verify token
      const res = await fetch(`${this.baseUrl}/research/video/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            and: [
              {
                field_name: "keyword",
                field_values: ["test"],
                operation: "IN",
              },
            ],
          },
          max_count: 1,
          start_date: new Date(Date.now() - 86400000)
            .toISOString()
            .split("T")[0],
          end_date: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: body?.error?.message ?? `HTTP ${res.status}`,
        };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: `연결 실패: ${err.message}` };
    }
  }

  async fetchMentions(
    keyword: string,
    options?: { maxResults?: number; since?: Date },
  ): Promise<ProviderFetchResult> {
    if (!this.isConfigured()) {
      return {
        mentions: [],
        fetchedAt: new Date().toISOString(),
        error: "TIKTOK_ACCESS_TOKEN 미설정",
      };
    }

    const maxResults = options?.maxResults ?? 20;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sinceDate =
      options?.since && options.since > thirtyDaysAgo
        ? options.since
        : thirtyDaysAgo;

    const startDate = sinceDate.toISOString().split("T")[0]!;
    const endDate = now.toISOString().split("T")[0]!;

    const mentions: SocialMention[] = [];

    try {
      // 1. Search videos by keyword
      const videoRes = await fetch(`${this.baseUrl}/research/video/query/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            and: [
              {
                field_name: "keyword",
                field_values: [keyword],
                operation: "IN",
              },
            ],
          },
          max_count: Math.min(maxResults, 100),
          start_date: startDate,
          end_date: endDate,
        }),
      });

      if (!videoRes.ok) {
        const errBody = await videoRes.json().catch(() => ({}));
        const errMsg = errBody?.error?.message ?? `HTTP ${videoRes.status}`;
        if (videoRes.status === 401 || videoRes.status === 403) {
          return {
            mentions: [],
            fetchedAt: now.toISOString(),
            error: `TikTok Research API 인증 오류 (${videoRes.status}): ${errMsg}`,
          };
        }
        return {
          mentions: [],
          fetchedAt: now.toISOString(),
          error: `TikTok Research API 오류: ${errMsg}`,
        };
      }

      const videoData = await videoRes.json();
      const videos: any[] = videoData?.data?.videos ?? [];

      // 2. Convert each video to a SocialMention
      for (const video of videos) {
        const videoId = String(video.id ?? "");
        const createTime = video.create_time
          ? new Date(video.create_time * 1000).toISOString()
          : now.toISOString();

        mentions.push({
          id: `tiktok-video-${videoId}`,
          platform: "TIKTOK",
          text: video.video_description ?? "",
          authorName: video.username ?? null,
          authorHandle: video.username ? `@${video.username}` : null,
          sentiment: null,
          topics: [],
          publishedAt: createTime,
          url: videoId
            ? `https://www.tiktok.com/@${video.username ?? "user"}/video/${videoId}`
            : null,
          engagement: {
            likes: Number(video.like_count ?? 0),
            comments: Number(video.comment_count ?? 0),
            shares: Number(video.share_count ?? 0),
          },
        });

        // 3. Try to fetch comments for each video
        if (videoId) {
          try {
            const commentRes = await fetch(
              `${this.baseUrl}/research/video/comment/list/`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${this.accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  video_id: Number(videoId),
                  max_count: 20,
                }),
              },
            );

            if (commentRes.ok) {
              const commentData = await commentRes.json();
              const comments: any[] = commentData?.data?.comments ?? [];

              for (const comment of comments) {
                mentions.push({
                  id: `tiktok-comment-${comment.id ?? Math.random().toString(36).slice(2)}`,
                  platform: "TIKTOK",
                  text: comment.text ?? "",
                  authorName: null,
                  authorHandle: null,
                  sentiment: null,
                  topics: [],
                  publishedAt: comment.create_time
                    ? new Date(comment.create_time * 1000).toISOString()
                    : createTime,
                  url: videoId
                    ? `https://www.tiktok.com/@${video.username ?? "user"}/video/${videoId}`
                    : null,
                  engagement: {
                    likes: Number(comment.like_count ?? 0),
                    comments: 0,
                    shares: 0,
                  },
                });
              }
            }
            // If comments fetch fails (403, disabled, etc.), silently continue
          } catch {
            // Comments may be disabled or restricted — continue to next video
          }
        }
      }

      return {
        mentions,
        fetchedAt: now.toISOString(),
        quotaUsed: 1 + videos.length, // 1 query + N comment requests
      };
    } catch (err: any) {
      return {
        mentions: [],
        fetchedAt: now.toISOString(),
        error: `TikTok Research API 요청 실패: ${err.message}`,
      };
    }
  }
}
