import { routes, type AppRoute } from "./routes";

export type NavItem = { label: string; href: AppRoute };
export type NavGroup = { title: string; items: NavItem[] };

/** Desktop header (UI V2): four items, kept deliberately short. */
export const primaryNav: NavItem[] = [
  { label: "Services", href: routes.services },
  { label: "For NRIs", href: routes.forNris },
  { label: "How It Works", href: routes.howItWorks },
  { label: "Trust", href: routes.trust },
];

/** Mobile menu: every main page, since there is no footer in view. */
export const mobileNav: NavItem[] = [
  { label: "Services", href: routes.services },
  { label: "For NRIs", href: routes.forNris },
  { label: "How It Works", href: routes.howItWorks },
  { label: "Property", href: routes.property },
  { label: "Trust & Security", href: routes.trust },
  { label: "About", href: routes.about },
  { label: "Contact", href: routes.contact },
];

/** Footer (UI V2): four groups instead of five. Every page stays one click away. */
export const footerNav: NavGroup[] = [
  {
    title: "Company",
    items: [
      { label: "How It Works", href: routes.howItWorks },
      { label: "For NRIs", href: routes.forNris },
      { label: "About", href: routes.about },
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
    title: "Trust & legal",
    items: [
      { label: "Trust & Security", href: routes.trust },
      { label: "Privacy", href: routes.privacy },
      { label: "Terms", href: routes.terms },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "Get Started", href: routes.getStarted },
      { label: "Property listings", href: routes.property },
      { label: "Login", href: routes.login },
      { label: "Create Account", href: routes.register },
    ],
  },
];
