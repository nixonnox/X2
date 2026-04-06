"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Calendar,
  Globe,
  Loader2,
} from "lucide-react";
import type { PromptTemplate } from "@/lib/ai/types";

// ── 언어 라벨 ──

const LANG_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
};

// ── 페이지 ──

export default function AdminAiPromptsPage() {
  const t = useTranslations("admin");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/ai/prompts/registry")
      .then(({ promptRegistry }) => {
        if (cancelled) return;
        setPrompts(promptRegistry.getAllTemplates());
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminPageLayout
      title="프롬프트 관리"
      description="AI 분석에 사용되는 프롬프트 템플릿을 확인하고 관리합니다."
      infoText="각 프롬프트는 버전 관리되며, 작업 유형별로 최적화된 지시사항과 안전 가이드라인이 포함되어 있습니다."
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            등록된 프롬프트 템플릿이 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {prompts.map((prompt) => {
            const isExpanded = expandedKey === prompt.key;
            return (
              <div key={prompt.key} className="card overflow-hidden">
                {/* 헤더 */}
                <button
                  onClick={() => setExpandedKey(isExpanded ? null : prompt.key)}
                  className="hover:bg-[var(--muted)]/30 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-[13px] font-semibold">
                        {prompt.metadata.description}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        {prompt.taskType} · v{prompt.version}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {LANG_LABELS[prompt.language] ?? prompt.language}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                    )}
                  </div>
                </button>

                {/* 확장 내용 */}
                {isExpanded && (
                  <div className="space-y-3 border-t px-4 py-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--muted-foreground)]">
                        시스템 지시사항
                      </label>
                      <div className="bg-[var(--muted)]/40 mt-1 rounded-md p-3 text-[12px] leading-relaxed">
                        {prompt.systemInstruction}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[var(--muted-foreground)]">
                        안전 가이드
                      </label>
                      <div className="mt-1 rounded-md border border-amber-200 bg-amber-50/40 p-3 text-[12px] leading-relaxed text-amber-800">
                        {prompt.safetyNote}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        수정일: {prompt.metadata.updatedAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {LANG_LABELS[prompt.language] ?? prompt.language}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {prompt.metadata.tags.join(", ")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-[var(--muted-foreground)]">
        프롬프트 수정은 코드 레벨에서 관리됩니다. 변경이 필요하면 개발팀에
        요청해 주세요.
      </p>
    </AdminPageLayout>
  );
}
