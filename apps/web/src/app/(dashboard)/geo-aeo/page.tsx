"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared";
import {
  Globe,
  Search,
  FileCheck,
  TrendingUp,
  ArrowRight,
  Shield,
  Eye,
  BookOpen,
} from "lucide-react";

export default function GeoAeoPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="GEO / AEO 최적화"
        description="AI 검색 엔진(Google AI Overview, Perplexity, Bing Copilot 등)에서 브랜드가 인용될 준비가 되어있는지 확인하세요"
      />

      {/* Overview Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Eye,
            label: "인용 준비도",
            value: "분석 대기",
            color: "bg-blue-50 text-blue-600",
            description: "AI가 인용하기 좋은 구조인지",
          },
          {
            icon: BookOpen,
            label: "답변 가능성",
            value: "분석 대기",
            color: "bg-emerald-50 text-emerald-600",
            description: "질문에 직접 답하는 콘텐츠인지",
          },
          {
            icon: Shield,
            label: "출처 신뢰도",
            value: "분석 대기",
            color: "bg-violet-50 text-violet-600",
            description: "신뢰할 수 있는 출처로 인식되는지",
          },
          {
            icon: FileCheck,
            label: "구조 품질",
            value: "분석 대기",
            color: "bg-amber-50 text-amber-600",
            description: "헤딩, 목록, FAQ 등 구조 요소",
          },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}
              >
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {item.label}
              </span>
            </div>
            <p className="text-[18px] font-bold text-[var(--foreground)]">
              {item.value}
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Tracked Keywords */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
              추적 키워드
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
              AI 검색 엔진별 브랜드 인용 현황
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
          <Search className="mx-auto mb-2 h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mb-3 text-[13px] text-[var(--muted-foreground)]">
            키워드를 등록하면 Google AI Overview, Perplexity, Bing Copilot
            등에서
            <br />
            브랜드가 인용되는지 추적합니다.
          </p>
          <Link
            href="/keywords"
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-[13px]"
          >
            키워드 등록하기 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="card p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-[var(--foreground)]">
          최적화 권고
        </h2>
        <p className="mb-4 text-[12px] text-[var(--muted-foreground)]">
          AI 인용 친화도를 높이기 위한 액션
        </p>

        <div className="space-y-2">
          {[
            {
              title: "FAQ 형식 콘텐츠 추가",
              description:
                "질문-답변 구조로 작성하면 AI가 직접 인용할 확률이 높아집니다",
              priority: "높음",
            },
            {
              title: "구조화 데이터 마크업",
              description: "Schema.org FAQ/HowTo 마크업을 추가하세요",
              priority: "보통",
            },
            {
              title: "최신 날짜 표시",
              description:
                "콘텐츠에 작성일/수정일을 명시하면 신뢰도가 높아집니다",
              priority: "보통",
            },
          ].map((rec) => (
            <div
              key={rec.title}
              className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--secondary)]"
            >
              <div
                className={`badge mt-0.5 ${rec.priority === "높음" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}
              >
                {rec.priority}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">
                  {rec.title}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {rec.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connection to Insights */}
      <div className="flex gap-3">
        <Link
          href="/insights"
          className="card flex-1 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-[13px] font-semibold">인사이트에서 확인</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                GEO/AEO 관련 인사이트 보기
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
        </Link>
        <Link
          href="/insights/reports/new"
          className="card flex-1 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-[13px] font-semibold">리포트에 포함</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                GEO/AEO 시사점을 리포트로 생성
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
        </Link>
      </div>
    </div>
  );
}
