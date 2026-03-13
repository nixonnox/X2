"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic analytics",
    features: [
      "1 Channel",
      "Basic analytics",
      "7-day data retention",
      "Community support",
    ],
    current: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For creators and small teams",
    features: [
      "10 Channels",
      "Advanced analytics",
      "30-day data retention",
      "AI insights",
      "Comment analysis",
      "Priority support",
    ],
    current: false,
    popular: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    description: "For agencies and enterprises",
    features: [
      "Unlimited channels",
      "Full analytics suite",
      "Unlimited data retention",
      "AI strategy reports",
      "Competitor analysis",
      "API access",
      "Dedicated support",
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
                Popular
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
              {plan.current ? "Current Plan" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
