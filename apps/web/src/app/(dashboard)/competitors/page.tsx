"use client";

import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared";
import { CompetitorSelector } from "@/components/competitors";
import { useCompetitorsData } from "@/hooks/use-competitors-data";
import { useState } from "react";

export default function CompetitorsPage() {
  const t = useTranslations("competitors");
  const {
    competitors,
    ownChannels,
    isLoading: dataLoading,
  } = useCompetitorsData();

  const [selectedId, setSelectedId] = useState(competitors[0]?.id ?? "");

  if (dataLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          guide={t("guide")}
        >
          <Link href="/competitors/add" className="btn-primary">
            <Plus className="h-3.5 w-3.5" />
            경쟁사 추가
          </Link>
        </PageHeader>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)] py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
            <span className="text-2xl">⚔️</span>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">
            경쟁사가 등록되지 않았어요
          </h3>
          <p className="mt-2 max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
            경쟁 채널을 등록하면 구독자, 참여율, 콘텐츠 전략을 비교 분석할 수
            있어요.
          </p>
          <a
            href="/competitors/add"
            className="btn-primary mt-5 inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors"
          >
            경쟁사 추가하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      >
        <Link href="/competitors/add" className="btn-primary">
          <Plus className="h-3.5 w-3.5" />
          경쟁사 추가
        </Link>
      </PageHeader>

      {/* ── Competitor Selector ── */}
      <div className="card p-4">
        <p className="mb-2 text-[12px] font-medium text-[var(--muted-foreground)]">
          비교할 경쟁사를 선택하세요
        </p>
        <CompetitorSelector
          competitors={competitors}
          selectedId={selectedId}
          onChange={setSelectedId}
        />
      </div>

      {/* ── Data collection notice ── */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)] py-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
          <span className="text-2xl">📊</span>
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">
          비교 분석 데이터를 수집 중이에요
        </h3>
        <p className="mt-2 max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
          경쟁사 채널이 등록되었어요. 구독자 성장, 참여율, 콘텐츠 전략 비교 등
          상세 분석 데이터가 준비되면 이곳에 표시됩니다.
        </p>
      </div>
    </div>
  );
}
