import { z } from "zod";
import { cleanText } from "@/lib/validation/leads";
import { PHONE_PATTERN } from "@/lib/validation/patterns";
import { labelOf, ownershipTypes, propertyTypes, requestCategories, requestPriorities } from "./domain";
import { isCountryCode, isTamilNaduDistrict, isTimeZone } from "./places";

/*
 * Server-side validation for every portal form. Lengths and allowed values
 * match the database constraints (supabase/migrations), which remain the
 * final guard. Client-side checks are only for convenience.
 */

const required = (label: string, max: number, min = 1) =>
  z
    .string({ error: `Please enter ${label}.` })
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `Please enter ${label}.` : `Please use at least ${min} characters for ${label}.`)
        .max(max, `Please keep ${label} to ${max} characters or fewer.`),
    );

/** Optional text: missing or blank becomes null. */
const optional = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => cleanText(v ?? ""))
    .pipe(z.string().max(max, `Please keep ${label} to ${max} characters or fewer.`))
    .transform((v) => (v === "" ? null : v));

const choice = <T extends string>(options: { value: T }[], message: string) =>
  z.enum(options.map((o) => o.value) as [T, ...T[]], { error: message });

const optionalChoice = <T extends string>(options: { value: T }[], message: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.enum(options.map((o) => o.value) as [T, ...T[]], { error: message }).nullable());

export const uuidSchema = z.uuid();
export const isUuid = (value: unknown): value is string => uuidSchema.safeParse(value).success;

const email = z
  .string({ error: "Please enter your email address." })
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(z.string().min(1, "Please enter your email address.").max(254, "Please check your email address.").email("Please enter a valid email address."));

/** At least 10 characters; no other composition rules (NIST 800-63B). Max 72: the bcrypt limit Supabase Auth uses. */
const newPassword = z
  .string({ error: "Please choose a password." })
  .min(10, "Please use at least 10 characters.")
  .max(72, "Please use 72 characters or fewer.");

const phone = z
  .string()
  .optional()
  .transform((v) => cleanText(v ?? ""))
  .pipe(
    z.string().refine((v) => {
      if (v === "") return true;
      const digits = v.replace(/\D/g, "").length;
      return PHONE_PATTERN.test(v) && digits >= 7 && digits <= 15;
    }, "Please enter a valid phone number, including the country code."),
  )
  .transform((v) => (v === "" ? null : v));

const country = z
  .string()
  .optional()
  .transform((v) => cleanText(v ?? "").toUpperCase())
  .pipe(z.string().refine((v) => v === "" || isCountryCode(v), "Please choose a country from the list."))
  .transform((v) => (v === "" ? null : v));

const timezone = z
  .string()
  .optional()
  .transform((v) => cleanText(v ?? ""))
  .pipe(z.string().refine((v) => v === "" || isTimeZone(v), "Please choose a time zone from the list."))
  .transform((v) => (v === "" ? null : v));

// ── Properties ────────────────────────────────────────────────────────────────

export const propertySchema = z
  .object({
    name: required("a property name", 120),
    propertyType: choice(propertyTypes, "Please choose the type of property."),
    addressLine1: optional("the address", 200),
    addressLine2: optional("the address", 200),
    city: required("the city or town", 80),
    district: z
      .string()
      .optional()
      .transform((v) => cleanText(v ?? ""))
      .pipe(z.string().refine((v) => v === "" || isTamilNaduDistrict(v), "Please choose a district from the list."))
      .transform((v) => (v === "" ? null : v)),
    postalCode: z
      .string()
      .optional()
      .transform((v) => cleanText(v ?? "").replace(/\s+/g, ""))
      .pipe(z.string().refine((v) => v === "" || /^[1-9][0-9]{5}$/.test(v), "Please enter a 6-digit PIN code."))
      .transform((v) => (v === "" ? null : v)),
    ownershipType: optionalChoice(ownershipTypes, "Please choose an ownership type from the list."),
    notes: optional("the notes", 2000),
  })
  .transform((v) => ({
    name: v.name,
    property_type: v.propertyType,
    address_line_1: v.addressLine1,
    address_line_2: v.addressLine2,
    city: v.city,
    district: v.district,
    postal_code: v.postalCode,
    ownership_type: v.ownershipType,
    notes: v.notes,
  }));

export type PropertyInput = z.output<typeof propertySchema>;

// ── Service requests ─────────────────────────────────────────────────────────

export const serviceRequestSchema = z
  .object({
    propertyId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isUuid(v), "Please choose one of your properties."),
    category: choice(requestCategories, "Please choose the service you need."),
    title: optional("the summary", 120).refine((v) => v === null || v.length >= 3, "Please use at least 3 characters for the summary."),
    description: required("a short description", 4000, 10),
    priority: choice(requestPriorities, "Please choose a priority."),
  })
  .transform((v) => ({
    property_id: v.propertyId,
    category: v.category,
    // No summary given: the service name is a clear title ("Garden maintenance").
    title: v.title ?? labelOf(requestCategories, v.category),
    description: v.description,
    priority: v.priority,
  }));

export type ServiceRequestInput = z.output<typeof serviceRequestSchema>;

// ── Profile ──────────────────────────────────────────────────────────────────

export const profileSchema = z
  .object({ fullName: required("your full name", 120, 2), phone, country, timezone })
  .transform((v) => ({ full_name: v.fullName, phone: v.phone, country: v.country, timezone: v.timezone }));

// ── Accounts ─────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email,
  password: z.string({ error: "Please enter your password." }).min(1, "Please enter your password.").max(128, "Please check your password."),
});

export const signUpSchema = z
  .object({
    fullName: required("your full name", 120, 2),
    email,
    password: newPassword,
    country,
    timezone,
    consent: z.literal("on", { error: "Please agree to the terms to create your account." }),
  })
  .refine((v) => v.password.toLowerCase() !== v.email, { path: ["password"], message: "Please don't use your email address as your password." });

export const forgotPasswordSchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string({ error: "Please repeat the password." }) })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "The two passwords don't match." });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: "Please enter your current password." }).min(1, "Please enter your current password.").max(128),
    password: newPassword,
    confirmPassword: z.string({ error: "Please repeat the new password." }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "The two passwords don't match." })
  .refine((v) => v.password !== v.currentPassword, { path: ["password"], message: "Please choose a password you haven't used here before." });

/** FormData → plain string fields (files and repeated keys are ignored). */
export function formFields(formData: FormData, names: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const name of names) {
    const value = formData.get(name);
    out[name] = typeof value === "string" ? value : undefined;
  }
  return out;
}
