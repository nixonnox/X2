"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────
// Landing Page
// ─────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <HeroWithDualDemo />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

// ── Navbar ──

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
            X2
          </div>
          <span className="text-lg font-bold tracking-tight">X2</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-[14px] text-gray-500 hover:text-black"
          >
            기능
          </a>
          <a
            href="#pricing"
            className="text-[14px] text-gray-500 hover:text-black"
          >
            요금제
          </a>
          <a href="#faq" className="text-[14px] text-gray-500 hover:text-black">
            FAQ
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[14px] font-medium text-gray-600 hover:text-black"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-black px-4 py-2 text-[14px] font-medium text-white hover:bg-gray-800"
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero with Dual Demo (Channel Analysis + Intent Analysis) ──

type AnalysisMode = "channel" | "intent";

function HeroWithDualDemo() {
  const [mode, setMode] = useState<AnalysisMode>("channel");

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white" />
      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-16 sm:pt-20">
        {/* Title */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[13px] font-medium text-blue-700">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            AI 기반 소셜 미디어 분석
          </div>
          <h1 className="text-[36px] font-extrabold leading-tight tracking-tight sm:text-[48px]">
            로그인 없이
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              지금 바로 분석하세요
            </span>
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-gray-500 sm:text-lg">
            채널 성과 분석과 검색 인텐트 분석을 무료로 체험해보세요.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="mx-auto mt-8 max-w-2xl">
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setMode("channel")}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-all ${
                  mode === "channel"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ChartIcon className="h-4 w-4" />
                채널 분석
              </button>
              <button
                onClick={() => setMode("intent")}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-semibold transition-all ${
                  mode === "intent"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <SearchIntentIcon className="h-4 w-4" />
                인텐트 분석
                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">
                  베타
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Area */}
        {mode === "channel" ? <ChannelDemoSection /> : <IntentDemoSection />}
      </div>
    </section>
  );
}

// ── Channel Demo ──

type ChannelDemoState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "error"; message: string }
  | { stage: "result"; data: ChannelDemoResult };

type ChannelDemoResult = {
  platform: string;
  channelIdentifier: string;
  preview: {
    name: string;
    description: string | null;
    audienceCount: number;
    totalContents: number;
    profileImage: string | null;
    metrics: { label: string; value: string; locked: boolean }[];
    insights: { type: string; text: string; locked: boolean }[];
  };
  isReal: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
};
const PLATFORM_COLORS: Record<string, string> = {
  youtube: "bg-red-50 text-red-600 border-red-200",
  instagram: "bg-pink-50 text-pink-600 border-pink-200",
  tiktok: "bg-gray-900 text-white border-gray-700",
  x: "bg-gray-50 text-black border-gray-200",
};

