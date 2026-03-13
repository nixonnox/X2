"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared";

const WORKSPACE_SECTION = {
  title: "Workspace",
  fields: [
    { label: "Workspace Name", value: "My Workspace", type: "text" },
    { label: "Slug", value: "my-workspace", type: "text" },
  ],
};

const NOTIFICATIONS_SECTION = {
  title: "Notifications",
  fields: [
    { label: "Email notifications", value: "", type: "toggle" },
    { label: "Weekly report", value: "", type: "toggle" },
    { label: "Trend alerts", value: "", type: "toggle" },
  ],
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { data: session } = useSession();

  const SECTIONS = [
    {
      title: "Profile",
      fields: [
        { label: "Name", value: session?.user?.name || "", type: "text" },
        { label: "Email", value: session?.user?.email || "", type: "email" },
      ],
    },
    WORKSPACE_SECTION,
    NOTIFICATIONS_SECTION,
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="card p-5">
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              {section.title}
            </h3>
            <div className="mt-3 space-y-3">
              {section.fields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between"
                >
                  <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    {field.label}
                  </label>
                  {field.type === "toggle" ? (
                    <div className="h-5 w-9 rounded-full bg-[var(--foreground)] p-0.5">
                      <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      defaultValue={field.value}
                      className="input w-56"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button className="btn-primary">{tc("save")}</button>
        </div>
      </div>
    </div>
  );
}
