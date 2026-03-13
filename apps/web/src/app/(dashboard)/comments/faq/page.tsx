"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared";
import {
  HelpCircle,
  AlertTriangle,
  MessageSquare,
  ArrowRight,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function CommentsFaqPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="FAQ & 이슈"
        description="댓글에서 자동 추출된 자주 묻는 질문과 리스크 시그널을 확인하세요"
      />

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <HelpCircle className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            미답변 FAQ
          </p>
          <p className="mt-1 text-[22px] font-bold text-[var(--foreground)]">
            &mdash;
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            분석 데이터 대기 중
          </p>
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            리스크 시그널
          </p>
          <p className="mt-1 text-[22px] font-bold text-[var(--foreground)]">
            &mdash;
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            분석 데이터 대기 중
          </p>
        </div>
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            분석된 댓글
          </p>
          <p className="mt-1 text-[22px] font-bold text-[var(--foreground)]">
            &mdash;
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            분석 데이터 대기 중
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-500" />
          <h2 className="text-[15px] font-semibold">자주 묻는 질문 (FAQ)</h2>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted-foreground)]">
          댓글에서 반복적으로 등장하는 질문을 자동 추출합니다. FAQ 콘텐츠로
          전환하면 CS 부담을 줄이고 검색 유입을 늘릴 수 있습니다.
        </p>
        <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            댓글 분석이 완료되면 FAQ 후보가 멘션 횟수와 함께 표시됩니다
          </p>
        </div>
      </div>

      {/* Risk Signals Section */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          <h2 className="text-[15px] font-semibold">리스크 시그널</h2>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted-foreground)]">
          부정적 댓글 중 에스컬레이션이 필요한 위험 신호를 자동 감지합니다.
          심각도(CRITICAL, HIGH, MEDIUM, LOW)별로 분류됩니다.
        </p>
        <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            리스크 분석이 완료되면 심각도별 시그널 목록이 표시됩니다
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          href="/comments"
          className="card flex-1 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-violet-500" />
            <div>
              <p className="text-[13px] font-semibold">댓글 분석 대시보드</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                전체 감성/주제 분석 보기
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
        </Link>
        <Link
          href="/insights/actions"
          className="card flex-1 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-[13px] font-semibold">대응 액션</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                FAQ/리스크 기반 추천 액션
              </p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
        </Link>
      </div>
    </div>
  );
}
