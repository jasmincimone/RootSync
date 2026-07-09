/** Default public dashboard widgets — seeded into `public_dashboard_widgets`. */
export const DEFAULT_PUBLIC_DASHBOARD_WIDGETS = [
  {
    key: "platform_pulse",
    label: "Platform Pulse",
    widgetType: "metric",
    sortOrder: 0,
  },
  {
    key: "members_synced",
    label: "Members Synced",
    widgetType: "milestone",
    sortOrder: 1,
    configJson: { target: 1_000_000 },
  },
  {
    key: "pulses_today",
    label: "Pulses Today",
    widgetType: "metric",
    sortOrder: 2,
  },
  {
    key: "active_today",
    label: "Active Today",
    widgetType: "metric",
    sortOrder: 3,
  },
  {
    key: "vendors_connected",
    label: "Vendors Connected",
    widgetType: "metric",
    sortOrder: 4,
  },
  {
    key: "products_listed",
    label: "Products Listed",
    widgetType: "metric",
    sortOrder: 5,
  },
  {
    key: "messages_sent",
    label: "Stay Synced",
    widgetType: "metric",
    sortOrder: 6,
  },
  {
    key: "ai_conversations",
    label: "RootSync AI",
    widgetType: "metric",
    sortOrder: 7,
  },
] as const;

export type PublicDashboardWidgetKey = (typeof DEFAULT_PUBLIC_DASHBOARD_WIDGETS)[number]["key"];

export const PERSONAL_TICKER_KEYS = ["member_pulse", "pulse_weekly", "activity_trend"] as const;

export type PersonalTickerKey = (typeof PERSONAL_TICKER_KEYS)[number];
