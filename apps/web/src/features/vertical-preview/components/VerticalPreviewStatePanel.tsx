"use client";

/**
 * VerticalPreviewStatePanel
 *
 * 프리뷰 화면의 상태별 UI 패널.
 * idle / loading / error / success(empty/warnings) 상태를 처리.
 */

import React from "react";
import type { VerticalPreviewScreenState } from "../types/viewModel";

type Props = {
  screenState: VerticalPreviewScreenState;
};

export function VerticalPreviewStatePanel({ screenState }: Props) {
  // Loading
  if (screenState.status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">{screenState.loadingMessage}</p>
        </div>
      </div>
    );
  }

  // Error
  if (screenState.hasError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-lg">!</span>
          <div>
            <h4 className="font-medium text-red-800">프리뷰 생성 오류</h4>
            <p className="text-sm text-red-600 mt-1">{screenState.errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // Success but empty
  if (screenState.status === "success" && screenState.isEmpty) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">비교 결과가 없습니다. 입력 데이터를 확인해주세요.</p>
      </div>
    );
  }

  // Quality warnings (success + data exists)
  if (screenState.status === "success" && screenState.qualityWarnings.length > 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-500">!</span>
          <div className="space-y-1">
            {screenState.isMockBased && (
              <p className="text-sm text-amber-700">Mock 데이터 기반 — 실제 검색 결과와 차이가 있을 수 있습니다.</p>
            )}
            {screenState.isStale && (
              <p className="text-sm text-amber-700">Stale 데이터 — 최신 데이터로 재검색을 권장합니다.</p>
            )}
            {screenState.isPartial && (
              <p className="text-sm text-amber-700">Partial 데이터 — 일부 소스의 데이터가 누락되었습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Idle — 초기 상태 안내
  if (screenState.status === "idle") {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <h3 className="font-medium text-gray-700 mb-2">업종별 비교 프리뷰</h3>
        <p className="text-sm text-gray-500">
          키워드와 문서 유형을 선택하고 비교를 시작하세요.
          <br />
          같은 데이터로 Beauty / F&B / Finance / Entertainment 4개 업종의
          <br />
          결과 차이를 비교할 수 있습니다.
        </p>
      </div>
    );
  }

  return null;
}
