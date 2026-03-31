"use client";

import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Loader2, Users } from "lucide-react";
import { AiInsightPanel } from "@/components/intelligence/AiInsightPanel";

const COLORS = ["#171717", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CompetitorComparePage() {
  // TODO: get projectId from context
  const projectId = "default";

  const channelsQuery = trpc.channel.list.useQuery({ projectId });
  const competitorsQuery = trpc.competitor.list.useQuery({ projectId });

  const channels = channelsQuery.data ?? [];
  const competitors = competitorsQuery.data ?? [];

  const isLoading = channelsQuery.isLoading || competitorsQuery.isLoading;

  // Merge own channels + competitors for comparison
  const allChannels = [
    ...channels.map((ch: any) => ({
      name: ch.name ?? "내 채널",
      subscribers: ch.subscriberCount ?? 0,
      contents: ch.contentCount ?? 0,
      engagement: ch.avgEngagement ?? 0,
      platform: ch.platform ?? "—",
      isOwn: true,
    })),
    ...competitors.map((comp: any) => ({
      name: comp.name ?? comp.channelName ?? "경쟁사",
      subscribers: comp.subscriberCount ?? 0,
      contents: comp.contentCount ?? 0,
      engagement: comp.avgEngagement ?? 0,
      platform: comp.platform ?? "—",
      isOwn: false,
    })),
  ];

  // Chart data
  const subscriberData = allChannels.map((ch) => ({
    name: ch.name.length > 10 ? ch.name.slice(0, 10) + "…" : ch.name,
    구독자: ch.subscribers,
    isOwn: ch.isOwn,
  }));

  const engagementData = allChannels.map((ch) => ({
    name: ch.name.length > 10 ? ch.name.slice(0, 10) + "…" : ch.name,
    참여율: Math.round(ch.engagement * 100) / 100,
    isOwn: ch.isOwn,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">채널 비교</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          내 채널과 경쟁 채널의 주요 지표를 비교합니다.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && allChannels.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">등록된 채널이나 경쟁사가 없어요</p>
          <a href="/competitors/add" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">
            경쟁사 추가하기
          </a>
        </div>
      )}

      {!isLoading && allChannels.length > 0 && (
        <>
          {/* Subscriber Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">구독자 수 비교</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={subscriberData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="구독자" radius={[4, 4, 0, 0]}>
                  {subscriberData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">참여율 비교</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="참여율" radius={[4, 4, 0, 0]}>
                  {engagementData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">채널</th>
                  <th className="px-4 py-2.5 text-center font-medium text-gray-600">플랫폼</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">구독자</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">콘텐츠</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">참여율</th>
                </tr>
              </thead>
              <tbody>
                {allChannels.map((ch, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${ch.isOwn ? "bg-blue-50/30" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">{ch.name}</span>
                      {ch.isOwn && <span className="ml-1.5 rounded bg-blue-100 px-1 py-0.5 text-[9px] text-blue-600">내 채널</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{ch.platform}</td>
                    <td className="px-4 py-2.5 text-right">{ch.subscribers.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{ch.contents.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{ch.engagement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Insight */}
          <AiInsightPanel
            type="competitor_comparison"
            keyword="경쟁 분석"
            data={{
              channels: allChannels.map((ch) => ({
                name: ch.name,
                subscribers: ch.subscribers,
                engagement: ch.engagement,
                isOwn: ch.isOwn,
              })),
            }}
          />
        </>
      )}
    </div>
  );
}
