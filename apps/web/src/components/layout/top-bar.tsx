"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Globe,
} from "lucide-react";
import { locales, localeLabels, type Locale } from "@/i18n/config";

type TopBarProps = {
  onMenuClick: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  async function switchLocale(newLocale: Locale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });
    setLangOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <header className="flex h-11 items-center gap-3 border-b border-[var(--border)] bg-white px-4">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Search */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={t("common.search")}
            className="input h-7 w-full pl-8 pr-3 text-[12px]"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {localeLabels[locale as Locale]}
            </span>
          </button>

          {langOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-32 rounded-md border border-[var(--border)] bg-white py-1 shadow-sm">
                {locales.map((l) => (
                  <button
                    key={l}
                    onClick={() => switchLocale(l)}
                    className={`flex w-full items-center px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--secondary)] ${
                      l === locale
                        ? "font-medium text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]"
                    }`}
                  >
                    {localeLabels[l]}
                    {l === locale && (
                      <span className="ml-auto text-[11px]">&#10003;</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notification */}
        <button className="relative rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--destructive)]" />
        </button>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-[10px] font-bold text-white"
          >
            {userInitial}
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-44 rounded-md border border-[var(--border)] bg-white py-1 shadow-sm">
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p className="text-[13px] font-medium">{userName}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {userEmail}
                  </p>
                </div>
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--secondary)]">
                  <User className="h-3.5 w-3.5" /> {t("user.profile")}
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--secondary)]">
                  <Settings className="h-3.5 w-3.5" /> {t("user.settings")}
                </button>
                <div className="border-t border-[var(--border)]">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--destructive)] transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" /> {t("user.logout")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
