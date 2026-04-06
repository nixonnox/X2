"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  Globe,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { trpc } from "@/lib/trpc";

function formatNotificationTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

type TopBarProps = {
  onMenuClick: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  // Notification queries
  const unreadCountQuery = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30000 }, // Poll every 30s
  );
  const notificationsQuery = trpc.notification.list.useQuery(
    { page: 1, pageSize: 10 },
    { enabled: bellOpen },
  );
  const markReadMutation = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      unreadCountQuery.refetch();
      notificationsQuery.refetch();
    },
  });
  const markAllReadMutation = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      unreadCountQuery.refetch();
      notificationsQuery.refetch();
    },
  });
  const unreadCount = (unreadCountQuery.data as any)?.count ?? 0;
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { data: session } = useSession();
  const userName = session?.user?.name || "사용자";
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

      {/* Spacer */}
      <div className="flex-1" />

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
        <div className="relative">
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBellOpen(false)}
              />
              <div className="absolute right-0 top-8 z-50 w-80 rounded-lg border border-[var(--border)] bg-white shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                  <span className="text-[13px] font-semibold">알림</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      모두 읽음
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-[360px] overflow-y-auto">
                  {/* Loading */}
                  {notificationsQuery.isLoading && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-[11px] text-gray-400">
                        알림을 불러오는 중이에요
                      </span>
                    </div>
                  )}

                  {/* Error */}
                  {notificationsQuery.isError && (
                    <div className="py-6 text-center">
                      <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-red-400" />
                      <p className="text-[12px] text-red-500">
                        알림을 불러오지 못했어요
                      </p>
                      <button
                        onClick={() => notificationsQuery.refetch()}
                        className="mt-2 text-[11px] text-blue-600 hover:underline"
                      >
                        다시 시도
                      </button>
                    </div>
                  )}

                  {/* Empty */}
                  {!notificationsQuery.isLoading &&
                    !notificationsQuery.isError &&
                    ((notificationsQuery.data as any)?.items ?? []).length ===
                      0 && (
                      <div className="py-8 text-center">
                        <Bell className="mx-auto mb-2 h-5 w-5 text-gray-300" />
                        <p className="text-[12px] text-gray-400">
                          새로운 알림이 없어요
                        </p>
                      </div>
                    )}

                  {/* Items */}
                  {((notificationsQuery.data as any)?.items ?? []).map(
                    (n: any) => (
                      <div
                        key={n.id}
                        className={`flex cursor-pointer items-start gap-2.5 border-b border-[var(--border)] px-3 py-2.5 transition-colors hover:bg-gray-50 ${
                          !n.isRead ? "bg-blue-50/40" : ""
                        }`}
                        onClick={() => {
                          if (!n.isRead) markReadMutation.mutate({ id: n.id });
                          if (n.actionUrl) {
                            setBellOpen(false);
                            router.push(n.actionUrl);
                          }
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.priority === "HIGH" || n.priority === "URGENT" ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Bell className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Title + severity badge */}
                          <div className="mb-0.5 flex items-center gap-1.5">
                            {n.title && (
                              <span className="truncate text-[11px] font-semibold text-gray-700">
                                {n.title.replace("Intelligence Alert: ", "")}
                              </span>
                            )}
                            {(n.priority === "HIGH" ||
                              n.priority === "URGENT") && (
                              <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700">
                                {n.priority === "URGENT" ? "긴급" : "중요"}
                              </span>
                            )}
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p
                            className={`text-[12px] leading-relaxed ${!n.isRead ? "text-gray-800" : "text-gray-500"}`}
                          >
                            {n.message}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              {formatNotificationTime(n.createdAt)}
                            </span>
                            {n.sourceType === "intelligence_alert" && (
                              <span className="rounded bg-indigo-50 px-1 py-0.5 text-[9px] text-indigo-600">
                                Intelligence
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                {/* Footer — "모든 알림 보기" */}
                <div className="border-t border-[var(--border)] px-3 py-2">
                  <a
                    href="/notifications"
                    onClick={() => setBellOpen(false)}
                    className="flex items-center justify-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    알림 전체 보기
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

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
