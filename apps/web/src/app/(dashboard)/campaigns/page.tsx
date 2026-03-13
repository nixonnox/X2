"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared";
import {
  Rocket,
  TrendingUp,
  Users,
  ArrowRight,
  Plus,
  BarChart3,
} from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="캠페인 & 실행"
        description="인사이트에서 도출된 액션을 실제 캠페인으로 전환하고 성과를 추적하세요"
      >
        <button className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13px]">
          <Plus className="h-4 w-4" />새 캠페인
        </button>
      </PageHeader>

      {/* Flow description */}
      <div className="card border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-5">
        <div className="flex items-center gap-3 text-[13px]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <span className="font-medium">분석</span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <Rocket className="h-4 w-4 text-blue-600" />
            </div>
            <span className="font-medium">실행</span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-medium">측정</span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-[var(--muted-foreground)]">재분석</span>
        </div>
        <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
          추천 액션에서 캠페인을 생성하면, 성과 측정 후 다시 분석으로 이어지는
          선순환 루프가 완성됩니다
        </p>
      </div>

      {/* Campaign Types */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "인플루언서 캠페인",
            icon: Users,
            description: "추천 인플루언서와 협업하여 브랜드 인지도를 높이세요",
            color: "bg-violet-50 text-violet-600",
          },
          {
            title: "콘텐츠 캠페인",
            icon: TrendingUp,
            description: "블루오션 키워드 기반의 콘텐츠를 기획하세요",
            color: "bg-emerald-50 text-emerald-600",
          },
          {
            title: "광고 캠페인",
            icon: BarChart3,
            description: "성과 데이터 기반 광고 전략을 실행하세요",
            color: "bg-blue-50 text-blue-600",
          },
        ].map((type) => (
          <div key={type.title} className="card p-5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${type.color} mb-3`}
            >
              <type.icon className="h-5 w-5" />
            </div>
            <h3 className="mb-1 text-[14px] font-semibold">{type.title}</h3>
            <p className="mb-3 text-[12px] text-[var(--muted-foreground)]">
              {type.description}
            </p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <div className="card p-8 text-center">
        <Rocket className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
        <h3 className="mb-1 text-[15px] font-semibold">
          캠페인이 아직 없습니다
        </h3>
        <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--muted-foreground)]">
          인사이트 페이지의 추천 액션에서 "캠페인으로 전환" 버튼을 클릭하거나,
          직접 새 캠페인을 생성하세요.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/insights/actions"
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-[13px]"
          >
            추천 액션 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
