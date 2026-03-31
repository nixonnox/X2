export const APP_NAME = "X2";
export const APP_DESCRIPTION = "Social Media Analytics & Listening Platform";

export type NavItem = {
  labelKey: string;
  href: string;
  icon: string;
};

export type NavSection = {
  titleKey: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "nav.start",
    items: [
      { labelKey: "nav.home", href: "/dashboard", icon: "Home" },
      { labelKey: "nav.startHub", href: "/start", icon: "Compass" },
    ],
  },
  {
    titleKey: "nav.discover",
    items: [
      { labelKey: "nav.channels", href: "/channels", icon: "Tv" },
      { labelKey: "nav.keywords", href: "/keywords", icon: "TrendingUp" },
      { labelKey: "nav.mentions", href: "/keywords/mentions", icon: "AtSign" },
    ],
  },
  {
    titleKey: "nav.analyze",
    items: [
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
    titleKey: "nav.listeningMind",
    items: [
      {
        labelKey: "nav.listeningHub",
        href: "/listening-hub",
        icon: "Radio",
      },
      { labelKey: "nav.intentFinder", href: "/intent", icon: "Search" },
      { labelKey: "nav.pathfinder", href: "/pathfinder", icon: "GitBranch" },
      { labelKey: "nav.personaView", href: "/persona", icon: "Users" },
      {
        labelKey: "nav.clusterFinder",
        href: "/cluster-finder",
        icon: "Network",
      },
      { labelKey: "nav.roadView", href: "/road-view", icon: "Route" },
      { labelKey: "nav.faqIssues", href: "/comments/faq", icon: "HelpCircle" },
      {
        labelKey: "nav.categoryEntry",
        href: "/category-entry",
        icon: "Layers",
      },
      {
        labelKey: "nav.demographic",
        href: "/demographic",
        icon: "PieChart",
      },
    ],
  },
  {
    titleKey: "nav.geoAeo",
    items: [
      { labelKey: "nav.citationTracker", href: "/geo-aeo", icon: "Globe" },
    ],
  },
  {
    titleKey: "nav.insightAction",
    items: [
      { labelKey: "nav.insights", href: "/insights", icon: "Sparkles" },
      { labelKey: "nav.actions", href: "/insights/actions", icon: "Zap" },
      {
        labelKey: "nav.evidence",
        href: "/insights/evidence",
        icon: "FileCheck",
      },
    ],
  },
  {
    titleKey: "nav.intelligence",
    items: [
      {
        labelKey: "nav.intelligenceHub",
        href: "/intelligence",
        icon: "Brain",
      },
      {
        labelKey: "nav.intelligenceCompare",
        href: "/intelligence/compare",
        icon: "GitCompareArrows",
      },
      {
        labelKey: "nav.verticalPreview",
        href: "/vertical-preview",
        icon: "GitBranch",
      },
    ],
  },
  {
    titleKey: "nav.reportAutomation",
    items: [
      { labelKey: "nav.reports", href: "/insights/reports", icon: "FileText" },
      {
        labelKey: "nav.createReport",
        href: "/insights/reports/new",
        icon: "FilePlus",
      },
    ],
  },
  {
    titleKey: "nav.execute",
    items: [
      { labelKey: "nav.campaigns", href: "/campaigns", icon: "Rocket" },
      { labelKey: "nav.contents", href: "/contents", icon: "PlaySquare" },
    ],
  },
];

export const NAV_ACCOUNT: NavItem[] = [
  { labelKey: "nav.notifications", href: "/notifications", icon: "Bell" },
  { labelKey: "nav.alertSettings", href: "/settings/notifications", icon: "BellRing" },
  { labelKey: "nav.billing", href: "/billing", icon: "CreditCard" },
  { labelKey: "nav.usage", href: "/settings/usage", icon: "BarChart3" },
  { labelKey: "nav.settings", href: "/settings", icon: "Settings" },
];

export const NAV_ADMIN: NavSection[] = [
  {
    titleKey: "admin.title",
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
