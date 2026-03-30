"use client";

/**
 * VerticalPreviewBoard
 *
 * 4개 업종 비교 프리뷰의 메인 레이아웃 컴포넌트.
 * 상단: 입력 요약 + 업종 추천 뱃지 + 전체 차이 스코어
 * 중단: 4컬럼 비교 매트릭스 (섹션별 접기/펴기)
 * 하단: 차이점 요약 패널
 */

import React, { useState } from "react";
import type { VerticalPreviewViewModel } from "../types/viewModel";
import { VerticalComparisonMatrix } from "./VerticalComparisonMatrix";
import { VerticalDifferencePanel } from "./VerticalDifferencePanel";
import { VerticalPreviewStatePanel } from "./VerticalPreviewStatePanel";
import {
  formatGeneratedAt,
  getScoreBarWidth,
} from "../mappers/mapPreviewToViewModel";

type Props = {
  viewModel: VerticalPreviewViewModel;
};

export function VerticalPreviewBoard({ viewModel }: Props) {
  const {
    title,
    inputSummary,
    suggestionBadge,
    industryColumns,
    comparisonSections,
    differenceSummary,
    overallScore,
    generatedAt,
  } = viewModel;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <span className="text-sm text-gray-500">
          {formatGeneratedAt(generatedAt)}
        </span>
      </div>

      {/* 입력 요약 + 업종 추천 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 입력 요약 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">입력 요약</h3>
          <div className="space-y-1 text-sm">
            <div><span className="text-gray-500">키워드:</span> <span className="font-medium">{inputSummary.seedKeyword}</span></div>
            <div><span className="text-gray-500">문서 유형:</span> {inputSummary.outputTypeLabel}</div>
            <div><span className="text-gray-500">대상:</span> {inputSummary.audience}</div>
            <div><span className="text-gray-500">데이터:</span> Evidence {inputSummary.evidenceCount}건, Insight {inputSummary.insightCount}건, Action {inputSummary.actionCount}건</div>
          </div>
          {inputSummary.qualityWarnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {inputSummary.qualityWarnings.map((w, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{w}</span>
              ))}
            </div>
          )}
        </div>

        {/* 업종 추천 뱃지 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">업종 자동 추론</h3>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${suggestionBadge.colorClass}`}>
            <span className="font-bold text-lg">{suggestionBadge.label}</span>
            <span className="text-sm">({suggestionBadge.confidence})</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">{suggestionBadge.reasoning}</p>
        </div>

        {/* 전체 차이 스코어 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">전체 차이 수준</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overallScore.colorClass}`}
                style={{ width: getScoreBarWidth(overallScore.score) }}
              />
            </div>
            <span className="text-sm font-medium">{overallScore.label}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {differenceSummary.totalDifferences}개 항목에서 업종간 차이 감지
          </p>
        </div>
      </div>

      {/* 업종 컬럼 헤더 */}
      <div className="grid grid-cols-4 gap-2">
        {industryColumns.map((col) => (
          <div
            key={col.industry}
            className={`rounded-lg border p-3 text-center ${col.colorClass} ${col.isRecommended ? "ring-2 ring-offset-1" : ""}`}
          >
            <div className="font-bold">{col.label}</div>
            {col.isRecommended && (
              <span className="text-xs">추천</span>
            )}
            <div className="text-xs mt-1">{col.deviationLabel}</div>
          </div>
        ))}
      </div>

      {/* 비교 매트릭스 */}
      <VerticalComparisonMatrix
        sections={comparisonSections}
        industryColumns={industryColumns}
      />

      {/* 차이점 요약 패널 */}
      <VerticalDifferencePanel summary={differenceSummary} />
    </div>
  );
}
