"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";
import {
  ArrowLeft,
  Info,
  Zap,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronDown,
  Link2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared";
import { PlatformSelector } from "@/components/channels";
import {
  getPlatform,
  getAnalysisModeLabel,
  getAnalysisModeDescription,
  resolveChannelUrl,
  getPlatformLabel,
} from "@/lib/channels";
import type {
  PlatformCode,
  AnalysisMode,
  ChannelType,
  ChannelFormInput,
} from "@/lib/channels";
import type {
  UrlValidationResult,
  ValidationSeverity,
} from "@/lib/channels/url/types";

const COUNTRIES = [
  { value: "KR", label: "한국" },
  { value: "US", label: "미국" },
  { value: "JP", label: "일본" },
  { value: "VN", label: "베트남" },
  { value: "TH", label: "태국" },
  { value: "OTHER", label: "기타" },
];

const CATEGORIES = [
  "뷰티/패션",
  "엔터테인먼트",
  "음악",
  "게임",
  "교육",
  "기술/IT",
  "라이프스타일",
  "푸드/요리",
  "여행",
  "스포츠",
  "비즈니스/마케팅",
  "디자인",
  "기타",
];

// 플랫폼별 기본 태그
const PLATFORM_DEFAULT_TAGS: Record<string, string[]> = {
  youtube: ["유튜브", "영상"],
  instagram: ["인스타그램", "사진"],
  tiktok: ["틱톡", "숏폼"],
  x: ["트위터", "X"],
  threads: ["스레드"],
  facebook: ["페이스북"],
  custom: ["커스텀"],
};

const CHANNEL_TYPES: {
  value: ChannelType;
  label: string;
  description: string;
}[] = [
  { value: "owned", label: "내 채널", description: "직접 운영하는 채널" },
  { value: "competitor", label: "경쟁사", description: "경쟁사의 채널" },
  { value: "monitoring", label: "모니터링", description: "관심 채널 모니터링" },
];

const SEVERITY_STYLES: Record<
  ValidationSeverity,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function NewChannelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialUrl = searchParams.get("url") ?? "";
  const { projectId } = useCurrentProject();

  const registerChannel = trpc.channel.register.useMutation();

  const [form, setForm] = useState<ChannelFormInput>({
    platformCode: "youtube",
    url: initialUrl,
    name: "",
    country: "KR",
    category: "기타",
    tags: [],
    channelType: "owned",
    isCompetitor: false,
    analysisMode: "url_basic",
    customPlatformName: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // URL validation state
  const [urlValidation, setUrlValidation] =
    useState<UrlValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const platform = getPlatform(form.platformCode);
  const supportedModes = platform?.supportedAnalysisModes ?? ["url_basic"];

  function updateField<K extends keyof ChannelFormInput>(
    key: K,
    value: ChannelFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // URL validation with debounce
  const validateUrl = useCallback((url: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!url.trim()) {
      setUrlValidation(null);
      setValidating(false);
      return;
    }

    setValidating(true);
    debounceRef.current = setTimeout(() => {
      const result = resolveChannelUrl(url);
      setUrlValidation(result);
      setValidating(false);

      // 모든 자동완성을 한 번의 setForm으로 처리 (race condition 방지)
      setForm((prev) => {
        const next = { ...prev };

        // 1. 플랫폼 자동 감지
        if (
          result.detectedPlatformCode &&
          result.detectedPlatformCode !== "custom"
        ) {
          next.platformCode = result.detectedPlatformCode as PlatformCode;
        }

        // 2. 분석 모드 자동 설정
        if (result.suggestedMode) {
          next.analysisMode = result.suggestedMode as AnalysisMode;
        }

        // 3. 채널 이름 자동완성 (비어있을 때만)
        if (result.channelIdentifier && !prev.name) {
          let name = result.channelIdentifier;
          if (result.detectedPlatformCode === "custom") {
            try {
              const u = new URL(result.normalizedUrl || "");
              const seg = u.pathname
                .replace(/\/$/, "")
                .split("/")
                .filter(Boolean)
                .pop();
              if (seg) name = seg;
            } catch {
              // keep original
            }
          }
          next.name = name;
        }

        // 4. 태그 자동완성 (비어있을 때만)
        const detectedPlatform = result.detectedPlatformCode ?? "custom";
        const defaultTags = PLATFORM_DEFAULT_TAGS[detectedPlatform] ?? [];
        if (defaultTags.length > 0 && prev.tags.length === 0) {
          next.tags = defaultTags;
        }

        return next;
      });
    }, 400);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Auto-focus URL input and validate initial URL if provided
  useEffect(() => {
    if (initialUrl) {
      validateUrl(initialUrl);
    } else {
      urlInputRef.current?.focus();
    }
  }, []);

  function handleUrlChange(url: string) {
    updateField("url", url);
    validateUrl(url);
  }

  function handlePlatformChange(code: PlatformCode) {
    const p = getPlatform(code);
    const modes = p?.supportedAnalysisModes ?? ["url_basic"];
    updateField("platformCode", code);
    if (!modes.includes(form.analysisMode) && modes[0]) {
      updateField("analysisMode", modes[0]);
    }
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    updateField(
      "tags",
      form.tags.filter((t) => t !== tag),
    );
  }

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setErrors({ name: "채널 이름을 입력하세요." });
      return;
    }
    if (!form.url.trim()) {
      setErrors({ url: "채널 URL을 입력하세요." });
      return;
    }
    if (urlValidation && !urlValidation.shouldAllowProceed) {
      setErrors({ url: urlValidation.validationMessage });
      return;
    }
    if (!projectId) {
      setErrors({
        url: "프로젝트가 없습니다. 설정에서 프로젝트를 먼저 만들어주세요.",
      });
      return;
    }

    const resolvedPlatform =
      urlValidation?.detectedPlatformCode &&
      urlValidation.detectedPlatformCode !== "custom"
        ? urlValidation.detectedPlatformCode
        : form.platformCode;

    setSubmitting(true);
    setErrors({});
    try {
      const result = await registerChannel.mutateAsync({
        projectId,
        url: form.url,
        name: form.name,
        platformCode: resolvedPlatform,
        channelType: form.channelType as "owned" | "competitor" | "monitoring",
        country: form.country,
        category: form.category,
        tags: form.tags,
        analysisMode: form.analysisMode,
        customPlatformName: form.customPlatformName || undefined,
      });

      setSuccessMsg(
        `✅ "${form.name}" 채널이 등록되었습니다! 분석을 시작합니다...`,
      );
      setTimeout(() => {
        router.push(`/channels/${result.channel.id}`);
      }, 1200);
    } catch (err: any) {
      const msg = err?.message ?? "채널 등록 중 오류가 발생했습니다.";
      setErrors({ url: msg });
      setSubmitting(false);
    }
  }

  // URL input border color based on validation
  const urlBorderClass = urlValidation
    ? urlValidation.validationSeverity === "success"
      ? "border-emerald-400 focus:border-emerald-500"
      : urlValidation.validationSeverity === "error"
        ? "border-red-400 focus:border-red-500"
        : urlValidation.validationSeverity === "warning"
          ? "border-amber-400 focus:border-amber-500"
          : ""
    : "";

  const isUrlValid =
    urlValidation?.isValid &&
    urlValidation?.shouldAllowProceed &&
    urlValidation?.detectedPlatformCode !== null &&
    urlValidation?.detectedPlatformCode !== "custom";

  return (
    <div className="space-y-5">
      {/* 성공 메시지 토스트 */}
      {successMsg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl bg-emerald-600 px-6 py-3 text-[14px] font-medium text-white shadow-lg">
          {successMsg}
        </div>
      )}

      <Link
        href="/channels"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        채널 목록
      </Link>

      <PageHeader
        title="채널 추가"
        description="분석할 소셜 미디어 채널의 URL을 붙여넣으세요."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Form */}
        <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
          {/* 에러 요약 */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[13px] font-medium text-red-700">
                등록에 실패했습니다:
              </p>
              <ul className="mt-1 space-y-0.5">
                {Object.entries(errors).map(([k, v]) => (
                  <li key={k} className="text-[12px] text-red-600">
                    • {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Step 1: URL Input — the primary action */}
          <div className="card space-y-4 p-5">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <Link2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold">채널 URL 입력</h3>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  YouTube, Instagram, TikTok, X 등의 채널 URL을 붙여넣으세요
                </p>
              </div>
            </div>

            <div className="relative">
              <input
                ref={urlInputRef}
                type="text"
                value={form.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="예: https://www.instagram.com/genus_offcl/"
                className={`input h-11 w-full pr-8 text-[14px] ${urlBorderClass}`}
              />
              {validating && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                </div>
              )}
            </div>

            {/* Validation feedback */}
            {urlValidation && !validating && (
              <div
                className={`rounded-md px-3 py-2 ${SEVERITY_STYLES[urlValidation.validationSeverity].bg}`}
              >
                <div className="flex items-start gap-2">
                  {(() => {
                    const SevIcon =
                      SEVERITY_STYLES[urlValidation.validationSeverity].icon;
                    return (
                      <SevIcon
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${SEVERITY_STYLES[urlValidation.validationSeverity].color}`}
                      />
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[13px] font-medium ${SEVERITY_STYLES[urlValidation.validationSeverity].color}`}
                    >
                      {urlValidation.validationMessage}
                    </p>

                    {urlValidation.isValid && (
                      <div className="mt-1.5 space-y-1">
                        {urlValidation.detectedPlatformCode && (
                          <p className="text-[12px] text-[var(--muted-foreground)]">
                            플랫폼:{" "}
                            <span className="font-medium text-[var(--foreground)]">
                              {getPlatformLabel(
                                urlValidation.detectedPlatformCode,
                              )}
                            </span>
                          </p>
                        )}
                        {urlValidation.channelIdentifier && (
                          <p className="text-[12px] text-[var(--muted-foreground)]">
                            채널:{" "}
                            <span className="font-medium text-[var(--foreground)]">
                              {urlValidation.channelIdentifier}
                            </span>
                          </p>
                        )}
                        {urlValidation.normalizedUrl &&
                          urlValidation.normalizedUrl !== form.url && (
                            <p className="text-[12px] text-[var(--muted-foreground)]">
                              정규화 URL:{" "}
                              <span className="font-mono text-[11px] text-[var(--foreground)]">
                                {urlValidation.normalizedUrl}
                              </span>
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.url && !urlValidation && (
              <p className="text-[12px] text-[var(--destructive)]">
                {errors.url}
              </p>
            )}

            {/* Auto-detected platform badge */}
            {isUrlValid && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <p className="text-[13px] text-emerald-700">
                  <span className="font-medium">
                    {getPlatformLabel(urlValidation!.detectedPlatformCode!)}
                  </span>{" "}
                  채널이 자동 감지되었습니다
                </p>
              </div>
            )}
            {/* Custom URL 허용 안내 */}
            {!isUrlValid &&
              urlValidation?.isValid &&
              urlValidation?.shouldAllowProceed &&
              urlValidation?.detectedPlatformCode === "custom" && (
                <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <p className="text-[13px] text-blue-700">
                    커스텀 URL로 등록됩니다. 수동 분석 모드로 시작해요.
                  </p>
                </div>
              )}
          </div>

          {/* Step 2: Display Name — simple, auto-filled */}
          <div className="card space-y-3 p-4">
            <div>
              <label className="text-[13px] font-medium">채널 표시 이름</label>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                대시보드에 표시될 이름입니다. URL에서 자동으로 채워집니다.
              </p>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="예: genus_offcl"
                className="input mt-1.5 w-full"
              />
              {errors.name && (
                <p className="mt-1 text-[12px] text-[var(--destructive)]">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Channel Type — simple 3-button selector */}
            <div>
              <label className="text-[13px] font-medium">채널 유형</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {CHANNEL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      updateField("channelType", t.value);
                      updateField("isCompetitor", t.value === "competitor");
                    }}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      form.channelType === t.value
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                        : "border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
                    }`}
                  >
                    <p className="text-[13px] font-medium">{t.label}</p>
                    <p
                      className={`text-[11px] ${form.channelType === t.value ? "text-white/70" : "text-[var(--muted-foreground)]"}`}
                    >
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Options — collapsed by default */}
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--secondary)]"
            >
              <span className="text-[13px] font-medium text-[var(--muted-foreground)]">
                고급 설정 (선택사항)
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t border-[var(--border)] p-4">
                {/* Platform manual override */}
                <div>
                  <label className="text-[13px] font-medium">
                    플랫폼 (자동 감지됨)
                  </label>
                  <div className="mt-1.5">
                    <PlatformSelector
                      value={form.platformCode}
                      onChange={handlePlatformChange}
                    />
                  </div>
                </div>

                {/* Custom platform name */}
                {form.platformCode === "custom" && (
                  <div>
                    <label className="text-[13px] font-medium">
                      커스텀 플랫폼 이름
                    </label>
                    <input
                      type="text"
                      value={form.customPlatformName}
                      onChange={(e) =>
                        updateField("customPlatformName", e.target.value)
                      }
                      placeholder="예: 네이버 블로그, Substack..."
                      className="input mt-1 w-full"
                    />
                    {errors.customPlatformName && (
                      <p className="mt-1 text-[12px] text-[var(--destructive)]">
                        {errors.customPlatformName}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Country */}
                  <div>
                    <label className="text-[13px] font-medium">국가</label>
                    <select
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      className="input mt-1 w-full"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[13px] font-medium">카테고리</label>
                    <select
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="input mt-1 w-full"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[13px] font-medium">태그</label>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    채널을 분류할 태그입니다. URL 입력 시 플랫폼 태그가 자동으로
                    추가됩니다.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="태그 입력 후 Enter (예: 뷰티, 패션)"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="btn-secondary h-8 px-3 text-[12px]"
                    >
                      추가
                    </button>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {form.tags.map((tag) => (
                        <span
                          key={tag}
                          className="badge gap-1 bg-[var(--secondary)] text-[var(--foreground)]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Analysis Mode */}
                <div>
                  <label className="text-[13px] font-medium">분석 모드</label>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    URL 입력 시 자동으로 최적 모드가 선택됩니다.
                  </p>
                  <div className="mt-1.5 space-y-1.5">
                    {supportedModes.map((mode) => (
                      <label
                        key={mode}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors ${
                          form.analysisMode === mode
                            ? "border-blue-500 bg-blue-50"
                            : "border-[var(--border)] hover:bg-[var(--secondary)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="analysisMode"
                          value={mode}
                          checked={form.analysisMode === mode}
                          onChange={() =>
                            updateField("analysisMode", mode as AnalysisMode)
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <p className="flex items-center gap-2 text-[13px] font-medium">
                            {getAnalysisModeLabel(mode)}
                            {mode === "url_basic" && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                                추천
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">
                            {getAnalysisModeDescription(mode)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={
                submitting ||
                !form.url.trim() ||
                !form.name.trim() ||
                (urlValidation !== null &&
                  !urlValidation.shouldAllowProceed &&
                  urlValidation.validationSeverity === "error")
              }
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "등록 중..." : "채널 등록하기"}
            </button>
            <Link href="/channels" className="btn-secondary">
              취소
            </Link>
          </div>
        </form>

        {/* Right: Info Cards */}
        <div className="space-y-3">
          {/* How it works - step guide */}
          <div className="card p-4">
            <h3 className="mb-3 text-[14px] font-semibold">이렇게 진행돼요</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-700">
                  1
                </div>
                <div>
                  <p className="text-[13px] font-medium">URL 붙여넣기</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    채널 URL만 붙여넣으면 플랫폼을 자동 감지합니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-700">
                  2
                </div>
                <div>
                  <p className="text-[13px] font-medium">자동 분석 시작</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    구독자, 조회수, 참여율 등을 자동으로 수집합니다
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[12px] font-bold text-blue-700">
                  3
                </div>
                <div>
                  <p className="text-[13px] font-medium">대시보드 확인</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    성과와 인사이트를 대시보드에서 바로 확인하세요
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50">
                <Zap className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h3 className="text-[13px] font-semibold">지원 플랫폼</h3>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[
                "YouTube",
                "Instagram",
                "TikTok",
                "X (Twitter)",
                "Facebook",
                "Threads",
              ].map((p) => (
                <span
                  key={p}
                  className="badge bg-[var(--secondary)] text-[11px] text-[var(--foreground)]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <h3 className="text-[13px] font-semibold">
                등록 후 제공되는 분석
              </h3>
            </div>
            <ul className="space-y-1 text-[13px] text-[var(--muted-foreground)]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                채널 개요 및 KPI 대시보드
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                구독자/팔로워 성장 추이
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                콘텐츠별 성과 분석
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                AI 인사이트 및 전략 제안
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
