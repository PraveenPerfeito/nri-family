/**
 * Core domain vocabulary shared by the public site today and by the NRI
 * Portal, Admin ERP, Vendor Portal and Partner Portal later. Keep these
 * framework-agnostic so they can move into a shared package if needed.
 */

/** Who may see a property record or listing. Private is always the default. */
export type PropertyVisibility = "private" | "verified-network" | "public";

export const DEFAULT_PROPERTY_VISIBILITY: PropertyVisibility = "private";

export type PropertyKind =
  | "independent-house"
  | "apartment"
  | "villa"
  | "residential-land"
  | "agricultural-land"
  | "commercial";

export type HealthStatus = "good" | "attention" | "action-required";

/**
 * Lifecycle of a service request. The public site only illustrates this;
 * the Admin ERP will own the state machine.
 */
export type ServiceRequestStage =
  | "requested"
  | "triaged"
  | "assigned"
  | "inspected"
  | "quoted"
  | "approved"
  | "in-progress"
  | "completed"
  | "evidence-shared"
  | "invoiced";

/** Platform roles. Each future layer maps onto one or more of these. */
export type PlatformRole =
  | "customer" // NRI Portal (Layer 2)
  | "family-delegate" // NRI Portal, restricted
  | "operations" // Admin ERP (Layer 3)
  | "admin" // Admin ERP (Layer 3)
  | "vendor" // Vendor Portal (Layer 4)
  | "professional-partner"; // Partner Portal (Layer 5)

/** Whether a capability is live today or planned for the platform. */
export type Availability = "available" | "coming";
