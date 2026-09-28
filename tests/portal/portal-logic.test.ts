import { describe, expect, it } from "vitest";
import { describeActivity } from "@/lib/portal/activity";
import type { ActivityLog } from "@/lib/portal/domain";
import { canCancelRequest, isOpenRequest, upcomingStages } from "@/lib/portal/domain";
import { dayLabel, greeting } from "@/lib/portal/format";
import { isTimeZone } from "@/lib/portal/places";
import { safeNextPath } from "@/lib/portal/redirects";
import { newPasswordSchema, profileSchema, propertySchema, serviceRequestSchema, signUpSchema } from "@/lib/portal/validation";

describe("safeNextPath (open-redirect protection)", () => {
  it.each(["/app", "/app/requests?status=open", "/app/properties/abc", "/reset-password"])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each(["https://evil.example", "//evil.example/app", "/\\evil.example", "javascript:alert(1)", "/login", "/app/../login", "/appx", "", "app"])(
    "rejects %s",
    (path) => {
      expect(safeNextPath(path)).toBe("/app");
    },
  );
});

describe("property validation", () => {
  it("accepts the minimum (name, type, city) and normalises blanks to null", () => {
    expect(propertySchema.parse({ name: "  Chennai House ", propertyType: "HOUSE", city: "Chennai", postalCode: "" })).toMatchObject({
      name: "Chennai House",
      property_type: "HOUSE",
      city: "Chennai",
      postal_code: null,
      district: null,
    });
  });

  it("rejects unknown types, invalid PIN codes, districts outside Tamil Nadu and oversized text", () => {
    const result = propertySchema.safeParse({ name: "x".repeat(121), propertyType: "CASTLE", city: "Chennai", postalCode: "012345", district: "Mumbai", notes: "x".repeat(2001) });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["name", "propertyType", "postalCode", "district", "notes"]));
  });

  it("strips control characters", () => {
    expect(propertySchema.parse({ name: "Chennai\u0000 House", propertyType: "HOUSE", city: "Chennai" }).name).toBe("Chennai House");
  });
});

describe("service request validation", () => {
  it("uses the service name as the title when no summary is given", () => {
    expect(serviceRequestSchema.parse({ category: "GARDEN_MAINTENANCE", description: "Trim the hedge please.", priority: "NORMAL" })).toMatchObject({
      title: "Garden maintenance",
      property_id: null,
    });
  });

  it("rejects malformed property ids, unknown categories and priorities", () => {
    const result = serviceRequestSchema.safeParse({ propertyId: "1 OR 1=1", category: "SPACE", description: "Something long enough.", priority: "CRITICAL" });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["propertyId", "category", "priority"]));
  });
});

describe("profile and account validation", () => {
  it("validates phone, country and time zone", () => {
    expect(profileSchema.safeParse({ fullName: "Priya", phone: "+971 50 123 4567", country: "ae", timezone: "Asia/Dubai" }).success).toBe(true);
    const bad = profileSchema.safeParse({ fullName: "P", phone: "call me", country: "XX", timezone: "Mars/Olympus" });
    expect(bad.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["fullName", "phone", "country", "timezone"]));
  });

  it("requires a 10+ character password that isn't the email address", () => {
    const tooShort = signUpSchema.safeParse({ fullName: "Priya", email: "p@example.test", password: "short", consent: "on" });
    expect(tooShort.success).toBe(false);
    const sameAsEmail = signUpSchema.safeParse({ fullName: "Priya", email: "priya@example.test", password: "priya@example.test", consent: "on" });
    expect(sameAsEmail.error!.issues[0].message).toMatch(/email/);
  });

  it("requires the two new passwords to match", () => {
    expect(newPasswordSchema.safeParse({ password: "long enough one", confirmPassword: "long enough two" }).success).toBe(false);
  });
});

