import { describe, expect, it } from "vitest";
import { actorLabel, describeAdminActivity } from "@/lib/admin/activity";
import { adminStatusTransitions, canAdminTransition, isFinalStatus, needsAssignee, requestStatuses } from "@/lib/admin/domain";
import { cleanSearch, listHref, pageOf, parseActivityParams, parseCustomerParams, parsePropertyParams, parseRequestParams, requestListHref, searchFilter } from "@/lib/admin/search";
import { cancellableRequestStatuses } from "@/lib/portal/domain";
import type { ViewRow } from "@/types/database";

const UUID = "44444444-4444-4444-8444-444444444444";

describe("request lifecycle for the team", () => {
  it("never moves a request to the status it already has", () => {
    for (const from of requestStatuses) expect(adminStatusTransitions[from]).not.toContain(from);
  });

  it("treats completed and cancelled as final", () => {
    expect(adminStatusTransitions.COMPLETED).toEqual([]);
    expect(adminStatusTransitions.CANCELLED).toEqual([]);
    expect(isFinalStatus("COMPLETED") && isFinalStatus("CANCELLED")).toBe(true);
  });

  it("can cancel any open request, and only complete work that is in progress", () => {
    for (const from of requestStatuses.filter((s) => !isFinalStatus(s))) expect(canAdminTransition(from, "CANCELLED"), from).toBe(true);
    expect(requestStatuses.filter((from) => canAdminTransition(from, "COMPLETED"))).toEqual(["IN_PROGRESS"]);
  });

  it("never sends a request back to Submitted", () => {
    for (const from of requestStatuses) expect(canAdminTransition(from, "SUBMITTED"), from).toBe(false);
  });

  it("requires an assignee for Assigned and In progress only", () => {
    expect(requestStatuses.filter(needsAssignee)).toEqual(["ASSIGNED", "IN_PROGRESS"]);
  });

  it("keeps the customer's own cancellation rule (Phase 2A) within the team's lifecycle", () => {
    for (const from of cancellableRequestStatuses) expect(canAdminTransition(from, "CANCELLED")).toBe(true);
  });
});

describe("search and filters from the URL", () => {
  it("strips PostgREST filter syntax and wildcards from search text", () => {
    expect(cleanSearch('REQ-000012),status.eq.COMPLETED,(title.ilike."*')).toBe("REQ-000012 status.eq.COMPLETED title.ilike.");
    expect(cleanSearch("  priya%\u0000 raman \\ ")).toBe("priya raman");
    expect(cleanSearch("x".repeat(200))).toHaveLength(80);
    expect(cleanSearch(["first", "second"])).toBe("first");
    expect(cleanSearch(undefined)).toBe("");
  });

  it("quotes search values inside the filter", () => {
    expect(searchFilter(["title", "customer_name"], "garden")).toBe('title.ilike."*garden*",customer_name.ilike."*garden*"');
  });

  it("accepts only known values, UUIDs and sensible pages", () => {
    const p = parseRequestParams({ status: "DONE", priority: "HIGH", category: "SPACE_TRAVEL", assignee: "someone", customer: "1 or 1=1", sort: "random", page: "-3" });
    expect(p).toEqual({ q: "", status: undefined, priority: undefined, category: undefined, assignee: undefined, customer: undefined, property: undefined, sort: "newest", page: 1 });
    expect(parseRequestParams({ status: "open", assignee: "unassigned", customer: UUID, sort: "urgent", page: "3" })).toMatchObject({
      status: "open",
      assignee: "unassigned",
      customer: UUID,
      sort: "urgent",
      page: 3,
    });
    expect(pageOf("1.5")).toBe(1);
    expect(pageOf("100000")).toBe(1);
    expect(parseCustomerParams({ country: "XX" }).country).toBeUndefined();
    expect(parseCustomerParams({ country: "AE", show: "open" })).toMatchObject({ country: "AE", show: "open" });
    expect(parsePropertyParams({ type: "CASTLE", status: "ACTIVE" })).toMatchObject({ type: undefined, status: "ACTIVE" });
    expect(parseActivityParams({ visibility: "INTERNAL", entity: "PROFILE", customer: "nope" })).toMatchObject({ visibility: "INTERNAL", entity: "PROFILE", customer: undefined });
  });

  it("builds list URLs without defaults", () => {
    expect(listHref("/admin/requests", { q: "", page: 1, status: undefined })).toBe("/admin/requests");
    expect(requestListHref({ q: "garden", status: "open", sort: "newest", page: 2 })).toBe("/admin/requests?q=garden&status=open&page=2");
  });
});

describe("audit trail lines", () => {
  const row = (action: string, metadata: Record<string, unknown>, extra: Partial<ViewRow<"admin_activity_feed">> = {}): ViewRow<"admin_activity_feed"> => ({
    id: "e",
    created_at: "2026-09-29T06:30:00Z",
    action,
    entity_type: "SERVICE_REQUEST",
    entity_id: "33333333-3333-4333-8333-333333333333",
    metadata,
    visibility: "CUSTOMER",
    actor_id: "a",
    actor_name: "Meena",
    actor_role: "ADMIN",
    customer_id: "c",
    customer_name: "Priya Raman",
    ...extra,
  });
  const names = new Map([[UUID, "Arun"]]);

  it("describes status changes in the team's words", () => {
    const line = describeAdminActivity(row("REQUEST_STATUS_CHANGED", { request_number: "REQ-000012", from: "SUBMITTED", to: "WAITING_FOR_CUSTOMER" }));
    expect(line).toMatchObject({ title: "Status changed", detail: "REQ-000012 · New → Awaiting customer", href: "/admin/requests/33333333-3333-4333-8333-333333333333", actor: "Meena (Admin)" });
  });

  it("names assignees from the team list and flags internal entries", () => {
    const assigned = describeAdminActivity(row("REQUEST_ASSIGNED", { request_number: "REQ-000012", assignee_id: UUID }, { visibility: "INTERNAL" }), names);
    expect(assigned).toMatchObject({ title: "Request assigned", detail: "REQ-000012 · to Arun", internal: true });
    const moved = describeAdminActivity(row("REQUEST_REASSIGNED", { request_number: "REQ-000012", assignee_id: UUID, previous_assignee_id: "gone" }, { visibility: "INTERNAL" }), names);
    expect(moved.detail).toBe("REQ-000012 · a former team member → Arun");
  });

  it("describes profile changes by field name only", () => {
    const line = describeAdminActivity(row("PROFILE_UPDATED", { fields: ["phone", "country"] }, { entity_type: "PROFILE", actor_role: "CUSTOMER", actor_name: "Priya Raman" }));
    expect(line).toMatchObject({ detail: "Priya Raman · changed phone and country", href: "/admin/customers/c", actor: "Priya Raman (Customer)" });
  });

  it("never links to a deleted property, and credits the system when nobody acted", () => {
    const line = describeAdminActivity(row("PROPERTY_DELETED", { name: "Old Plot" }, { entity_type: "PROPERTY", actor_id: null, actor_name: null, actor_role: null }));
    expect(line).toMatchObject({ detail: "Old Plot", actor: "System" });
    expect(line.href).toBeUndefined();
    expect(actorLabel({ actor_id: "x", actor_name: null, actor_role: null })).toBe("Former account (Customer)");
  });

  it("shows internal notes without their text", () => {
    const line = describeAdminActivity(row("INTERNAL_NOTE_ADDED", { request_number: "REQ-000012" }, { visibility: "INTERNAL" }));
    expect(line).toMatchObject({ title: "Internal note added", detail: "REQ-000012", internal: true });
  });
});
