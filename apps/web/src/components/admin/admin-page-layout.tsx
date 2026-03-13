"use client";

import { Info } from "lucide-react";
import { PageHeader } from "@/components/shared";

type AdminPageLayoutProps = {
  title: string;
  description: string;
  infoText: string;
  children?: React.ReactNode;
};

export function AdminPageLayout({
  title,
  description,
  infoText,
  children,
}: AdminPageLayoutProps) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <p className="text-[13px] leading-relaxed text-amber-800">{infoText}</p>
      </div>

      {children ?? (
        <div className="card border-dashed p-12 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            This section is under development.
          </p>
        </div>
      )}
    </div>
  );
}
