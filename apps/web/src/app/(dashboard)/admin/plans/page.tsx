"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin";

export default function AdminPlansPage() {
  const t = useTranslations("admin");

  return (
    <AdminPageLayout
      title={t("planManagement")}
      description={t("planManagementDesc")}
      infoText={t("planManagementDesc")}
    />
  );
}
