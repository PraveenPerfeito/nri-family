import { routes, type AppRoute } from "./routes";

export type ServiceSlug =
  | "property-care"
  | "property-management"
  | "property-transactions"
  | "document-assistance"
  | "family-assistance";

export type ServiceOffering = { title: string; description: string };

export type ServiceCategory = {
  slug: ServiceSlug;
  name: string;
  href: AppRoute;
  cta: string;
  summary: string;
  /** Short bullets used on overview cards. */
  highlights: string[];
  /** Full list used on the service's own page. */
  offerings: ServiceOffering[];
  /** Mandatory scope note shown wherever the service is described in depth. */
  scopeNote?: string;
};

export const REGULATED_SERVICES_NOTE =
  "Legal, tax and other regulated professional services are handled by appropriately qualified professionals where required. We coordinate; we do not replace them.";

export const services: ServiceCategory[] = [
  {
    slug: "property-care",
    name: "Property Care",
    href: routes.propertyCare,
    cta: "Explore Property Care",
    summary: "Regular inspections, maintenance and repairs, with photos and reports every time.",
    highlights: [
      "Property inspections",
      "Land inspections",
      "Maintenance",
      "Repairs",
      "Cleaning",
      "Garden care",
      "Security checks",
    ],
    offerings: [
      {
        title: "Property inspections",
        description:
          "Scheduled or one-off visits that check the building, water, electricity, security and surroundings, with a written report and photos.",
      },
      {
        title: "Land inspections",
        description:
          "Visits to vacant plots and agricultural land to check boundaries, fencing, access, encroachment signs and overall condition.",
      },
      {
        title: "Maintenance",
        description:
          "Routine upkeep such as plumbing, electrical, painting and waterproofing, coordinated with vetted local providers.",
      },
      {
        title: "Repairs",
        description:
          "From a leaking tap to a damaged compound wall. You see the quotation and approve before work begins.",
      },
      {
        title: "Cleaning",
        description:
          "Deep cleaning before a visit, a move-in or a sale, and periodic cleaning for vacant homes.",
      },
      {
        title: "Garden maintenance",
        description: "Lawn, trees and plant care so the property stays presentable and pest-free.",
      },
      {
        title: "Security checks",
        description:
          "Checks on locks, gates, lighting and signs of unauthorised entry, especially for vacant properties.",
      },
      {
        title: "Emergency visits",
        description:
          "When something needs attention quickly — after a storm, a leak or a neighbour's message — we coordinate a visit as soon as a suitable person is available. For fire, medical or police emergencies, contact local emergency services first.",
      },
    ],
  },
  {
    slug: "property-management",
    name: "Property Management",
    href: routes.propertyManagement,
    cta: "Explore Property Management",
    summary: "Tenant coordination, rental tracking and upkeep for properties you rent out.",
    highlights: [
      "Tenant coordination",
      "Rental management",
      "Maintenance",
      "Periodic inspections",
      "Move-in/move-out coordination",
    ],
    offerings: [
      {
        title: "Tenant coordination",
        description:
          "A single local point of contact for your tenant, so small issues are handled without late-night calls to you.",
      },
      {
        title: "Rental tracking",
        description:
          "A clear record of rent due, rent received and follow-ups, shared with you on a regular schedule.",
      },
      {
        title: "Maintenance",
        description:
          "Tenant-reported issues are logged, assessed and fixed with your approval where costs are involved.",
      },
      {
        title: "Periodic inspections",
        description:
          "Agreed-upon inspections during a tenancy, carried out respectfully and documented with photos.",
      },
      {
        title: "Move-in",
        description:
          "Handover checklist, meter readings, key handover and a photo record of the property's condition.",
      },
      {
        title: "Move-out",
        description:
          "Condition check against the move-in record, key collection and coordination of any repairs.",
      },
      {
        title: "Renewal coordination",
        description:
          "Reminders ahead of agreement expiry and coordination of renewals with qualified professionals where needed.",
      },
    ],
  },
  {
    slug: "property-transactions",
    name: "Property Transactions",
    href: routes.propertyTransactions,
    cta: "Explore Property Transactions",
    summary: "Local coordination when you sell, buy or rent, with qualified professionals where required.",
    highlights: [
      "Property sale assistance",
      "Property purchase assistance",
      "Rental assistance",
      "Site visits",
      "Buyer/seller coordination",
      "Professional coordination",
    ],
    offerings: [],
    scopeNote:
      "Coordination with qualified property and legal professionals where required. We do not provide legal advice or act as your legal representative.",
  },
  {
    slug: "document-assistance",
    name: "Document Assistance",
    href: routes.documentAssistance,
    cta: "Explore Document Assistance",
    summary: "Organise, collect and keep track of important property and household records.",
    highlights: [
      "Document organisation",
      "Document collection",
      "Renewal reminders",
      "Professional coordination",
    ],
    offerings: [
      {
        title: "Secure document organisation",
        description:
          "A structured, private record of the documents that relate to your property and household in Tamil Nadu.",
      },
      {
        title: "Document collection coordination",
        description:
          "Collecting copies of records such as tax receipts or utility bills from the relevant offices when you authorise us to.",
      },
      {
        title: "Renewal reminders",
        description:
          "Reminders ahead of property tax, rental agreement, insurance and other recurring deadlines.",
      },
      {
        title: "Property document tracking",
        description:
          "Knowing which documents exist, where the originals are kept and what is still pending.",
      },
      {
        title: "Professional coordination",
        description:
          "When a document needs legal review or formal verification, we coordinate with an appropriately qualified professional.",
      },
    ],
    scopeNote:
      "We help organise and track documents. Legal verification or opinions are provided only by qualified professionals.",
  },
  {
    slug: "family-assistance",
    name: "Family Assistance",
    href: routes.familyAssistance,
    cta: "Explore Family Assistance",
    summary: "Local coordination for the people and homes that matter to you.",
    highlights: [
      "Local assistance",
      "Parent support coordination",
      "Home assistance",
      "Local errands",
      "Emergency coordination",
    ],
    offerings: [
      {
        title: "Parent assistance",
        description:
          "A dependable local contact who can check in, help with practical tasks and keep you informed, with your family's consent.",
      },
      {
        title: "Home assistance",
        description:
          "Arranging household help, appliance repairs, pest control and other home services for family members.",
      },
      {
        title: "Local errands",
        description:
          "Paying bills in person, collecting documents or dropping off items when someone needs to be physically present.",
      },
      {
        title: "Emergency coordination",
        description:
          "Helping reach the right service providers quickly and keeping you updated when something unexpected happens.",
      },
      {
        title: "Appointment and logistics coordination",
        description:
          "Booking and arranging transport for appointments, and making sure your family is not managing logistics alone.",
      },
    ],
    scopeNote:
      "We coordinate appropriate service providers and do not replace medical, legal or other regulated professionals. In a medical emergency, contact local emergency services first.",
  },
];

export function getService(slug: ServiceSlug): ServiceCategory {
  const service = services.find((s) => s.slug === slug);
  if (!service) throw new Error(`Unknown service: ${slug}`);
  return service;
}
