import { describe, expect, it } from "vitest";
import { buildNotificationEmail, customerWhatsappLink, escapeHtml } from "@/lib/leads/notification-email";

const ctx = { brand: "NRI Family Office", siteUrl: "https://nri-family.vercel.app" };
const input = {
  kind: "get-started" as const,
  submittedAt: "2026-09-25T06:30:00.000Z",
  data: {
    name: "Asha Kumar",
    country: "United Arab Emirates",
    email: "asha@example.com",
    phone: "+971 50 000 0000",
    ownsProperty: "yes",
    topics: ["Property", "Maintenance"],
    details: "Line one\nLine two",
    consent: true,
  },
};

describe("customerWhatsappLink", () => {
  it("links numbers that include a country code", () => {
    expect(customerWhatsappLink("+971 50 000 0000", "UAE")).toBe("https://wa.me/971500000000");
    expect(customerWhatsappLink("0044 7700 900000", "UK")).toBe("https://wa.me/447700900000");
  });

  it("assumes +91 for 10-digit numbers from India", () => {
    expect(customerWhatsappLink("96001 90022", "India")).toBe("https://wa.me/919600190022");
  });

  it("gives no link when the country code cannot be known", () => {
    expect(customerWhatsappLink("416 555 0100", "Canada")).toBeUndefined();
    expect(customerWhatsappLink(undefined, "India")).toBeUndefined();
  });
});

describe("buildNotificationEmail", () => {
  const email = buildNotificationEmail(input, ctx);

  it("has a clear single-line subject and replies to the customer", () => {
    expect(email.subject).toBe("New Get Started request from Asha Kumar — NRI Family Office");
    expect(email.replyTo).toBe("asha@example.com");
  });

  it("offers one-tap reply, WhatsApp and call actions", () => {
    expect(email.html).toContain('href="mailto:asha@example.com?subject=Re%3A%20your%20enquiry%20to%20NRI%20Family%20Office"');
    expect(email.html).toContain("https://wa.me/971500000000?text=Hi%20Asha%2C%20thank%20you%20for%20contacting%20NRI%20Family%20Office.");
    expect(email.html).toContain('href="tel:+971500000000"');
  });

  it("contains no images (nothing can render as broken)", () => {
    expect(email.html).not.toMatch(/<img/i);
  });

  it("is signed by the website, not a third party", () => {
    expect(email.html).toContain("Regards,<br><strong");
    expect(email.html).toContain("NRI Family Office website");
    expect(email.text).toMatch(/Regards,\nNRI Family Office website/);
    expect(email.html).not.toMatch(/formsubmit|sponsor/i);
  });

  it("lists the enquiry details readably, in both HTML and text", () => {
    expect(email.html).toContain("Needs help with");
    expect(email.html).toContain("Property, Maintenance");
    expect(email.text).toContain("Owns property in Tamil Nadu: Yes");
    expect(email.text).toContain("Chat on WhatsApp: https://wa.me/971500000000");
  });

  it("escapes everything the visitor typed", () => {
    const evil = buildNotificationEmail(
      { ...input, data: { ...input.data, name: '<img src=x onerror="alert(1)">', details: "<script>alert(1)</script>" } },
      ctx,
    );
    expect(evil.html).not.toContain("<script>alert(1)</script>");
    expect(evil.html).not.toContain('<img src=x');
    expect(evil.html).toContain(escapeHtml("<script>alert(1)</script>"));
  });

  it("keeps header-like values on one line", () => {
    const tricky = buildNotificationEmail({ ...input, data: { ...input.data, name: "Asha\r\nBcc: someone@example.com" } }, ctx);
    expect(tricky.subject).not.toMatch(/[\r\n]/);
  });
});
