import { z } from "zod";
import { contactCategories, helpTopics } from "@/config/leads";
import { PHONE_PATTERN } from "./patterns";

/** Remove control characters (except newlines/tabs) and trim. */
export function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

const text = (label: string, min: number, max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `Please enter your ${label}.` : `${capitalise(label)} must be at least ${min} characters.`)
        .max(max, `${capitalise(label)} must be ${max} characters or fewer.`),
    );

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const phone = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, "Please enter a phone or WhatsApp number.")
      .regex(PHONE_PATTERN, "Please enter a valid phone number, including the country code.")
      .refine((v) => {
        const digits = v.replace(/\D/g, "").length;
        return digits >= 7 && digits <= 15;
      }, "Please enter a valid phone number, including the country code."),
  );

const email = z
  .string()
  .transform((v) => cleanText(v).toLowerCase())
  .pipe(z.string().min(1, "Please enter your email address.").max(254).email("Please enter a valid email address."));

const consent = z.literal("on", { error: "Please confirm you agree so we can contact you." });

export const contactSchema = z.object({
  name: text("name", 2, 100),
  country: text("country", 2, 60),
  email,
  phone,
  category: z.enum(contactCategories, { error: "Please choose a service category." }),
  message: text("message", 10, 2000),
  consent,
});

export const getStartedSchema = z.object({
  name: text("full name", 2, 100),
  country: text("country", 2, 60),
  email,
  phone,
  ownsProperty: z.enum(["yes", "no"], { error: "Please let us know if you own property in Tamil Nadu." }),
  topics: z
    .array(z.enum(helpTopics))
    .min(1, "Please choose at least one area you need help with.")
    .max(helpTopics.length),
  details: z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(2000, "Please keep this to 2000 characters or fewer.")),
  consent,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type GetStartedInput = z.infer<typeof getStartedSchema>;

export type FieldErrors = Partial<Record<string, string>>;

/** Flatten zod issues to the first message per field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
