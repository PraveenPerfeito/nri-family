/**
 * Every public route in one place. Navigation, footer, sitemap and tests all
 * read from here so a link can never point at a page that does not exist.
 */
export const routes = {
  home: "/",
  services: "/services",
  forNris: "/for-nris",
  propertyCare: "/property-care",
  propertyManagement: "/property-management",
  propertyTransactions: "/property-transactions",
  familyAssistance: "/family-assistance",
  documentAssistance: "/document-assistance",
  howItWorks: "/how-it-works",
  trust: "/trust",
  property: "/property",
  about: "/about",
  contact: "/contact",
  getStarted: "/get-started",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export type RouteKey = keyof typeof routes;
export type AppRoute = (typeof routes)[RouteKey];

/** Routes listed in the sitemap, with a rough importance hint. */
export const indexableRoutes: { path: AppRoute; priority: number }[] = [
  { path: routes.home, priority: 1 },
  { path: routes.services, priority: 0.9 },
  { path: routes.propertyCare, priority: 0.9 },
  { path: routes.propertyManagement, priority: 0.9 },
  { path: routes.propertyTransactions, priority: 0.8 },
  { path: routes.documentAssistance, priority: 0.8 },
  { path: routes.familyAssistance, priority: 0.8 },
  { path: routes.forNris, priority: 0.8 },
  { path: routes.howItWorks, priority: 0.8 },
  { path: routes.trust, priority: 0.8 },
  { path: routes.property, priority: 0.6 },
  { path: routes.about, priority: 0.6 },
  { path: routes.faq, priority: 0.6 },
  { path: routes.contact, priority: 0.6 },
  { path: routes.getStarted, priority: 0.7 },
  { path: routes.privacy, priority: 0.3 },
  { path: routes.terms, priority: 0.3 },
];

/** Account pages: reachable, never indexed. */
export const nonIndexedRoutes: AppRoute[] = [routes.login, routes.register, routes.forgotPassword, routes.resetPassword];

/**
 * The private customer portal (Layer 2). Never in the sitemap, disallowed in
 * robots.txt and sent with `X-Robots-Tag: noindex`.
 */
export const portalRoutes = {
  dashboard: "/app",
  properties: "/app/properties",
  newProperty: "/app/properties/new",
  property: (id: string) => `/app/properties/${id}`,
  editProperty: (id: string) => `/app/properties/${id}/edit`,
  requests: "/app/requests",
  newRequest: "/app/requests/new",
  request: (id: string) => `/app/requests/${id}`,
  activity: "/app/activity",
  notifications: "/app/notifications",
  profile: "/app/profile",
  settings: "/app/settings",
} as const;

/**
 * The admin operations console (Phase 2B), for active team members with the
 * ADMIN role only. Never in the sitemap, disallowed in robots.txt and sent
 * with `X-Robots-Tag: noindex` and `Cache-Control: private, no-store`.
 */
export const adminRoutes = {
  dashboard: "/admin",
  requests: "/admin/requests",
  request: (id: string) => `/admin/requests/${id}`,
  customers: "/admin/customers",
  customer: (id: string) => `/admin/customers/${id}`,
  properties: "/admin/properties",
  property: (id: string) => `/admin/properties/${id}`,
  team: "/admin/team",
  activity: "/admin/activity",
} as const;

/**
 * Evidence files (Phase 2C). Not pages: each one checks who is asking on
 * every request, then redirects to a short-lived signed link to the file in
 * the private bucket. Anyone else gets "not found".
 */
export const evidenceFileRoutes = {
  customer: (requestId: string, evidenceId: string) => `/app/requests/${requestId}/evidence/${evidenceId}`,
  admin: (requestId: string, evidenceId: string) => `/admin/requests/${requestId}/evidence/${evidenceId}`,
} as const;

/** Where auth emails land (Supabase confirmation / recovery links). */
export const authCallbackPath = "/auth/confirm";
