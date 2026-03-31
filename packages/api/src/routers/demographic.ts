import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

/**
 * 인구통계/속성 분석 라우터.
 *
 * 네이버 DataLab 성별/연령 필터를 활용하여
 * 키워드별 인구통계 트렌드를 제공한다.
 */
export const demographicRouter = router({
  /** 키워드의 성별/연령별 검색 트렌드 */
  analyze: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        months: z.number().min(1).max(24).default(12),
      }),
    )
    .query(async ({ input }) => {
      const { keyword, months } = input;

      const clientId = process.env.NAVER_CLIENT_ID;
      const clientSecret = process.env.NAVER_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return {
          keyword,
          available: false,
          error: "NAVER_CLIENT_ID/SECRET 미설정",
          genderBreakdown: [],
          ageBreakdown: [],
          genderTimeline: [],
        };
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const fmt = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      };

      const baseBody = {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        timeUnit: "month",
        keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
      };

      const headers = {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      };

      const callApi = async (extra: Record<string, unknown> = {}) => {
        try {
          const res = await fetch("https://openapi.naver.com/v1/datalab/search", {
            method: "POST",
            headers,
            body: JSON.stringify({ ...baseBody, ...extra }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.results?.[0]?.data ?? [];
        } catch {
          return null;
        }
      };

      // Gender: all, male, female
      const genderLabels = [
        { filter: {}, label: "전체", key: "all" },
        { filter: { gender: "m" }, label: "남성", key: "male" },
        { filter: { gender: "f" }, label: "여성", key: "female" },
      ];

      const genderBreakdown: { key: string; label: string; avgRatio: number }[] = [];
      const genderTimeline: { key: string; label: string; data: { date: string; value: number }[] }[] = [];

      for (const g of genderLabels) {
        const points = await callApi(g.filter);
        if (!points) continue;
        const avg = points.length > 0
          ? Math.round((points.reduce((s: number, p: any) => s + p.ratio, 0) / points.length) * 10) / 10
          : 0;
        genderBreakdown.push({ key: g.key, label: g.label, avgRatio: avg });
        genderTimeline.push({
          key: g.key,
          label: g.label,
          data: points.map((p: any) => ({ date: p.period.substring(0, 7), value: Math.round(p.ratio) })),
        });
      }

      // Age groups
      const ageGroups = [
        { code: "2", label: "13-18" },
        { code: "3", label: "19-24" },
        { code: "4", label: "25-29" },
        { code: "5", label: "30-34" },
        { code: "6", label: "35-39" },
        { code: "7", label: "40-44" },
        { code: "8", label: "45-49" },
        { code: "9", label: "50-54" },
        { code: "10", label: "55-59" },
        { code: "11", label: "60+" },
      ];

      const ageBreakdown: { code: string; label: string; avgRatio: number }[] = [];

      for (const ag of ageGroups) {
        const points = await callApi({ ages: [ag.code] });
        if (!points) continue;
        const avg = points.length > 0
          ? Math.round((points.reduce((s: number, p: any) => s + p.ratio, 0) / points.length) * 10) / 10
          : 0;
        ageBreakdown.push({ code: ag.code, label: ag.label, avgRatio: avg });
      }

      return {
        keyword,
        available: genderBreakdown.length > 0 || ageBreakdown.length > 0,
        error: null,
        genderBreakdown,
        ageBreakdown,
        genderTimeline,
      };
    }),
});
