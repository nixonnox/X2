"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Tag,
  Calendar,
  Globe,
} from "lucide-react";

// ── 타입 ──

type PromptTemplateView = {
  key: string;
  version: string;
  taskType: string;
  language: string;
  description: string;
  systemInstruction: string;
  safetyNote: string;
  tags: string[];
  updatedAt: string;
};

// ── Mock 프롬프트 데이터 ──

const MOCK_PROMPTS: PromptTemplateView[] = [
  {
    key: "strategy_insight_generation:ko",
    version: "1.0",
    taskType: "strategy_insight_generation",
    language: "ko",
    description: "소셜 미디어 마케팅 전략 분석 및 인사이트 생성",
    systemInstruction:
      "당신은 소셜 미디어 마케팅 전략 분석 전문가입니다. 제공된 데이터를 기반으로 실행 가능한 전략 인사이트를 도출해 주세요.",
    safetyNote: "확정적 표현 대신 데이터 기반 근거를 제시하세요.",
    tags: ["전략", "인사이트", "마케팅"],
    updatedAt: "2026-03-01",
  },
  {
    key: "report_summary_generation:ko",
    version: "1.0",
    taskType: "report_summary_generation",
    language: "ko",
    description: "분석 리포트 핵심 내용 요약 및 시사점 도출",
    systemInstruction:
      "당신은 소셜 미디어 분석 리포트 요약 전문가입니다. 핵심 지표와 트렌드를 중심으로 간결하게 요약해 주세요.",
    safetyNote: "수치를 정확히 인용하고, 과장된 해석을 피하세요.",
    tags: ["리포트", "요약", "분석"],
    updatedAt: "2026-03-01",
  },
  {
    key: "reply_suggestion_generation:ko",
    version: "1.0",
    taskType: "reply_suggestion_generation",
    language: "ko",
    description: "브랜드 톤에 맞는 댓글 답변 후보 생성",
    systemInstruction:
      "당신은 브랜드 소셜 미디어 고객 응대 전문가입니다. 공감적이고 도움이 되는 답변을 제안해 주세요.",
    safetyNote:
      "브랜드 이미지에 부정적인 표현, 논쟁적 발언, 개인정보 요청을 절대 포함하지 마세요.",
    tags: ["댓글", "답변", "고객응대"],
    updatedAt: "2026-03-01",
  },
  {
    key: "dashboard_explanation:ko",
    version: "1.0",
    taskType: "dashboard_explanation",
    language: "ko",
    description: "대시보드 지표를 비전문가에게 이해하기 쉽게 설명",
    systemInstruction:
      "당신은 데이터 분석 결과를 비전문가에게 설명하는 전문가입니다. 전문 용어를 최소화하고, 일상적인 한국어로 설명하세요.",
    safetyNote: "전문 용어를 최소화하고, 일상적인 한국어로 설명하세요.",
    tags: ["대시보드", "설명", "데이터"],
    updatedAt: "2026-03-01",
  },
  {
    key: "faq_extraction:ko",
    version: "1.0",
    taskType: "faq_extraction",
    language: "ko",
    description: "댓글에서 자주 묻는 질문(FAQ) 자동 추출",
    systemInstruction:
      "당신은 소셜 미디어 댓글에서 자주 묻는 질문을 추출하는 전문가입니다.",
    safetyNote: "원본 댓글의 맥락을 왜곡하지 마세요.",
    tags: ["FAQ", "댓글", "질문"],
    updatedAt: "2026-03-01",
  },
  {
    key: "competitor_insight_generation:ko",
    version: "1.0",
    taskType: "competitor_insight_generation",
    language: "ko",
    description: "경쟁사 소셜 미디어 전략 분석 및 비교 인사이트",
    systemInstruction:
      "당신은 경쟁사 소셜 미디어 분석 전문가입니다. 경쟁사의 강점과 약점을 분석하고, 차별화 전략을 제안해 주세요.",
    safetyNote:
      "경쟁사에 대한 근거 없는 비방이나 확인되지 않은 정보를 포함하지 마세요.",
    tags: ["경쟁사", "분석", "비교"],
    updatedAt: "2026-03-01",
  },
];

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

  return (
    <AdminPageLayout
      title="프롬프트 관리"
      description="AI 분석에 사용되는 프롬프트 템플릿을 확인하고 관리합니다."
      infoText="각 프롬프트는 버전 관리되며, 작업 유형별로 최적화된 지시사항과 안전 가이드라인이 포함되어 있습니다."
    >
      <div className="space-y-2">
        {MOCK_PROMPTS.map((prompt) => {
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
                      {prompt.description}
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
                      수정일: {prompt.updatedAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {LANG_LABELS[prompt.language] ?? prompt.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {prompt.tags.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        프롬프트 수정은 코드 레벨에서 관리됩니다. 변경이 필요하면 개발팀에
        요청해 주세요.
      </p>
    </AdminPageLayout>
  );
}