function ChannelDemoSection() {
  const [url, setUrl] = useState("");
  const [demo, setDemo] = useState<ChannelDemoState>({ stage: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setDemo({ stage: "loading" });
    try {
      const res = await fetch("/api/demo/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDemo({ stage: "error", message: data.error });
        return;
      }
      setDemo({ stage: "result", data });
    } catch {
      setDemo({ stage: "error", message: "네트워크 오류가 발생했습니다." });
    }
  }, [url]);

  return (
    <div className="mx-auto mt-6 max-w-3xl">
      {/* Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-200/60">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="채널 URL을 붙여넣으세요 (예: youtube.com/@channelname)"
            className="flex-1 rounded-xl border-0 bg-gray-50 px-5 py-3.5 text-[15px] outline-none placeholder:text-gray-400 focus:bg-gray-100"
          />
          <button
            onClick={handleAnalyze}
            disabled={demo.stage === "loading"}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-black px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {demo.stage === "loading" ? (
              <>
                <Spinner />
                분석 중...
              </>
            ) : (
              <>
                <SearchIcon />
                무료 분석
              </>
            )}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] text-gray-400">
        <span>지원:</span>
        {["YouTube", "Instagram", "TikTok", "X"].map((p) => (
          <span
            key={p}
            className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-gray-500"
          >
            {p}
          </span>
        ))}
      </div>

      {demo.stage === "error" && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-[14px] text-amber-700">
          {demo.message}
        </div>
      )}
      {demo.stage === "result" && <ChannelResultCard data={demo.data} />}
      {demo.stage === "idle" && <ChannelSamplePreview />}
    </div>
  );
}

function ChannelSamplePreview() {
  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/50 to-white p-8">
      <div className="mb-4 text-center text-[13px] font-medium text-gray-400">
        미리보기 — 채널 분석 결과 예시
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "구독자", value: "1.2M" },
          { label: "동영상", value: "847" },
          { label: "참여율", value: "4.8%" },
          { label: "성장률", value: "+12.5%" },
          { label: "평균 조회수", value: "52.3K" },
          { label: "콘텐츠 빈도", value: "3.2/주" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-white p-4 text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {m.label}
            </p>
            <p className="mt-1 text-[20px] font-bold text-gray-900">
              {m.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            color: "bg-emerald-50 border-emerald-200",
            title: "성장 분석",
            desc: "최근 30일간 구독자 증가 속도가 업계 평균의 2.3배입니다",
          },
          {
            color: "bg-blue-50 border-blue-200",
            title: "콘텐츠 전략",
            desc: "Shorts 콘텐츠의 참여율이 일반 영상 대비 3.1배 높습니다",
          },
          {
            color: "bg-violet-50 border-violet-200",
            title: "오디언스 인사이트",
            desc: "주요 시청 시간대는 오후 7-10시, 18-34세 비중 68%",
          },
        ].map((item) => (
          <div
            key={item.title}
            className={`rounded-xl border ${item.color} p-4`}
          >
            <p className="text-[13px] font-semibold text-gray-900">
              {item.title}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-600">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelResultCard({ data }: { data: ChannelDemoResult }) {
  const platformClass =
    PLATFORM_COLORS[data.platform] ||
    "bg-gray-50 text-gray-600 border-gray-200";
  const platformLabel = PLATFORM_LABELS[data.platform] || data.platform;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mt-6 duration-500">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100/80 sm:p-8">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-[20px] font-bold text-gray-500">
            {data.preview.profileImage ? (
              <img
                src={data.preview.profileImage}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              data.preview.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[18px] font-bold">{data.preview.name}</h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${platformClass}`}
              >
                {platformLabel}
              </span>
            </div>
            {data.preview.description && (
              <p className="mt-0.5 text-[13px] text-gray-500">
                {data.preview.description}
              </p>
            )}
          </div>
          {data.isReal && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
              실시간 데이터
            </span>
          )}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {data.preview.metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {m.label}
              </p>
              {m.locked ? (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <LockIcon />
                  <span className="text-[14px] font-semibold text-gray-300">
                    비공개
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[20px] font-bold text-gray-900">
                  {m.value}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {data.preview.insights.map((i) => (
            <div
              key={i.type}
              className="rounded-xl border border-gray-100 bg-gray-50/50 p-4"
            >
              <div className="flex items-start gap-2">
                <LockIcon />
                <p className="text-[13px] font-medium text-gray-400">
                  {i.text}
                </p>
              </div>
            </div>
          ))}
        </div>
        <SignupCta />
      </div>
    </div>
  );
}

// ── Intent Demo ──

type IntentDemoState =
  | { stage: "idle" }
  | { stage: "loading"; progress: number; message: string }
  | { stage: "error"; message: string }
  | { stage: "result"; data: IntentDemoResult };

type IntentKeyword = {
  keyword: string;
  searchVolume: number;
  trend: "rising" | "stable" | "declining";
  intentCategory: string;
  gapScore: number;
  isRising: boolean;
};

type IntentDemoResult = {
  seedKeyword: string;
  totalKeywords: number;
  totalTopics: number;
  avgGapScore: number;
  intentDistribution: Record<string, number>;
  topKeywords: IntentKeyword[];
  topBlueOceans: { keyword: string; gapScore: number }[];
  topRising: { keyword: string; trendScore: number }[];
};

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  discovery: { label: "정보 탐색", color: "#3b82f6" },
  comparison: { label: "비교/리뷰", color: "#f59e0b" },
  action: { label: "구매/행동", color: "#10b981" },
  troubleshooting: { label: "문제 해결", color: "#ef4444" },
  unknown: { label: "기타", color: "#6b7280" },
};

function IntentDemoSection() {
  const [keyword, setKeyword] = useState("");
  const [demo, setDemo] = useState<IntentDemoState>({ stage: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    setDemo({ stage: "loading", progress: 0, message: "키워드 확장 중..." });

    try {
      // Use sync mode for demo (faster, simpler)
      const res = await fetch("/api/intent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword: trimmed,
          maxDepth: 1,
          maxKeywords: 30,
          mode: "sync",
          useLLM: false,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        setDemo({
          stage: "error",
          message: body.error || "분석에 실패했습니다.",
        });
        return;
      }

      const graphData = body.data;
      const summary = graphData.summary;

      // Extract top keywords from nodes (show first 10, rest locked)
      const topKeywords: IntentKeyword[] = graphData.nodes
        .filter((n: any) => !n.isSeed)
        .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
        .slice(0, 15)
        .map((n: any) => ({
          keyword: n.name,
          searchVolume: n.searchVolume,
          trend: n.isRising ? "rising" : "stable",
          intentCategory: n.intentCategory,
          gapScore: n.gapScore,
          isRising: n.isRising,
        }));

      setDemo({
        stage: "result",
        data: {
          seedKeyword: summary.seedKeyword,
          totalKeywords: summary.totalKeywords,
          totalTopics:
            summary.totalClusters || Math.ceil(summary.totalKeywords / 5),
          avgGapScore: summary.avgGapScore,
          intentDistribution: summary.intentDistribution,
          topKeywords,
          topBlueOceans: (summary.topBlueOceans || []).slice(0, 3),
          topRising: (summary.topRising || []).slice(0, 3),
        },
      });
    } catch {
      setDemo({ stage: "error", message: "분석 중 오류가 발생했습니다." });
    }
  }, [keyword]);

  return (
    <div className="mx-auto mt-6 max-w-3xl">
      {/* Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-gray-200/60">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="검색 키워드를 입력하세요 (예: 더크림유니언, 소셜미디어 마케팅)"
            className="flex-1 rounded-xl border-0 bg-gray-50 px-5 py-3.5 text-[15px] outline-none placeholder:text-gray-400 focus:bg-gray-100"
          />
          <button
            onClick={handleAnalyze}
            disabled={demo.stage === "loading"}
            className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-[15px] font-semibold text-white hover:from-violet-700 hover:to-blue-700 disabled:opacity-60"
          >
            {demo.stage === "loading" ? (
              <>
                <Spinner />
                분석 중...
              </>
            ) : (
              <>
                <SearchIntentIcon className="h-4 w-4" />
                인텐트 분석
              </>
            )}
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-gray-400">
        브랜드, 제품, 서비스 키워드를 입력하면 검색 의도와 트렌드를 분석합니다
      </p>

      {demo.stage === "loading" && (
        <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-8 text-center">
          <Spinner className="mx-auto h-6 w-6 text-violet-500" />
          <p className="mt-3 text-[14px] font-medium text-violet-700">
            {demo.message}
          </p>
          <p className="mt-1 text-[12px] text-violet-500">
            키워드 확장 → 트렌드 수집 → 인텐트 분류 중...
          </p>
        </div>
      )}
      {demo.stage === "error" && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-[14px] text-amber-700">
          {demo.message}
        </div>
      )}
      {demo.stage === "result" && <IntentResultCard data={demo.data} />}
      {demo.stage === "idle" && <IntentSamplePreview />}
    </div>
  );
}

function IntentSamplePreview() {
  return (
    <div className="mt-8 rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/50 to-white p-8">
      <div className="mb-4 text-center text-[13px] font-medium text-gray-400">
        미리보기 — 인텐트 분석 결과 예시
      </div>
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "키워드 수", value: "47" },
          { label: "토픽 수", value: "8" },
          { label: "블루오션 키워드", value: "12" },
          { label: "급상승 키워드", value: "5" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-white p-4 text-center"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              {m.label}
            </p>
            <p className="mt-1 text-[24px] font-bold text-gray-900">
              {m.value}
            </p>
          </div>
        ))}
      </div>
      {/* Intent Distribution */}
      <div className="mt-5 flex items-center justify-center gap-6">
        {[
          { label: "정보 탐색", pct: 42, color: "bg-blue-500" },
          { label: "비교/리뷰", pct: 28, color: "bg-amber-500" },
          { label: "구매/행동", pct: 20, color: "bg-emerald-500" },
          { label: "문제 해결", pct: 10, color: "bg-red-500" },
        ].map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-[12px]">
            <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-semibold">{d.pct}%</span>
          </div>
        ))}
      </div>
      {/* Sample keywords table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium text-gray-400">
                키워드
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-400">
                월 검색량
              </th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-400">
                트렌드
              </th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-400">
                인텐트
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-gray-400">
                갭 스코어
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                kw: "소셜미디어 마케팅 전략",
                vol: "2,400",
                trend: "rising",
                intent: "정보 탐색",
                gap: 72,
              },
              {
                kw: "인스타그램 릴스 알고리즘",
                vol: "1,800",
                trend: "rising",
                intent: "정보 탐색",
                gap: 85,
              },
              {
                kw: "틱톡 마케팅 사례",
                vol: "1,200",
                trend: "stable",
                intent: "비교/리뷰",
                gap: 58,
              },
            ].map((row) => (
              <tr key={row.kw} className="border-t border-gray-50">
                <td className="px-4 py-2.5 font-medium">{row.kw}</td>
                <td className="px-4 py-2.5 text-right">{row.vol}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-[11px] font-semibold ${row.trend === "rising" ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {row.trend === "rising" ? "↑ 상승" : "- 안정"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                    {row.intent}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={`font-semibold ${row.gap >= 70 ? "text-blue-600" : row.gap >= 40 ? "text-emerald-600" : "text-gray-500"}`}
                  >
                    {row.gap}
                  </span>
                </td>
              </tr>
            ))}
            {/* Blurred rows */}
            <tr className="border-t border-gray-50">
              <td
                colSpan={5}
                className="px-4 py-6 text-center text-[13px] text-gray-400"
              >
                <LockIcon className="mx-auto mb-1" />더 많은 키워드와 상세
                분석은 무료 가입 후 확인하세요
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntentResultCard({ data }: { data: IntentDemoResult }) {
  const totalIntents = Object.values(data.intentDistribution).reduce(
    (s, v) => s + v,
    0,
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mt-6 duration-500">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100/80 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <SearchIntentIcon className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold">
              "{data.seedKeyword}" 인텐트 분석 결과
            </h3>
            <p className="text-[12px] text-gray-400">실시간 분석 완료</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <KpiBox label="키워드 수" value={data.totalKeywords.toString()} />
          <KpiBox label="토픽 수" value={data.totalTopics.toString()} />
          <KpiBox
            label="평균 갭 스코어"
            value={data.avgGapScore.toFixed(0)}
            highlight={data.avgGapScore >= 50}
          />
          <KpiBox
            label="블루오션"
            value={data.topBlueOceans.length.toString()}
            highlight
          />
        </div>

        {/* Intent Distribution */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
          {Object.entries(data.intentDistribution).map(([key, count]) => {
            const info = INTENT_LABELS[key] ?? INTENT_LABELS.unknown!;
            const pct =
              totalIntents > 0 ? Math.round((count / totalIntents) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: info!.color }}
                />
                <span className="text-gray-600">{info!.label}</span>
                <span className="font-semibold">{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Top Keywords Table (first 5 visible, rest locked) */}
        <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-400">
                  키워드
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-400">
                  월 검색량
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-400">
                  트렌드
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-400">
                  인텐트
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-400">
                  갭 스코어
                </th>
              </tr>
            </thead>
            <tbody>
              {data.topKeywords.slice(0, 5).map((kw) => {
                const intentInfo =
                  INTENT_LABELS[kw.intentCategory] ?? INTENT_LABELS.unknown!;
                return (
                  <tr
                    key={kw.keyword}
                    className="border-t border-gray-50 transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {kw.keyword}
                      {kw.isRising && (
                        <span className="ml-1.5 text-[10px] font-semibold text-emerald-500">
                          HOT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {kw.searchVolume.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`text-[11px] font-semibold ${kw.trend === "rising" ? "text-emerald-600" : kw.trend === "declining" ? "text-red-500" : "text-gray-400"}`}
                      >
                        {kw.trend === "rising"
                          ? "↑ 상승"
                          : kw.trend === "declining"
                            ? "↓ 하락"
                            : "- 안정"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: intentInfo!.color + "15",
                          color: intentInfo!.color,
                        }}
                      >
                        {intentInfo!.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`font-semibold ${kw.gapScore >= 70 ? "text-blue-600" : kw.gapScore >= 40 ? "text-emerald-600" : "text-gray-500"}`}
                      >
                        {kw.gapScore.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Locked rows */}
              {data.topKeywords.length > 5 && (
                <tr className="border-t border-gray-50">
                  <td colSpan={5} className="relative overflow-hidden">
                    {/* Blurred preview of remaining rows */}
                    <div className="pointer-events-none select-none opacity-50 blur-[6px]">
                      {data.topKeywords.slice(5, 8).map((kw) => (
                        <div
                          key={kw.keyword}
                          className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                        >
                          <span>{kw.keyword}</span>
                          <span>{kw.searchVolume.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <div className="text-center">
                        <LockIcon className="mx-auto mb-1" />
                        <p className="text-[13px] font-medium text-gray-500">
                          +{data.topKeywords.length - 5}개 키워드 더보기
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Blue Ocean & Rising */}
        {(data.topBlueOceans.length > 0 || data.topRising.length > 0) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.topBlueOceans.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-blue-600">
                  블루오션 키워드
                </p>
                <ul className="mt-2 space-y-1.5">
                  {data.topBlueOceans.map((b) => (
                    <li
                      key={b.keyword}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="font-medium text-gray-800">
                        {b.keyword}
                      </span>
                      <span className="text-[12px] font-semibold text-blue-600">
                        갭 {b.gapScore.toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.topRising.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-emerald-600">
                  급상승 키워드
                </p>
                <ul className="mt-2 space-y-1.5">
                  {data.topRising.map((r) => (
                    <li
                      key={r.keyword}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="font-medium text-gray-800">
                        {r.keyword}
                      </span>
                      <span className="text-[12px] font-semibold text-emerald-600">
                        ↑ {(r.trendScore * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <SignupCta />
      </div>
    </div>
  );
}

// ── Shared CTA ──

function SignupCta() {
  return (
    <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-center text-white">
      <p className="text-[15px] font-semibold">전체 분석 결과를 확인하세요</p>
      <p className="mt-1 text-[13px] text-blue-100">
        무료 가입으로 상세 지표, AI 인사이트, 경쟁 분석을 모두 이용할 수
        있습니다.
      </p>
      <Link
        href="/signup"
        className="mt-4 inline-block rounded-lg bg-white px-6 py-2.5 text-[14px] font-semibold text-blue-700 hover:bg-blue-50"
      >
        무료로 시작하기
      </Link>
    </div>
  );
}

function KpiBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1 text-[24px] font-bold ${highlight ? "text-blue-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ── Trusted By ──

function TrustedBy() {
  return (
    <section className="border-t border-gray-50 py-14">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-[13px] font-medium uppercase tracking-widest text-gray-400">
          마케터들이 신뢰하는 소셜 분석 플랫폼
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-14 gap-y-6 opacity-40 grayscale">
          {[
            "Samsung",
            "LG",
            "Hyundai",
            "CJ ENM",
            "Kakao",
            "Naver",
            "SK",
            "Lotte",
          ].map((n) => (
            <span
              key={n}
              className="text-[16px] font-bold tracking-tight text-gray-600"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──

function Features() {
  const features = [
    {
      icon: <ChartIcon className="h-6 w-6" />,
      title: "채널 성과 분석",
      desc: "구독자, 조회수, 참여율 등 핵심 KPI를 실시간 추적하고 트렌드를 분석합니다.",
      color: "bg-blue-50",
      ic: "text-blue-600",
    },
    {
      icon: <SearchIntentIcon className="h-6 w-6" />,
      title: "검색 인텐트 분석",
      desc: "키워드의 검색 의도를 분류하고, 블루오션 콘텐츠 기회를 자동으로 발견합니다.",
      color: "bg-violet-50",
      ic: "text-violet-600",
    },
    {
      icon: <CommentIcon className="h-6 w-6" />,
      title: "댓글 감성 분석",
      desc: "AI가 댓글의 감성, 주제, 리스크를 자동 분류하고 FAQ를 추출합니다.",
      color: "bg-emerald-50",
      ic: "text-emerald-600",
    },
    {
      icon: <CompareIcon className="h-6 w-6" />,
      title: "경쟁 채널 벤치마킹",
      desc: "경쟁 채널과 성과를 직접 비교하고 업계 평균 대비 내 채널 위치를 확인합니다.",
      color: "bg-amber-50",
      ic: "text-amber-600",
    },
    {
      icon: <ListenIcon className="h-6 w-6" />,
      title: "소셜 리스닝",
      desc: "브랜드 관련 키워드와 멘션을 실시간 모니터링합니다.",
      color: "bg-rose-50",
      ic: "text-rose-600",
    },
    {
      icon: <ReportIcon className="h-6 w-6" />,
      title: "자동 리포트",
      desc: "주간/월간 분석 리포트를 자동 생성하고 팀과 공유합니다.",
      color: "bg-cyan-50",
      ic: "text-cyan-600",
    },
  ];

  return (
    <section
      id="features"
      className="border-t border-gray-100 bg-gray-50/40 py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            Features
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            소셜 미디어 성장에 필요한
            <br />
            모든 분석 도구
          </h2>
          <p className="mt-4 text-[16px] text-gray-500">
            데이터 수집부터 AI 인사이트까지, 하나의 플랫폼에서 해결하세요.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/80"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.color} ${f.ic}`}
              >
                {f.icon}
              </div>
              <h3 className="mt-5 text-[16px] font-bold">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──

function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            How It Works
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            3단계로 시작하세요
          </h2>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: 1,
              title: "채널 URL 또는 키워드 입력",
              desc: "분석할 채널 URL이나 키워드를 입력하세요. 플랫폼을 자동 감지합니다.",
            },
            {
              step: 2,
              title: "AI가 자동 분석",
              desc: "채널 지표, 검색 인텐트, 댓글 감성 등 모든 데이터를 AI가 분석합니다.",
            },
            {
              step: 3,
              title: "인사이트 확인 & 실행",
              desc: "맞춤형 성장 전략과 콘텐츠 기회를 확인하고 바로 실행에 옮기세요.",
            },
          ].map((s, i) => (
            <div key={s.step} className="relative text-center">
              {i < 2 && (
                <div className="absolute right-0 top-8 hidden h-[2px] w-full translate-x-1/2 bg-gradient-to-r from-blue-200 to-transparent sm:block" />
              )}
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-[22px] font-bold text-white shadow-lg shadow-blue-200/50">
                {s.step}
              </div>
              <h3 className="mt-5 text-[17px] font-bold">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-gray-500">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Use Cases ──

function UseCases() {
  return (
    <section className="border-t border-gray-100 bg-gray-50/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            Use Cases
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            다양한 팀이 X2를 사용합니다
          </h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            {
              quote:
                "내 채널의 성장 트렌드와 최적 업로드 시간을 한눈에 확인할 수 있어요.",
              name: "김민수",
              role: "YouTube 크리에이터 · 구독자 12만",
            },
            {
              quote:
                "경쟁사 벤치마킹과 인텐트 분석으로 콘텐츠 전략을 완전히 바꿨습니다.",
              name: "이지현",
              role: "뷰티 브랜드 · 마케팅 매니저",
            },
            {
              quote:
                "20개 채널을 동시에 관리하면서 리포트를 자동 생성하니 업무 시간이 70% 줄었어요.",
              name: "박준영",
              role: "MCN · 운영팀장",
            },
          ].map((c) => (
            <div
              key={c.name}
              className="rounded-2xl border border-gray-100 bg-white p-6"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>
              <p className="text-[14px] leading-relaxed text-gray-600">
                "{c.quote}"
              </p>
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-[14px] font-semibold">{c.name}</p>
                <p className="text-[12px] text-gray-400">{c.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "0",
      desc: "소셜 분석을 처음 시작하는 분",
      features: [
        "채널 1개 등록",
        "기본 KPI 분석",
        "인텐트 분석 월 3회",
        "콘텐츠 최근 5개",
      ],
      cta: "무료로 시작하기",
      hl: false,
    },
    {
      name: "Growth",
      price: "49,000",
      desc: "성장 중인 크리에이터와 마케터",
      features: [
        "채널 10개 등록",
        "상세 분석 + 트렌드",
        "인텐트 분석 무제한",
        "댓글 AI 감성 분석",
        "경쟁 채널 5개",
        "월간 리포트 3회",
      ],
      cta: "Growth 시작하기",
      hl: true,
    },
    {
      name: "Pro",
      price: "149,000",
      desc: "에이전시와 대규모 브랜드",
      features: [
        "채널 30개 등록",
        "전체 기능 무제한",
        "경쟁 채널 15개",
        "리포트 자동 스케줄",
        "이메일 발송 + 공유",
        "전담 지원",
      ],
      cta: "Pro 시작하기",
      hl: false,
    },
  ];

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            Pricing
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            심플한 요금제
          </h2>
          <p className="mt-4 text-[16px] text-gray-500">
            무료로 시작하고, 필요에 맞게 업그레이드하세요.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-7 ${p.hl ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200/40" : "border-gray-200 bg-white"}`}
            >
              {p.hl && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-[11px] font-bold text-black">
                  인기
                </span>
              )}
              <h3 className="text-[18px] font-bold">{p.name}</h3>
              <p
                className={`mt-1 text-[13px] ${p.hl ? "text-blue-200" : "text-gray-400"}`}
              >
                {p.desc}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[36px] font-extrabold">
                  {p.price === "0" ? "무료" : `₩${p.price}`}
                </span>
                {p.price !== "0" && (
                  <span
                    className={`text-[14px] ${p.hl ? "text-blue-200" : "text-gray-400"}`}
                  >
                    /월
                  </span>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[14px]">
                    <CheckIcon hl={p.hl} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-7 block rounded-xl py-3 text-center text-[14px] font-semibold transition-colors ${p.hl ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-black text-white hover:bg-gray-800"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──

function Faq() {
  const faqs = [
    {
      q: "로그인 없이 어디까지 분석할 수 있나요?",
      a: "채널 URL을 입력하면 기본 지표(구독자, 조회수)를 확인할 수 있고, 인텐트 분석은 키워드당 상위 5개 결과를 미리볼 수 있습니다. 전체 결과는 무료 가입 후 확인 가능합니다.",
    },
    {
      q: "인텐트 분석은 어떤 데이터를 사용하나요?",
      a: "Google 자동완성, 연관 검색어, 네이버 트렌드, 소셜 미디어 해시태그 볼륨 등을 수집하고 AI가 검색 의도를 분류합니다.",
    },
    {
      q: "어떤 소셜 미디어 플랫폼을 지원하나요?",
      a: "YouTube, Instagram, TikTok, X(Twitter)를 지원하며, Facebook, Threads 등 추가 플랫폼을 지속 확장 중입니다.",
    },
    {
      q: "API 키는 왜 필요한가요?",
      a: "각 플랫폼의 공식 API를 통해 실시간 데이터를 수집합니다. 기본 분석은 API 키 없이도 가능합니다.",
    },
    {
      q: "팀 멤버와 함께 사용할 수 있나요?",
      a: "Pro 플랜에서는 워크스페이스에 팀 멤버를 초대하고 역할을 지정할 수 있습니다.",
    },
    {
      q: "언제든지 요금제를 변경할 수 있나요?",
      a: "업그레이드는 즉시, 다운그레이드는 다음 결제일부터 적용됩니다. 위약금 없이 자유롭게 변경 가능합니다.",
    },
  ];

  return (
    <section id="faq" className="border-t border-gray-100 bg-gray-50/40 py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-blue-600">
            FAQ
          </p>
          <h2 className="mt-3 text-[30px] font-extrabold tracking-tight sm:text-[36px]">
            자주 묻는 질문
          </h2>
        </div>
        <div className="mt-12 divide-y divide-gray-200">
          {faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[15px] font-semibold text-gray-900">{q}</span>
        <span
          className={`ml-4 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-45" : ""}`}
        >
          <PlusIcon />
        </span>
      </button>
      {open && (
        <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{a}</p>
      )}
    </div>
  );
}

// ── Final CTA ──

function FinalCta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-black px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-[30px] font-extrabold text-white sm:text-[40px]">
              지금 바로 시작하세요
            </h2>
            <p className="mt-4 text-[16px] text-gray-400">
              무료 플랜으로 시작하고, 데이터 기반의 소셜 미디어 전략을
              경험하세요.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-black shadow-lg hover:bg-gray-100 hover:shadow-xl"
              >
                무료로 시작하기
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-gray-700 px-8 py-3.5 text-[15px] font-semibold text-gray-300 hover:border-gray-500 hover:text-white"
              >
                로그인
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/60 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-[10px] font-bold text-white">
                X2
              </div>
              <span className="text-[14px] font-bold">X2</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
              AI 기반 소셜 미디어 분석 및<br />
              소셜 리스닝 플랫폼
            </p>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              제품
            </h4>
            <ul className="mt-3 space-y-2 text-[14px] text-gray-600">
              <li>
                <a href="#features" className="hover:text-black">
                  기능
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-black">
                  요금제
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-black">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              지원
            </h4>
            <ul className="mt-3 space-y-2 text-[14px] text-gray-600">
              <li>
                <span className="text-gray-400">가이드 (준비 중)</span>
              </li>
              <li>
                <span className="text-gray-400">API 문서 (준비 중)</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400">
              법적
            </h4>
            <ul className="mt-3 space-y-2 text-[14px] text-gray-600">
              <li>
                <Link href="/terms" className="hover:text-black">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-black">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-200 pt-6 text-center text-[13px] text-gray-400">
          &copy; 2026 X2. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// ── Icons ──

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function SearchIntentIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 text-gray-300 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ChartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function CommentIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function CompareIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function ListenIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      />
    </svg>
  );
}

function ReportIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="h-4 w-4 text-amber-400"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CheckIcon({ hl }: { hl: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 ${hl ? "text-blue-200" : "text-emerald-500"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
}
