/**
 * Enquiry form options. Kept separate from `services.ts` (which imports icons
 * and long copy) so client-side form bundles stay small.
 */
export const contactCategories = [
  "Property Care",
  "Property Inspection",
  "Land Inspection",
  "Property Management",
  "Sell Property",
  "Buy Property",
  "Rent Property",
  "Document Assistance",
  "Family Assistance",
  "Other",
] as const;

export const helpTopics = [
  "Property",
  "Land",
  "Rental",
  "Maintenance",
  "Selling",
  "Buying",
  "Documents",
  "Family Assistance",
  "Other",
] as const;

export type ContactCategory = (typeof contactCategories)[number];
export type HelpTopic = (typeof helpTopics)[number];

/** Countries listed first in the country picker; any other value is accepted. */
export const commonCountries = [
  "United States",
  "Canada",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Germany",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Malaysia",
  "New Zealand",
  "Netherlands",
  "Switzerland",
  "Ireland",
  "France",
  "Sweden",
  "Japan",
  "India",
] as const;
