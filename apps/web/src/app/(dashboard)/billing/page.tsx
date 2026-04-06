"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "무료",
    description: "기본 분석 기능으로 시작하세요",
    features: ["채널 1개", "기본 분석", "7일 데이터 보관", "커뮤니티 지원"],
    current: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/월",
    description: "크리에이터 및 소규모 팀을 위한 플랜",
    features: [
      "채널 10개",
      "고급 분석",
      "30일 데이터 보관",
      "AI 인사이트",
      "댓글 분석",
      "우선 지원",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "/월",
    description: "에이전시 및 기업을 위한 플랜",
    features: [
      "무제한 채널",
      "전체 분석 기능",
      "무제한 데이터 보관",
      "AI 전략 리포트",
      "경쟁사 분석",
      "API 접근",
      "전담 지원",
    ],
    current: false,
  },
];

export default function BillingPage() {
  const t = useTranslations("billing");

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`card relative p-5 ${
              plan.popular
                ? "border-[var(--foreground)] ring-1 ring-[var(--foreground)]"
                : ""
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-md bg-[var(--foreground)] px-2.5 py-0.5 text-[11px] font-medium text-white">
                인기
              </span>
            )}
            <h3 className="text-[15px] font-semibold">{plan.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold">{plan.price}</span>
              <span className="text-[13px] text-[var(--muted-foreground)]">
                {plan.period}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              {plan.description}
            </p>
            <ul className="mt-5 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px]">
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`mt-5 w-full rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                plan.current
                  ? "btn-secondary cursor-default opacity-60"
                  : "btn-primary justify-center"
              }`}
              disabled={plan.current}
            >
              {plan.current ? "현재 플랜" : "업그레이드"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