describe("request statuses", () => {
  it("knows which requests are open and which can still be cancelled", () => {
    expect(isOpenRequest("SUBMITTED")).toBe(true);
    expect(isOpenRequest("COMPLETED")).toBe(false);
    expect(canCancelRequest("UNDER_REVIEW")).toBe(true);
    expect(canCancelRequest("IN_PROGRESS")).toBe(false);
  });

  const moved = (...to: string[]) => to.map((status) => ({ event_type: "STATUS_CHANGED" as const, metadata: { to: status } }));
  const labels = (stages: { label: string }[]) => stages.map((s) => s.label);

  it("lists the stages still ahead of a request", () => {
    expect(labels(upcomingStages("SUBMITTED", []))).toEqual(["Team review", "Assignment", "Work", "Completion"]);
    expect(labels(upcomingStages("ASSIGNED", moved("UNDER_REVIEW", "ASSIGNED")))).toEqual(["Work", "Completion"]);
    expect(upcomingStages("COMPLETED", moved("COMPLETED"))).toEqual([]);
    expect(upcomingStages("CANCELLED", moved("CANCELLED"))).toEqual([]);
  });

  it("never shows a finished stage as a next step while waiting for the customer", () => {
    expect(labels(upcomingStages("WAITING_FOR_CUSTOMER", moved("UNDER_REVIEW", "WAITING_FOR_CUSTOMER")))).toEqual(["Assignment", "Work", "Completion"]);
    expect(labels(upcomingStages("WAITING_FOR_CUSTOMER", moved("UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER")))).toEqual(["Completion"]);
    expect(labels(upcomingStages("WAITING_FOR_CUSTOMER", moved("WAITING_FOR_CUSTOMER")))).toEqual(["Team review", "Assignment", "Work", "Completion"]);
  });

  it("follows the current stage when the team moves a request back", () => {
    expect(labels(upcomingStages("UNDER_REVIEW", moved("UNDER_REVIEW", "ASSIGNED", "UNDER_REVIEW")))).toEqual(["Assignment", "Work", "Completion"]);
  });
});

describe("dates in the customer's time zone", () => {
  const now = new Date("2026-09-28T06:30:00Z"); // 10:30 in Dubai, 23:30 the day before in Toronto
  it("greets by the local hour", () => {
    expect(greeting("Asia/Dubai", now)).toBe("Good morning");
    expect(greeting("America/Toronto", now)).toBe("Good morning");
    expect(greeting("Asia/Singapore", now)).toBe("Good afternoon");
  });

  it("labels today and yesterday in the customer's zone", () => {
    expect(dayLabel("2026-09-28T05:00:00Z", "Asia/Dubai", now)).toBe("Today");
    expect(dayLabel("2026-09-27T05:00:00Z", "Asia/Dubai", now)).toBe("Yesterday");
  });

  it("recognises real time zones only", () => {
    expect(isTimeZone("Asia/Kolkata")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("activity lines", () => {
  const entry = (action: string, metadata: Record<string, unknown>, entityType: ActivityLog["entity_type"] = "PROPERTY"): ActivityLog => ({
    id: "e",
    actor_id: "a",
    customer_id: "c",
    action,
    entity_type: entityType,
    entity_id: "44444444-4444-4444-8444-444444444444",
    metadata,
    created_at: "2026-09-28T06:30:00Z",
  });

  it("describe changes by field name only", () => {
    const line = describeActivity(entry("PROFILE_UPDATED", { fields: ["full_name", "phone"] }, "PROFILE"));
    expect(line).toMatchObject({ title: "Profile updated", detail: "Changed name and phone" });
  });

  it("link to the request that was created", () => {
    const line = describeActivity(entry("REQUEST_CREATED", { request_number: "REQ-000001", title: "Garden maintenance" }, "SERVICE_REQUEST"));
    expect(line).toMatchObject({ title: "Service request created", detail: "REQ-000001 · Garden maintenance", href: "/app/requests/44444444-4444-4444-8444-444444444444" });
  });

  it("do not link to a deleted property", () => {
    expect(describeActivity(entry("PROPERTY_DELETED", { name: "Old Plot" })).href).toBeUndefined();
  });
});
