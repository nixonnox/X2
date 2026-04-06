export const APP_NAME = "X2";
export const APP_DESCRIPTION = "소셜 미디어 분석 및 리스닝 플랫폼";

export type NavItem = {
  labelKey: string;
  href: string;
  icon: string;
};

export type NavSection = {
  titleKey: string;
  icon: string;
  items: NavItem[];
};

// ---- 4-Hub + Utility Structure ----

export const NAV_HOME: NavItem = {
  labelKey: "nav.home",
  href: "/dashboard",
  icon: "Home",
};

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "nav.channelContent",
    icon: "Tv",
    items: [
      { labelKey: "nav.channels", href: "/channels", icon: "Tv" },
      {
        labelKey: "nav.commentAnalysis",
        href: "/comments",
        icon: "MessageSquare",
      },
      { labelKey: "nav.competitors", href: "/competitors", icon: "Swords" },
      {
        labelKey: "nav.channelPerformance",
        href: "/channels/performance",
        icon: "BarChart3",
      },
    ],
  },
  {
    titleKey: "nav.searchIntentJourney",
    icon: "Search",
    items: [
      { labelKey: "nav.listeningHub", href: "/listening-hub", icon: "Compass" },
      { labelKey: "nav.intentFinder", href: "/intent", icon: "Search" },
      { labelKey: "nav.pathfinder", href: "/pathfinder", icon: "GitBranch" },
      { labelKey: "nav.personaView", href: "/persona", icon: "Users" },
      {
        labelKey: "nav.clusterFinder",
        href: "/cluster-finder",
        icon: "Network",
      },
      { labelKey: "nav.roadView", href: "/road-view", icon: "Route" },
    ],
  },
  {
    titleKey: "nav.aiVisibility",
    icon: "Globe",
    items: [
      { labelKey: "nav.citationTracker", href: "/geo-aeo", icon: "Globe" },
    ],
  },
  {
    titleKey: "nav.executeReport",
    icon: "FileText",
    items: [
      { labelKey: "nav.insights", href: "/insights", icon: "Sparkles" },
      { labelKey: "nav.actions", href: "/insights/actions", icon: "Zap" },
      { labelKey: "nav.reports", href: "/insights/reports", icon: "FileText" },
      { labelKey: "nav.notifications", href: "/notifications", icon: "Bell" },
    ],
  },
];

export const NAV_ACCOUNT: NavItem[] = [
  { labelKey: "nav.settings", href: "/settings", icon: "Settings" },
  { labelKey: "nav.billing", href: "/billing", icon: "CreditCard" },
  { labelKey: "nav.usage", href: "/settings/usage", icon: "BarChart3" },
];

export const NAV_ADMIN: NavSection[] = [
  {
    titleKey: "admin.title",
    icon: "Shield",
    items: [
      { labelKey: "admin.userManagement", href: "/admin/users", icon: "Users" },
      {
        labelKey: "admin.platformManagement",
        href: "/admin/platforms",
        icon: "Globe",
      },
      {
        labelKey: "admin.dataCollection",
        href: "/admin/collection",
        icon: "Database",
      },
      { labelKey: "admin.aiAnalysis", href: "/admin/ai", icon: "Brain" },
      {
        labelKey: "admin.planManagement",
        href: "/admin/plans",
        icon: "CreditCard",
      },
      { labelKey: "admin.systemLogs", href: "/admin/logs", icon: "ScrollText" },
      {
        labelKey: "admin.pipelineMonitor",
        href: "/admin/pipeline",
        icon: "Activity",
      },
    ],
  },
];
