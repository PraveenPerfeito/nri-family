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

/** Not indexed until authentication ships in Phase 2. */
export const nonIndexedRoutes: AppRoute[] = [routes.login, routes.register];
