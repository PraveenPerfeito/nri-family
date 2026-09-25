import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Trust is the product. These guards fail the build if marketing copy or
 * sample data drifts into claims we cannot support or real-looking personal data.
 */

function filesUnder(dir: string, exts = [".ts", ".tsx"]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path, exts);
    return exts.some((e) => path.endsWith(e)) ? [path] : [];
  });
}

const SRC = join(process.cwd(), "src");
const sources = filesUnder(SRC).map((path) => ({ path: relative(process.cwd(), path), text: readFileSync(path, "utf8") }));

const bannedClaims: [RegExp, string][] = [
  [/\bISO[ -]?\d{4,5}\b|ISO[- ]certified/i, "ISO certification"],
  [/\bSOC ?2\b/i, "SOC 2"],
  [/GDPR[- ](certified|compliant)/i, "GDPR certification"],
  [/bank[- ]grade/i, "bank-grade security"],
  [/\bguaranteed\b/i, "guarantees"],
  [/\bNo\.? ?1\b|#1\b|number one/i, "No.1 claims"],
  [/\bbest\b(?! to)/i, "superlatives"],
  [/trusted by (\d|thousands|hundreds)/i, "customer counts"],
  [/\b\d{1,3}(,\d{3})+\+?\s+(NRIs|customers|families|properties|clients)\b/i, "customer/property counts"],
  [/\baward[- ]winning\b/i, "awards"],
  [/revolutionary|disruptive|disrupting the|game[- ]chang|cutting[- ]edge|world[- ]class/i, "hype language"],
  [/testimonial/i, "testimonials (add only real ones)"],
];

describe("no unsupported claims in site copy", () => {
  it.each(bannedClaims)("does not use %s (%s)", (pattern) => {
    const hits = sources.filter((f) => pattern.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });
});

describe("sample data stays fictional", () => {
  const dataFiles = sources.filter((f) => f.path.includes(`${join("src", "data")}`));

  it("found the data files", () => {
    expect(dataFiles.length).toBeGreaterThan(0);
  });

  it("contains no email addresses", () => {
    const hits = dataFiles.filter((f) => /[\w.+-]+@[\w-]+\.[\w.]+/.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("contains no phone numbers", () => {
    const hits = dataFiles.filter((f) => /(\+?\d[\d\s-]{8,}\d)/.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("contains no street-level addresses", () => {
    const hits = dataFiles.filter((f) => /\b\d+[,/]?\s*\w+\s+(street|st\.|road|rd\.|nagar|salai|avenue|lane)\b/i.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });
});

describe("branding stays configurable", () => {
  // Branding is not confirmed yet. The name must come only from siteConfig
  // (NEXT_PUBLIC_BRAND_NAME), never be hard-coded in components or copy.
  it("does not hard-code a brand name in source files", () => {
    const hits = sources.filter((f) => /uraavu/i.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });
});

describe("no secrets in client-reachable code", () => {
  it("never exposes server-only environment variables through NEXT_PUBLIC_", () => {
    const hits = sources.filter((f) => /NEXT_PUBLIC_[A-Z_]*(SECRET|TOKEN|KEY|WEBHOOK)/.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("only reads webhook configuration inside the server-only delivery module", () => {
    const hits = sources.filter((f) => f.text.includes("LEADS_WEBHOOK")).map((f) => f.path.replace(/\\/g, "/"));
    expect(hits).toEqual(["src/lib/leads/delivery.ts"]);
  });
});
