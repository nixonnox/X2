"use client";

import { useTranslations } from "next-intl";
import { AdminPageLayout } from "@/components/admin";

export default function AdminUsersPage() {
  const t = useTranslations("admin");

  return (
    <AdminPageLayout
      title={t("userManagement")}
      description={t("userManagementDesc")}
      infoText={t("userManagementDesc")}
    />
  );
}
