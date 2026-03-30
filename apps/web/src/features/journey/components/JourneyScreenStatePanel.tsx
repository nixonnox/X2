/**
 * JourneyScreenStatePanel
 *
 * loading / empty / error / partial / low confidence / stale 상태를 표시한다.
 * persona-cluster의 ScreenStatePanel과 동일한 패턴이지만 JourneyScreenState 전용.
 */

"use client";

import { Loader2, AlertCircle, AlertTriangle, Info, Clock } from "lucide-react";
import type { JourneyScreenState } from "../types/viewModel";

type Props = {
  state: JourneyScreenState;
  keyword?: string;
  loadingMessage?: string;
};

export function JourneyScreenStatePanel({ state, keyword, loadingMessage }: Props) {
  // Loading
  if (state.status === "loading") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <p className="text-[13px] text-blue-700">
          {loadingMessage ?? "분석하고 있습니다..."}
        </p>
      </div>
    );
  }

  // Error
  if (state.hasError) {
    return (
      <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-[13px] font-medium text-red-700">분석 실패</p>
            <p className="mt-0.5 text-[12px] text-red-600">
              {state.errorMessage ?? "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success states
  if (state.status !== "success") return null;

  const banners: React.ReactNode[] = [];

  if (state.isEmpty) {
    banners.push(
      <div key="empty" className="rounded-md bg-gray-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          <div>
            <p className="text-[13px] font-medium text-gray-700">분석 결과가 없습니다</p>
            <p className="mt-0.5 text-[12px] text-gray-600">
              {keyword
                ? `"${keyword}"에 대한 충분한 데이터를 찾지 못했습니다. 다른 키워드를 시도해보세요.`
                : "키워드를 변경하거나 분석 조건을 조정해보세요."}
            </p>
          </div>
        </div>
      </div>,
    );
  }

  if (state.isPartial) {
    banners.push(
      <div key="partial" className="rounded-md bg-amber-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-[12px] text-amber-700">
            일부 데이터 소스에서 수집에 실패하여 부분적인 결과만 표시됩니다.
          </p>
        </div>
      </div>,
    );
  }

  if (state.lowConfidenceItems > 0) {
    banners.push(
      <div key="lowconf" className="rounded-md bg-orange-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            {state.lowConfidenceItems}개 항목의 신뢰도가 낮습니다. 결과 해석 시 참고해주세요.
          </p>
        </div>
      </div>,
    );
  }

  if (state.staleData && state.lastUpdatedAt) {
    banners.push(
      <div key="stale" className="rounded-md bg-gray-50 px-3 py-2">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          <p className="text-[12px] text-gray-600">
            마지막 분석: {formatRelativeTime(state.lastUpdatedAt)}. 최신 데이터가 아닐 수 있습니다.
          </p>
        </div>
      </div>,
    );
  }

  if (banners.length === 0) return null;

  return <div className="mt-3 space-y-2">{banners}</div>;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
