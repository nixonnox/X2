"use client";

import { useState } from "react";

const MOCK_COMMENTS = [
  {
    id: "1",
    author: "user123",
    content: "이 영상 정말 유익해요! 감사합니다.",
    platform: "YouTube",
    sentiment: "positive",
    date: "2026-03-07",
  },
  {
    id: "2",
    author: "viewer_k",
    content: "가격이 너무 비싼 것 같아요. 할인은 없나요?",
    platform: "YouTube",
    sentiment: "negative",
    date: "2026-03-07",
  },
  {
    id: "3",
    author: "fan_01",
    content: "다음 영상은 언제 올라오나요?",
    platform: "Instagram",
    sentiment: "neutral",
    date: "2026-03-06",
  },
  {
    id: "4",
    author: "새싹유저",
    content: "튜토리얼 시리즈 더 만들어주세요!",
    platform: "YouTube",
    sentiment: "positive",
    date: "2026-03-06",
  },
  {
    id: "5",
    author: "critic99",
    content: "음질이 좀 아쉽네요. 마이크 바꾸시는게...",
    platform: "TikTok",
    sentiment: "negative",
    date: "2026-03-05",
  },
  {
    id: "6",
    author: "happyfan",
    content: "매번 퀄리티가 좋아지고 있어요",
    platform: "Instagram",
    sentiment: "positive",
    date: "2026-03-05",
  },
];

const SENTIMENT_STYLE: Record<string, { label: string; cls: string }> = {
  positive: { label: "긍정", cls: "bg-emerald-50 text-emerald-600" },
  negative: { label: "부정", cls: "bg-red-50 text-red-600" },
  neutral: { label: "중립", cls: "bg-gray-50 text-gray-600" },
};

export default function CommentListPage() {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? MOCK_COMMENTS
      : MOCK_COMMENTS.filter((c) => c.sentiment === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          댓글 목록
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          수집된 댓글을 감성별로 확인하고 관리합니다.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "전체" },
          { key: "positive", label: "긍정" },
          { key: "negative", label: "부정" },
          { key: "neutral", label: "중립" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--secondary-hover)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                작성자
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                댓글 내용
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                플랫폼
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                감성
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                날짜
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const style =
                SENTIMENT_STYLE[c.sentiment] ?? SENTIMENT_STYLE.neutral!;
              return (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                >
                  <td className="px-4 py-2.5 font-medium">{c.author}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-[var(--foreground)]">
                    {c.content}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                    {c.platform}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge text-[10px] ${style.cls}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {c.date}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
