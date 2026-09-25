import { describe, expect, it, vi } from "vitest";
import { completeRelay } from "@/lib/leads/browser-relay";
import type { FormState } from "@/lib/leads/types";

const relayState = (overrides: Partial<FormState> = {}): FormState => ({
  status: "relay",
  relay: { endpoint: "https://formsubmit.co/ajax/owner%40example.com", body: { Name: "Test" } },
  message: "Thank you. We've received your request.",
  fallbackMessage: "We couldn't send your request just now. Please email us at owner@example.com.",
  deliveredServerSide: false,
  ...overrides,
});

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "text/html; charset=UTF-8" } });

describe("completeRelay", () => {
  it("posts the server-built body to the relay and reports success", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ success: "true", message: "The form was submitted successfully." }));
    const result = await completeRelay(relayState(), fetchImpl);
    expect(result).toEqual({ status: "success", message: "Thank you. We've received your request." });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://formsubmit.co/ajax/owner%40example.com");
    expect(JSON.parse(String(init.body))).toEqual({ Name: "Test" });
  });

  it("shows the direct-contact fallback when the relay rejects the message", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ success: "false", message: "This form needs Activation." }));
    const result = await completeRelay(relayState(), fetchImpl);
    expect(result).toEqual({ status: "error", message: relayState().fallbackMessage });
  });

  it("shows the fallback on network errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect((await completeRelay(relayState(), fetchImpl)).status).toBe("error");
  });

  it("still succeeds if the webhook already delivered the lead", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ success: "false" }));
    expect((await completeRelay(relayState({ deliveredServerSide: true }), fetchImpl)).status).toBe("success");
  });

  it("passes non-relay results through untouched", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const error: FormState = { status: "error", message: "Please check the highlighted fields." };
    expect(await completeRelay(error, fetchImpl)).toBe(error);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
