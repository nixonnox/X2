"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  AlertTriangle,
  Check,
  CheckCheck,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

type FilterState = {
  unreadOnly: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
  sourceType: string | undefined;
  since: string | undefined;
  search: string;
};

const PRIORITY_OPTIONS = [
  { value: undefined, label: "전체" },
  { value: "URGENT" as const, label: "긴급", color: "bg-red-100 text-red-700" },
  { value: "HIGH" as const, label: "중요", color: "bg-amber-100 text-amber-700" },
  { value: "NORMAL" as const, label: "일반", color: "bg-blue-100 text-blue-700" },
  { value: "LOW" as const, label: "낮음", color: "bg-gray-100 text-gray-600" },
];

const SOURCE_OPTIONS = [
  { value: undefined, label: "전체" },
  { value: "intelligence_alert", label: "Intelligence" },
  { value: "system", label: "시스템" },
];

const SINCE_OPTIONS = [
  { value: undefined, label: "전체 기간" },
  { value: "1d", label: "오늘" },
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
];

function getSinceDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const now = new Date();
  if (value === "1d") now.setDate(now.getDate() - 1);
  else if (value === "7d") now.setDate(now.getDate() - 7);
  else if (value === "30d") now.setDate(now.getDate() - 30);
  return now.toISOString();
}

function formatTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ───────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    unreadOnly: false,
    priority: undefined,
    sourceType: undefined,
    since: undefined,
    search: "",
  });

  const listQuery = trpc.notification.list.useQuery({
    page,
    pageSize: 20,
    unreadOnly: filters.unreadOnly,
    priority: filters.priority,
    sourceType: filters.sourceType,
    since: getSinceDate(filters.since),
    search: filters.search || undefined,
  });

  const unreadCountQuery = trpc.notification.unreadCount.useQuery();

  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      unreadCountQuery.refetch();
    },
  });

  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      unreadCountQuery.refetch();
    },
  });

  const data = listQuery.data as any;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = (unreadCountQuery.data as any)?.count ?? 0;

  const hasActiveFilters =
    filters.unreadOnly ||
    filters.priority !== undefined ||
    filters.sourceType !== undefined ||
    filters.since !== undefined ||
    filters.search.length > 0;

  const clearFilters = useCallback(() => {
    setFilters({
      unreadOnly: false,
      priority: undefined,
      sourceType: undefined,
      since: undefined,
      search: "",
    });
    setPage(1);
  }, []);

  const handleItemClick = useCallback(
    (n: any) => {
      if (!n.isRead) {
        markReadMutation.mutate({ id: n.id });
      }
      if (n.actionUrl) {
        router.push(n.actionUrl);
      }
    },
    [markReadMutation, router],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">알림</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {unreadCount > 0
              ? `읽지 않은 알림이 ${unreadCount}건 있어요`
              : "모든 알림을 확인했어요"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              모두 읽음 처리
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              hasActiveFilters
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            필터
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700">필터 설정</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" /> 초기화
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {/* Read state */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">상태</label>
              <div className="flex gap-1">
                <button
                  onClick={() => { setFilters((f) => ({ ...f, unreadOnly: false })); setPage(1); }}
                  className={`rounded-md px-2.5 py-1 text-[11px] ${!filters.unreadOnly ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  전체
                </button>
                <button
                  onClick={() => { setFilters((f) => ({ ...f, unreadOnly: true })); setPage(1); }}
                  className={`rounded-md px-2.5 py-1 text-[11px] ${filters.unreadOnly ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  안읽음
                </button>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">중요도</label>
              <select
                value={filters.priority ?? ""}
                onChange={(e) => { setFilters((f) => ({ ...f, priority: (e.target.value || undefined) as any })); setPage(1); }}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-indigo-300"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ""}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Source type */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">유형</label>
              <select
                value={filters.sourceType ?? ""}
                onChange={(e) => { setFilters((f) => ({ ...f, sourceType: e.target.value || undefined })); setPage(1); }}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-indigo-300"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ""}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-gray-500">기간</label>
              <select
                value={filters.since ?? ""}
                onChange={(e) => { setFilters((f) => ({ ...f, since: e.target.value || undefined })); setPage(1); }}
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-indigo-300"
              >
                {SINCE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ""}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
                placeholder="알림에서 찾기..."
                className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-indigo-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Loading */}
        {listQuery.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">알림을 불러오는 중이에요</span>
          </div>
        )}

        {/* Error */}
        {listQuery.isError && (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-red-400 mb-2" />
            <p className="text-sm text-red-500">알림을 불러오지 못했어요</p>
            <button
              onClick={() => listQuery.refetch()}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Empty */}
        {!listQuery.isLoading && !listQuery.isError && items.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-7 w-7 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {hasActiveFilters
                ? "조건에 맞는 알림이 없어요. 필터를 바꿔보면 찾을 수 있어요."
                : "새로운 알림이 없어요. 분석하면서 중요한 변화가 생기면 여기에 알려드려요."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                필터 초기화
              </button>
            )}
          </div>
        )}

        {/* Items */}
        {items.map((n: any) => (
          <div
            key={n.id}
            onClick={() => handleItemClick(n)}
            className={`flex items-start gap-3 border-b border-gray-100 px-4 py-3.5 transition-colors hover:bg-gray-50 cursor-pointer ${
              !n.isRead ? "bg-blue-50/30" : ""
            }`}
          >
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {n.priority === "URGENT" ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : n.priority === "HIGH" ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <Bell className="h-4 w-4 text-gray-400" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {n.title && (
                  <span className={`text-[13px] truncate ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                    {n.title.replace("Intelligence Alert: ", "")}
                  </span>
                )}
                {!n.isRead && (
                  <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
              <p className={`text-[12px] leading-relaxed ${!n.isRead ? "text-gray-700" : "text-gray-500"}`}>
                {n.message}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-gray-400">{formatTime(n.createdAt)}</span>
                {n.priority && n.priority !== "NORMAL" && n.priority !== "LOW" && (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                    n.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {n.priority === "URGENT" ? "긴급" : "중요"}
                  </span>
                )}
                {n.sourceType === "intelligence_alert" && (
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">
                    Intelligence
                  </span>
                )}
                {n.actionUrl && (
                  <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                    <ExternalLink className="h-2.5 w-2.5" /> 자세히 보기
                  </span>
                )}
              </div>
            </div>

            {/* Read action */}
            <div className="shrink-0">
              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markReadMutation.mutate({ id: n.id });
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="읽음 처리"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            총 {total}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)}건
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 text-xs text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-center">
        <p className="text-[11px] text-gray-400">
          분석하면서 경고 증가, 신뢰도 변화, 기준 점수 하락 같은 중요한 변화가 감지되면 알림을 보내드려요.
        </p>
      </div>
    </div>
  );
}
