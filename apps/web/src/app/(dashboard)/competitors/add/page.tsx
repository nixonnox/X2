"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared";
import { PlatformSelector } from "@/components/channels";
import { competitorService, COMPETITOR_TYPE_LABELS } from "@/lib/competitors";
import type { CompetitorType, CompetitorFormInput } from "@/lib/competitors";
import type { PlatformCode } from "@/lib/channels";
import { resolveChannelUrl, getPlatformLabel } from "@/lib/channels";
import type {
  UrlValidationResult,
  ValidationSeverity,
} from "@/lib/channels/url/types";

const COMPETITOR_TYPES: {
  value: CompetitorType;
  labelEn: string;
  labelKo: string;
  desc: string;
}[] = [
  {
    value: "direct_competitor",
    labelEn: "Direct Competitor",
    labelKo: "직접 경쟁",
    desc: "Directly competes in same market",
  },
  {
    value: "similar_channel",
    labelEn: "Similar Channel",
    labelKo: "유사 채널",
    desc: "Similar content or audience",
  },
  {
    value: "inspiration_channel",
    labelEn: "Inspiration",
    labelKo: "영감 채널",
    desc: "Inspiring content or strategy",
  },
  {
    value: "benchmark_channel",
    labelEn: "Benchmark",
    labelKo: "벤치마크",
    desc: "Performance benchmark target",
  },
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

export default function AddCompetitorPage() {
  const router = useRouter();
  const t = useTranslations("competitors");

  const [form, setForm] = useState<CompetitorFormInput>({
    platform: "youtube",
    url: "",
    channelName: "",
    competitorType: "direct_competitor",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [urlValidation, setUrlValidation] =
    useState<UrlValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (
        result.detectedPlatformCode &&
        result.detectedPlatformCode !== "custom"
      ) {
        setForm((prev) => ({
          ...prev,
          platform: result.detectedPlatformCode as PlatformCode,
        }));
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function updateField<K extends keyof CompetitorFormInput>(
    key: K,
    value: CompetitorFormInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleUrlChange(url: string) {
    updateField("url", url);
    validateUrl(url);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!form.url.trim()) errs.url = "URL is required";
    if (!form.channelName.trim()) errs.channelName = "Channel name is required";
    if (urlValidation && !urlValidation.shouldAllowProceed)
      errs.url = urlValidation.validationMessage;
    if (competitorService.isDuplicate(form.url))
      errs.url = "This channel URL is already registered";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    competitorService.addCompetitor(form);
    router.push("/competitors");
  }

  const urlBorderClass = urlValidation
    ? urlValidation.validationSeverity === "success"
      ? "border-emerald-400"
      : urlValidation.validationSeverity === "error"
        ? "border-red-400"
        : urlValidation.validationSeverity === "warning"
          ? "border-amber-400"
          : ""
    : "";

  return (
    <div className="space-y-5">
      <Link
        href="/competitors"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("title")}
      </Link>

      <PageHeader
        title="Add Competitor"
        description="Register a competitor or similar channel for comparison analysis."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="space-y-4 lg:col-span-2">
          {/* Platform */}
          <div className="card space-y-4 p-4">
            <PlatformSelector
              value={form.platform}
              onChange={(code) => updateField("platform", code)}
            />

            {/* URL */}
            <div>
              <label className="text-[13px] font-medium">Channel URL</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className={`input w-full pr-8 ${urlBorderClass}`}
                />
                {validating && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                  </div>
                )}
              </div>

              {urlValidation && !validating && (
                <div
                  className={`mt-2 rounded-md px-3 py-2 ${SEVERITY_STYLES[urlValidation.validationSeverity].bg}`}
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
                      {urlValidation.isValid &&
                        urlValidation.detectedPlatformCode && (
                          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                            Platform:{" "}
                            <span className="font-medium text-[var(--foreground)]">
                              {getPlatformLabel(
                                urlValidation.detectedPlatformCode,
                              )}
                            </span>
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {errors.url && !urlValidation && (
                <p className="mt-1 text-[12px] text-[var(--destructive)]">
                  {errors.url}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-[13px] font-medium">Channel Name</label>
              <input
                type="text"
                value={form.channelName}
                onChange={(e) => updateField("channelName", e.target.value)}
                placeholder="Competitor channel display name"
                className="input mt-1 w-full"
              />
              {errors.channelName && (
                <p className="mt-1 text-[12px] text-[var(--destructive)]">
                  {errors.channelName}
                </p>
              )}
            </div>
          </div>

          {/* Competitor Type */}
          <div className="card space-y-3 p-4">
            <h3 className="text-[13px] font-semibold">Competitor Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {COMPETITOR_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => updateField("competitorType", ct.value)}
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                    form.competitorType === ct.value
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                      : "border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
                  }`}
                >
                  <p className="text-[13px] font-medium">{ct.labelEn}</p>
                  <p
                    className={`text-[11px] ${form.competitorType === ct.value ? "text-white/70" : "text-[var(--muted-foreground)]"}`}
                  >
                    {ct.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={
                submitting ||
                (urlValidation !== null && !urlValidation.shouldAllowProceed)
              }
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Register Competitor"}
            </button>
            <Link href="/competitors" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>

        {/* Info sidebar */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                <Info className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <h3 className="text-[13px] font-semibold">After Registration</h3>
            </div>
            <ul className="space-y-1 text-[13px] text-[var(--muted-foreground)]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                KPI comparison dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                Audience growth trend comparison
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                Content strategy analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--muted-foreground)]" />
                AI-powered competitive insights
              </li>
            </ul>
          </div>

          <div className="card border-dashed p-4">
            <h3 className="mb-1 text-[13px] font-semibold">Competitor Types</h3>
            <div className="space-y-2">
              {COMPETITOR_TYPES.map((ct) => (
                <div key={ct.value}>
                  <p className="text-[12px] font-medium text-[var(--foreground)]">
                    {ct.labelEn}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {ct.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
