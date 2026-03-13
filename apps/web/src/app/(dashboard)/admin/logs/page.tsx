"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin";

export default function AdminLogsPage() {
  const t = useTranslations("admin");

  return (
    <AdminPageLayout
      title={t("systemLogs")}
      description={t("systemLogsDesc")}
      infoText={t("systemLogsDesc")}
    />
  );
}
