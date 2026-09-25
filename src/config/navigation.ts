import { routes, type AppRoute } from "./routes";

export type NavItem = { label: string; href: AppRoute };
export type NavGroup = { title: string; items: NavItem[] };

export const primaryNav: NavItem[] = [
  { label: "Services", href: routes.services },
  { label: "For NRIs", href: routes.forNris },
  { label: "How It Works", href: routes.howItWorks },
  { label: "Property", href: routes.property },
  { label: "Trust & Security", href: routes.trust },
  { label: "About", href: routes.about },
];

export const footerNav: NavGroup[] = [
  {
    title: "Company",
    items: [
      { label: "About", href: routes.about },
      { label: "How It Works", href: routes.howItWorks },
      { label: "FAQ", href: routes.faq },
      { label: "Contact", href: routes.contact },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Property Care", href: routes.propertyCare },
      { label: "Property Management", href: routes.propertyManagement },
      { label: "Property Transactions", href: routes.propertyTransactions },
      { label: "Document Assistance", href: routes.documentAssistance },
      { label: "Family Assistance", href: routes.familyAssistance },
    ],
  },
  {
    title: "For NRIs",
    items: [
      { label: "Who we help", href: routes.forNris },
      { label: "How It Works", href: routes.howItWorks },
      { label: "Get Started", href: routes.getStarted },
      { label: "Property", href: routes.property },
    ],
  },
  {
    title: "Trust",
    items: [
      { label: "Trust & Security", href: routes.trust },
      { label: "Privacy", href: routes.privacy },
      { label: "Terms", href: routes.terms },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Login", href: routes.login },
      { label: "Create Account", href: routes.register },
    ],
  },
];
