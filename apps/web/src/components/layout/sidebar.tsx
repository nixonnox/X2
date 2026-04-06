"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  Compass,
  Tv,
  BarChart3,
  PlaySquare,
  MessageSquare,
  Swords,
  TrendingUp,
  AtSign,
  Map,
  HelpCircle,
  Sparkles,
  Zap,
  FileCheck,
  FileText,
  FilePlus,
  Rocket,
  CreditCard,
  Settings,
  Users,
  Globe,
  Database,
  Brain,
  ScrollText,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  Search,
  GitBranch,
  Network,
  Route,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  APP_NAME,
  NAV_HOME,
  NAV_SECTIONS,
  NAV_ACCOUNT,
  NAV_ADMIN,
} from "@/lib/constants";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Compass,
  Tv,
  BarChart3,
  PlaySquare,
  MessageSquare,
  Swords,
  TrendingUp,
  AtSign,
  Map,
  HelpCircle,
  Sparkles,
  Zap,
  FileCheck,
  FileText,
  FilePlus,
  Rocket,
  CreditCard,
  Settings,
  Users,
  Globe,
  Database,
  Brain,
  ScrollText,
  Search,
  GitBranch,
  Network,
  Route,
  Bell,
};

function resolveLabel(key: string, t: (k: string) => string): string {
  return t(key);
}

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const [adminOpen, setAdminOpen] = useState(false);
  const { data: session } = useSession();
  const userName = session?.user?.name || "사용자";
  const userInitial = userName.charAt(0).toUpperCase();

  // Track which hub sections are expanded (all open by default)
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(
    NAV_SECTIONS.reduce(
      (acc, section) => {
        acc[section.titleKey] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const toggleSection = (titleKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [titleKey]: !prev[titleKey],
    }));
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href + "/"));

  // Check if any item in a section is active (to highlight section header)
  const isSectionActive = (items: { href: string }[]) =>
    items.some((item) => isActive(item.href));

  const HomeIcon = ICON_MAP[NAV_HOME.icon];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] lg:static lg:z-auto ${
          open ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-200 lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--foreground)] text-[10px] font-bold text-white">
              X2
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {APP_NAME}
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace switcher */}
        <WorkspaceSwitcher />

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-3">
          {/* Home (standalone) */}
          <ul className="mb-1 space-y-0.5">
            <li>
              <Link
                href={NAV_HOME.href}
                onClick={onClose}
                className={`sidebar-item ${
                  isActive(NAV_HOME.href)
                    ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-text)]"
                }`}
              >
                {HomeIcon && <HomeIcon className="h-4 w-4 flex-shrink-0" />}
                <span>{resolveLabel(NAV_HOME.labelKey, t)}</span>
              </Link>
            </li>
          </ul>

          {/* Hub sections (collapsible) */}
          {NAV_SECTIONS.map((section) => {
            const SectionIcon = ICON_MAP[section.icon];
            const isExpanded = expandedSections[section.titleKey] ?? true;
            const sectionActive = isSectionActive(section.items);

            return (
              <div key={section.titleKey} className="mt-2">
                <button
                  onClick={() => toggleSection(section.titleKey)}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    sectionActive
                      ? "text-[var(--foreground)]"
                      : "text-[var(--sidebar-section)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {SectionIcon && (
                    <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">
                    {resolveLabel(section.titleKey, t)}
                  </span>
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
                {isExpanded && (
                  <ul className="mt-0.5 space-y-0.5 pl-2">
                    {section.items.map((item) => {
                      const Icon = ICON_MAP[item.icon];
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className={`sidebar-item ${
                              active
                                ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                                : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-text)]"
                            }`}
                          >
                            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                            <span>{resolveLabel(item.labelKey, t)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Settings section */}
          <div className="mt-4">
            <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--sidebar-section)]">
              {t("nav.settings")}
            </p>
            <ul className="space-y-0.5">
              {NAV_ACCOUNT.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`sidebar-item ${
                        active
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-text)]"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                      <span>{resolveLabel(item.labelKey, t)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Admin section (collapsible) */}
          <div className="mb-4 mt-4">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="flex w-full items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--sidebar-section)] transition-colors hover:text-[var(--foreground)]"
            >
              <Shield className="h-3 w-3" />
              <span className="flex-1 text-left">{t("admin.title")}</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${adminOpen ? "rotate-180" : ""}`}
              />
            </button>
            {adminOpen && (
              <ul className="mt-1 space-y-0.5">
                {NAV_ADMIN[0]?.items.map((item) => {
                  const Icon = ICON_MAP[item.icon];
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`sidebar-item ${
                          active
                            ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]"
                            : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-active-text)]"
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                        <span>{resolveLabel(item.labelKey, t)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>

        {/* User area */}
        <div className="border-t border-[var(--sidebar-border)] p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--sidebar-hover)]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-[10px] font-bold text-white">
              {userInitial}
            </div>
            <div className="flex-1 truncate">
              <p className="text-[13px] font-medium text-[var(--foreground)]">
                {userName}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              title={t("user.logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
