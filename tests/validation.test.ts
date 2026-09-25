import { describe, expect, it } from "vitest";
import { cleanText, contactSchema, getStartedSchema, toFieldErrors } from "@/lib/validation/leads";
import { PHONE_HTML_PATTERN, PHONE_PATTERN } from "@/lib/validation/patterns";

const validContact = {
  name: "Test Person",
  country: "Canada",
  email: "Test@Example.com",
  phone: "+1 (416) 555-0100",
  category: "Land Inspection",
  message: "Please inspect my plot.",
  consent: "on",
};

const validGetStarted = {
  name: "Test Person",
  country: "United Arab Emirates",
  email: "test@example.com",
  phone: "+971 50 000 0000",
  ownsProperty: "yes",
  topics: ["Maintenance", "Documents"],
  details: "",
  consent: "on",
};

describe("cleanText", () => {
  it("trims and strips control characters but keeps newlines", () => {
    expect(cleanText("  hello\u0000 world\u0007\nnext  ")).toBe("hello world\nnext");
  });
  it("returns an empty string for non-strings", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText(42)).toBe("");
  });
});

describe("contactSchema", () => {
  it("accepts a valid enquiry and normalises the email", () => {
    const result = contactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@example.com");
  });

  it("rejects missing consent", () => {
    const result = contactSchema.safeParse({ ...validContact, consent: "" });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).consent).toMatch(/agree/);
  });

  it("rejects unknown categories", () => {
    const result = contactSchema.safeParse({ ...validContact, category: "Legal advice" });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).category).toBeDefined();
  });

  it("rejects invalid emails and phone numbers", () => {
    const result = contactSchema.safeParse({ ...validContact, email: "not-an-email", phone: "12" });
    const errors = toFieldErrors(result.error!);
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
  });

  it("rejects phone numbers with too many digits", () => {
    expect(contactSchema.safeParse({ ...validContact, phone: "+1 234 567 890 123 456" }).success).toBe(false);
  });

  it("enforces message length limits", () => {
    expect(contactSchema.safeParse({ ...validContact, message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...validContact, message: "x".repeat(2001) }).success).toBe(false);
  });

  it("treats whitespace-only fields as empty", () => {
    const result = contactSchema.safeParse({ ...validContact, name: "   " });
    expect(toFieldErrors(result.error!).name).toMatch(/name/i);
  });
});

describe("getStartedSchema", () => {
  it("accepts a valid request with optional details empty", () => {
    expect(getStartedSchema.safeParse(validGetStarted).success).toBe(true);
  });

  it("requires at least one topic and a property answer", () => {
    const result = getStartedSchema.safeParse({ ...validGetStarted, topics: [], ownsProperty: "" });
    const errors = toFieldErrors(result.error!);
    expect(errors.topics).toBeDefined();
    expect(errors.ownsProperty).toBeDefined();
  });

  it("rejects unknown topics", () => {
    expect(getStartedSchema.safeParse({ ...validGetStarted, topics: ["Crypto"] }).success).toBe(false);
  });
});

describe("phone patterns", () => {
  // Browsers compile the HTML `pattern` attribute as ^(?:pattern)$ with the `v` flag.
  const html = new RegExp(`^(?:${PHONE_HTML_PATTERN})$`, "v");

  it("HTML pattern is valid under the v flag", () => {
    expect(() => new RegExp(PHONE_HTML_PATTERN, "v")).not.toThrow();
  });

  it.each(["+971 50 000 0000", "+1 (416) 555-0100", "044.2345.6789", "+44 20 7946 0000"])("both accept %s", (value) => {
    expect(PHONE_PATTERN.test(value)).toBe(true);
    expect(html.test(value)).toBe(true);
  });

  it.each(["abc", "12", "+971-50-000-0000-ext-9"])("both reject %s", (value) => {
    expect(PHONE_PATTERN.test(value)).toBe(false);
    expect(html.test(value)).toBe(false);
  });
});
