"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import type { ReportType, SectionType } from "@/lib/reports";
import {
  REPORT_TYPE_LABELS,
  SECTION_LABELS,
  DEFAULT_SECTIONS,
} from "@/lib/reports";

export default function NewReportPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "weekly_report" as ReportType,
    projectName: "X2 Analytics",
    periodStart: "",
    periodEnd: "",
    sections: [...DEFAULT_SECTIONS] as SectionType[],
    sendEmail: false,
    recipients: [{ email: "", name: "" }],
    createShareLink: false,
  });
  const [generating, setGenerating] = useState(false);

  const allSections = Object.entries(SECTION_LABELS) as [
    SectionType,
    { label: string; description: string },
  ][];

  const toggleSection = (s: SectionType) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.includes(s)
        ? prev.sections.filter((x) => x !== s)
        : [...prev.sections, s],
    }));
  };

  const handleGenerate = async () => {
    if (!form.title.trim() || !form.periodStart || !form.periodEnd) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    setGenerating(false);
    router.push("/insights/reports");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/insights/reports"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
            리포트 생성
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            새로운 분석 리포트를 생성합니다.
          </p>
        </div>
      </div>

      {/* 리포트 유형 */}
      <div className="card space-y-4 p-5">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          리포트 유형
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(
            Object.entries(REPORT_TYPE_LABELS) as [
              ReportType,
              { label: string; description: string },
            ][]
          ).map(([key, info]) => (
            <button
              key={key}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, type: key }))}
              className={`rounded-lg border p-3 text-left transition-colors ${
                form.type === key
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-[var(--border)] hover:border-[var(--border-hover)]"
              }`}
            >
              <FileText
                className={`mb-1 h-4 w-4 ${form.type === key ? "text-blue-600" : "text-[var(--muted-foreground)]"}`}
              />
              <p className="text-[12px] font-medium text-[var(--foreground)]">
                {info.label}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                {info.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="card space-y-4 p-5">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          기본 정보
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
              리포트 제목 *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="예: 주간 성과 리포트 (3월 2주차)"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
              설명 (선택)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              placeholder="리포트에 대한 간단한 설명"
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
                시작일 *
              </label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, periodStart: e.target.value }))
                }
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-[var(--muted-foreground)]">
                종료일 *
              </label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, periodEnd: e.target.value }))
                }
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[13px] outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 섹션 선택 */}
      <div className="card space-y-4 p-5">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          포함 섹션
        </h2>
        <div className="space-y-2">
          {allSections.map(([key, info]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-[var(--secondary)]"
            >
              <input
                type="checkbox"
                checked={form.sections.includes(key)}
                onChange={() => toggleSection(key)}
                className="rounded border-[var(--border)]"
              />
              <div>
                <p className="text-[12px] font-medium text-[var(--foreground)]">
                  {info.label}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {info.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 공유 옵션 */}
      <div className="card space-y-4 p-5">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          공유 옵션
        </h2>
        <label className="flex cursor-not-allowed items-center gap-3 opacity-50">
          <input
            type="checkbox"
            checked={false}
            disabled
            className="rounded border-[var(--border)]"
          />
          <span className="text-[12px] text-[var(--muted-foreground)]">
            이메일로 발송 (준비 중)
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.createShareLink}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                createShareLink: e.target.checked,
              }))
            }
            className="rounded border-[var(--border)]"
          />
          <span className="text-[12px] text-[var(--foreground)]">
            공유 링크 생성
          </span>
        </label>
      </div>

      {/* 생성 버튼 */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/insights/reports"
          className="rounded-md px-4 py-2 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          취소
        </Link>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            generating ||
            !form.title.trim() ||
            !form.periodStart ||
            !form.periodEnd
          }
          className="rounded-md bg-blue-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "리포트 생성 중..." : "리포트 생성"}
        </button>
      </div>
    </div>
  );
}
