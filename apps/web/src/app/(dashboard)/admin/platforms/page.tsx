"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin";

export default function AdminPlatformsPage() {
  const t = useTranslations("admin");

  return (
    <AdminPageLayout
      title={t("platformManagement")}
      description={t("platformManagementDesc")}
      infoText={t("platformManagementDesc")}
    />
  );
}
