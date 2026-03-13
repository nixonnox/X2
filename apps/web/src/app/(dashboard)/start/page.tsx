"use client";

import Link from "next/link";
import {
  Tv,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Sparkles,
  BarChart3,
  HelpCircle,
} from "lucide-react";

const ENTRY_PATHS = [
  {
    id: "social",
    icon: Tv,
    color: "bg-blue-50 text-blue-600",
    borderColor: "border-blue-200 hover:border-blue-400",
    title: "소셜 채널 분석",
    subtitle: "우리 채널 성과를 먼저 보고 싶어요",
    description:
      "YouTube, Instagram, TikTok 등 소셜 채널을 등록하고 성과를 분석합니다. 채널 성과 → 왜 그런지 → 다음에 무엇을 할지 흐름으로 안내합니다.",
    needs: "채널 URL (YouTube, Instagram, TikTok, X 등)",
    results: [
      "채널 성과 대시보드",
      "콘텐츠 분석",
      "댓글 감성 분석",
      "경쟁 채널 비교",
      "인사이트 및 액션 추천",
    ],
    href: "/channels/new",
    cta: "채널 등록하고 시작하기",
  },
  {
    id: "listening",
    icon: TrendingUp,
    color: "bg-emerald-50 text-emerald-600",
    borderColor: "border-emerald-200 hover:border-emerald-400",
    title: "소셜 리스닝",
    subtitle: "요즘 고객이 무엇을 찾는지 알고 싶어요",
    description:
      "브랜드, 제품, 경쟁사 키워드를 등록하고 소셜 트렌드와 검색 의도를 분석합니다. 키워드 → 의도 → 클러스터 → 여정 시각화를 제공합니다.",
    needs: "브랜드명, 제품명, 경쟁사명 등 키워드",
    results: [
      "키워드 트렌드 추이",
      "검색 의도 분석",
      "클러스터 & 여정 맵",
      "블루오션 키워드 발견",
      "콘텐츠 기회 제안",
    ],
    href: "/keywords",
    cta: "키워드 등록하고 시작하기",
  },
  {
    id: "comments",
    icon: MessageSquare,
    color: "bg-violet-50 text-violet-600",
    borderColor: "border-violet-200 hover:border-violet-400",
    title: "댓글 & 이슈 분석",
    subtitle: "댓글과 이슈를 먼저 파악하고 싶어요",
    description:
      "채널 댓글의 감성, 주제, FAQ, 리스크를 자동 분석합니다. 운영 담당자가 바로 대응할 수 있는 실무 중심 화면을 제공합니다.",
    needs: "분석할 채널 (등록된 채널의 댓글을 수집합니다)",
    results: [
      "감성 분포 (긍정/중립/부정)",
      "주제별 분류",
      "FAQ 자동 추출",
      "리스크 시그널 감지",
      "대응 권고 액션",
    ],
    href: "/comments",
    cta: "댓글 분석 시작하기",
  },
];

export default function StartHubPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[13px] font-medium text-blue-700">
          <Sparkles className="h-3.5 w-3.5" />
          무엇을 가장 먼저 알고 싶으신가요?
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--foreground)]">
          분석 시작하기
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[15px] text-[var(--muted-foreground)]">
          목적에 맞는 시작점을 선택하세요. 어디서 시작하든 인사이트, 액션,
          리포트로 이어집니다.
        </p>
      </div>

      {/* Entry Path Cards */}
      <div className="space-y-4">
        {ENTRY_PATHS.map((path) => (
          <div
            key={path.id}
            className={`card border-2 ${path.borderColor} p-6 transition-all duration-200`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${path.color}`}
              >
                <path.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-[var(--foreground)]">
                    {path.title}
                  </h2>
                </div>
                <p className="mb-2 text-[14px] font-medium text-blue-600">
                  &ldquo;{path.subtitle}&rdquo;
                </p>
                <p className="mb-4 text-[13px] text-[var(--muted-foreground)]">
                  {path.description}
                </p>

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      필요한 것
                    </p>
                    <p className="text-[13px] text-[var(--foreground)]">
                      {path.needs}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      얻게 되는 결과
                    </p>
                    <ul className="space-y-0.5">
                      {path.results.map((r) => (
                        <li
                          key={r}
                          className="flex items-center gap-1.5 text-[12px] text-[var(--foreground)]"
                        >
                          <span className="h-1 w-1 rounded-full bg-[var(--muted-foreground)]" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link
                  href={path.href}
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-[14px]"
                >
                  {path.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/insights"
          className="card p-4 text-center transition-colors hover:bg-[var(--secondary)]"
        >
          <Sparkles className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-[13px] font-semibold">인사이트 확인</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            이미 데이터가 있다면
          </p>
        </Link>
        <Link
          href="/insights/reports"
          className="card p-4 text-center transition-colors hover:bg-[var(--secondary)]"
        >
          <BarChart3 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
          <p className="text-[13px] font-semibold">리포트 보기</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            생성된 리포트 확인
          </p>
        </Link>
        <Link
          href="/geo-aeo"
          className="card p-4 text-center transition-colors hover:bg-[var(--secondary)]"
        >
          <HelpCircle className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
          <p className="text-[13px] font-semibold">GEO/AEO</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            AI 검색 최적화
          </p>
        </Link>
      </div>
    </div>
  );
}
