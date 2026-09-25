import { describe, expect, it } from "vitest";
import { analyticsEvents, isAnalyticsEvent, sanitizeProps } from "@/lib/analytics/events";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { serializeJsonLd } from "@/lib/seo/json-ld";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks until the window resets", () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now: () => now });
    expect([1, 2, 3].map(() => limiter.check("ip").allowed)).toEqual([true, true, true]);
    expect(limiter.check("ip").allowed).toBe(false);
    expect(limiter.check("other-ip").allowed).toBe(true);
    now = 1001;
    expect(limiter.check("ip").allowed).toBe(true);
  });
});

describe("analytics", () => {
  it("recognises only catalogued events", () => {
    expect(isAnalyticsEvent("contact_submitted")).toBe(true);
    expect(isAnalyticsEvent("email_captured")).toBe(false);
    expect(analyticsEvents).toContain("hero_get_started_clicked");
  });

  it("drops any property that is not explicitly allowed", () => {
    const props = sanitizeProps({ location: "hero", email: "a@b.com", phone: "+1 555", name: "X", message: "hi" });
    expect(props).toEqual({ location: "hero" });
  });

  it("truncates long values", () => {
    expect(String(sanitizeProps({ label: "x".repeat(500) }).label)).toHaveLength(120);
  });
});

describe("serializeJsonLd", () => {
  it("escapes '<' so structured data cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
