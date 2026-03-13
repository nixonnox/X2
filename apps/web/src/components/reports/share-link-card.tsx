"use client";

import { Link2, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { ReportShareLink } from "@/lib/reports";

function buildShareUrl(token: string) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/reports/shared/${token}`;
}

export function ShareLinkCard({
  shareLink,
}: {
  shareLink: ReportShareLink | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!shareLink) {
    return (
      <div className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[var(--muted-foreground)]" />
          <h4 className="text-[13px] font-medium text-[var(--foreground)]">
            공유 링크
          </h4>
        </div>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          공유 링크가 생성되지 않았습니다.
        </p>
      </div>
    );
  }

  const url = buildShareUrl(shareLink.token);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-violet-500" />
          <h4 className="text-[13px] font-medium text-[var(--foreground)]">
            공유 링크
          </h4>
        </div>
        <span
          className={`badge text-[10px] ${shareLink.enabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"}`}
        >
          {shareLink.enabled ? "활성" : "비활성"}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-[var(--secondary)] px-3 py-2">
        <input
          readOnly
          value={url}
          className="flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
        <span>조회수: {shareLink.viewCount}회</span>
        {shareLink.expiresAt && (
          <span>
            만료: {new Date(shareLink.expiresAt).toLocaleDateString("ko-KR")}
          </span>
        )}
      </div>
    </div>
  );
}
