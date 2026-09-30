import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { evidenceFileRoutes } from "@/config/routes";
import { completionBlocker, currentVisit, evidenceObjectPath, fieldWorkTransitions, visitStates } from "@/lib/field-ops/domain";
import { cleanOriginalName, readJpegCaptureTime, sniffEvidenceMime } from "@/lib/field-ops/files";
import { evidenceKindOfFile } from "@/lib/field-ops/photo";
import { describeVisitTime, formatVisitWindow, indiaInstant, indiaParts, indiaToday, isCalendarDate, isClockTime, visitWindowOf, zoneCity } from "@/lib/field-ops/schedule";

/*
 * Phase 2C logic that needs no database: recognising files by their
 * contents, reading when a photo was taken, India-time scheduling, the
 * vocabulary, and guards on the new code (who may reach which data).
 */

const bytes = (...parts: (string | number[])[]) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("recognising evidence files by their contents", () => {
  it("knows the accepted types from their first bytes", () => {
    expect(sniffEvidenceMime(bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF"))).toBe("image/jpeg");
    expect(sniffEvidenceMime(bytes([0x89], "PNG\r\n", [0x1a], "\n", "IHDR"))).toBe("image/png");
    expect(sniffEvidenceMime(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("image/webp");
    expect(sniffEvidenceMime(bytes([0, 0, 0, 24], "ftypisom", [0, 0, 2, 0]))).toBe("video/mp4");
    expect(sniffEvidenceMime(bytes([0, 0, 0, 24], "ftypmp42"))).toBe("video/mp4");
    expect(sniffEvidenceMime(bytes("%PDF-1.7\n"))).toBe("application/pdf");
  });

  it("recognises the recorded sample video used by the acceptance test", () => {
    const fixture = readFileSync(join(process.cwd(), "scripts", "fixtures", "sample-evidence.mp4"));
    expect(sniffEvidenceMime(new Uint8Array(fixture.subarray(0, 16)))).toBe("video/mp4");
  });

  it("refuses everything else: web pages, SVG, scripts, executables, QuickTime, empty files", () => {
    for (const other of [
      bytes("<!doctype html><script>"),
      bytes("<svg xmlns="),
      bytes("#!/bin/sh\n"),
      bytes("MZ", [0x90, 0]),
      bytes([0, 0, 0, 20], "ftypqt  "),
      bytes("GIF89a"),
      bytes([0xff, 0xd8]),
      bytes(),
    ]) {
      expect(sniffEvidenceMime(other)).toBeNull();
    }
  });

  it("keeps only the file name part of what the browser reports", () => {
    expect(cleanOriginalName("C:\\fakepath\\IMG_2031.JPG")).toBe("IMG_2031.JPG");
    expect(cleanOriginalName("../../etc/passwd")).toBe("passwd");
    expect(cleanOriginalName("a\u0000b\u001f.jpg")).toBe("ab.jpg");
    expect(cleanOriginalName("   ")).toBeNull();
    expect(cleanOriginalName(42)).toBeNull();
    expect(cleanOriginalName("x".repeat(300))).toHaveLength(255);
  });

  it("classifies a chosen file by type, and by name when the browser gives no type", () => {
    expect(evidenceKindOfFile({ type: "image/heic", name: "IMG.HEIC" })).toBe("PHOTO");
    expect(evidenceKindOfFile({ type: "", name: "photo.jpeg" })).toBe("PHOTO");
    expect(evidenceKindOfFile({ type: "video/mp4", name: "walk.mp4" })).toBe("VIDEO");
    expect(evidenceKindOfFile({ type: "", name: "sheet.pdf" })).toBe("DOCUMENT");
    expect(evidenceKindOfFile({ type: "video/quicktime", name: "clip.mov" })).toBeNull();
    expect(evidenceKindOfFile({ type: "text/html", name: "page.jpg" })).toBeNull();
    expect(evidenceKindOfFile({ type: "application/x-msdownload", name: "setup.exe" })).toBeNull();
  });
});

/** A JPEG with an EXIF block holding DateTimeOriginal (and optionally OffsetTimeOriginal). */
function jpegWithExif(date: string, offset?: string, order: "II" | "MM" = "II") {
  const little = order === "II";
  const u16 = (v: number) => (little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) => (little ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24] : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]);
  const tags: [number, string][] = [[0x9003, `${date}\0`], ...(offset ? ([[0x9011, `${offset}\0`]] as [number, string][]) : [])];
  const exifIfd = 26;
  let dataAt = exifIfd + 2 + 12 * tags.length + 4;
  const tiff = [...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8), ...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifIfd), ...u32(0), ...u16(tags.length)];
  const data: number[] = [];
  for (const [tag, text] of tags) {
    const chars = [...text].map((c) => c.charCodeAt(0));
    tiff.push(...u16(tag), ...u16(2), ...u32(chars.length), ...u32(dataAt));
    data.push(...chars);
    dataAt += chars.length;
  }
  tiff.push(...u32(0), ...data);
  const segment = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const length = segment.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...segment, 0xff, 0xda, 0, 2]);
}

describe("when a photo was taken (EXIF)", () => {
  const now = new Date("2026-09-30T12:00:00Z");

  it("reads DateTimeOriginal as India time when the photo records no offset", () => {
    expect(readJpegCaptureTime(jpegWithExif("2026:09:29 10:15:00"), now)?.toISOString()).toBe("2026-09-29T04:45:00.000Z");
  });

  it("uses the recorded offset, in either byte order", () => {
    expect(readJpegCaptureTime(jpegWithExif("2026:09:29 10:15:00", "+04:00"), now)?.toISOString()).toBe("2026-09-29T06:15:00.000Z");
    expect(readJpegCaptureTime(jpegWithExif("2026:09:29 10:15:00", "-05:00", "MM"), now)?.toISOString()).toBe("2026-09-29T15:15:00.000Z");
  });

  it("treats anything implausible or malformed as unknown, and never throws", () => {
    expect(readJpegCaptureTime(jpegWithExif("2027:01:01 00:00:00"), now)).toBeNull();
    expect(readJpegCaptureTime(jpegWithExif("1999:12:31 23:59:59"), now)).toBeNull();
    expect(readJpegCaptureTime(jpegWithExif("not a date at all!!"), now)).toBeNull();
    expect(readJpegCaptureTime(jpegWithExif("2026:09:29 10:15:00").subarray(0, 30), now)).toBeNull();
    expect(readJpegCaptureTime(bytes("%PDF-1.7"), now)).toBeNull();
    expect(readJpegCaptureTime(bytes([0xff, 0xd8, 0xff, 0xda, 0, 2]), now)).toBeNull();
    const noise = new Uint8Array(4096).map((_, i) => (i * 7919) % 256);
    noise.set([0xff, 0xd8, 0xff, 0xe1, 0x0f, 0xff], 0);
    expect(() => readJpegCaptureTime(noise, now)).not.toThrow();
  });
});

describe("visit times (India time)", () => {
  it("turns an India date and clock time into the right instant, all year round", () => {
    expect(indiaInstant("2026-10-06", "10:00").toISOString()).toBe("2026-10-06T04:30:00.000Z");
    expect(indiaInstant("2026-03-29", "00:30").toISOString()).toBe("2026-03-28T19:00:00.000Z");
    expect(indiaInstant("2026-12-31", "23:59").toISOString()).toBe("2026-12-31T18:29:00.000Z");
  });

  it("knows the date in India, which changes at 18:30 UTC", () => {
    expect(indiaToday(new Date("2026-09-29T18:29:00Z"))).toBe("2026-09-29");
    expect(indiaToday(new Date("2026-09-29T18:30:00Z"))).toBe("2026-09-30");
    expect(indiaParts("2026-10-06T04:30:00Z")).toEqual({ date: "2026-10-06", time: "10:00" });
  });

  it("accepts only real dates and 24-hour times", () => {
    for (const ok of ["2026-10-06", "2028-02-29"]) expect(isCalendarDate(ok), ok).toBe(true);
    for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "06/10/2026", "2026-1-6", ""]) expect(isCalendarDate(bad), bad).toBe(false);
    for (const ok of ["00:00", "09:05", "23:59"]) expect(isClockTime(ok), ok).toBe(true);
    for (const bad of ["24:00", "9:05", "10:60", "10.30", ""]) expect(isClockTime(bad), bad).toBe(false);
  });

  it("shows a window in India time, and the same window where the customer lives", () => {
    const start = "2026-10-06T04:30:00Z";
    const end = "2026-10-06T06:30:00Z";
    expect(formatVisitWindow(start, end)).toBe("Tue, 6 Oct 2026, 10:00–12:00");
    expect(describeVisitTime(start, end, "Asia/Dubai")).toEqual({ india: "Tue, 6 Oct 2026, 10:00–12:00 India time", local: "Tue, 6 Oct 2026, 08:30–10:30 in Dubai" });
    expect(describeVisitTime(start, end, "Asia/Kolkata").local).toBeNull();
    expect(describeVisitTime(start, null, null)).toEqual({ india: "Tue, 6 Oct 2026, 10:00 India time", local: null });
    // Crossing midnight where the customer is names both days.
    expect(describeVisitTime("2026-10-06T06:00:00Z", "2026-10-06T08:00:00Z", "America/Los_Angeles").local).toBe("Mon, 5 Oct 2026, 23:00 – Tue, 6 Oct 2026, 01:00 in Los Angeles");
    expect(zoneCity("America/New_York")).toBe("New York");
  });

  it("reads a visit time from a timeline event, and ignores anything malformed", () => {
    expect(visitWindowOf({ scheduled_start: "2026-10-06T04:30:00Z", scheduled_end: null })).toEqual({ start: "2026-10-06T04:30:00Z", end: null });
    for (const bad of [null, {}, { scheduled_start: "soon" }, { scheduled_start: 42 }]) expect(visitWindowOf(bad)).toBeNull();
  });
});

describe("the vocabulary", () => {
  it("the visit lifecycle has final states and a way back only through a new visit", () => {
    expect(visitStates).toHaveLength(5);
    expect(fieldWorkTransitions.COMPLETED).toEqual([]);
    expect(fieldWorkTransitions.CANCELLED).toEqual([]);
    expect(fieldWorkTransitions.NOT_SCHEDULED).toEqual(["SCHEDULED"]);
    expect(fieldWorkTransitions.SCHEDULED).not.toContain("COMPLETED");
  });

  it("the current visit is the open one, else the latest", () => {
    const v = (status: string, created_at: string) => ({ status, created_at }) as never;
    expect(currentVisit([v("CANCELLED", "2026-09-01"), v("SCHEDULED", "2026-09-02")])).toMatchObject({ status: "SCHEDULED" });
    expect(currentVisit([v("CANCELLED", "2026-09-01"), v("CANCELLED", "2026-09-03")])).toMatchObject({ created_at: "2026-09-03" });
    expect(currentVisit([])).toBeNull();
  });

  it("evidence paths are lower-case ids and a fixed file name", () => {
    expect(evidenceObjectPath("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "application/pdf")).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/original.pdf",
    );
  });

  it("completion waits for the visit and its evidence", () => {
    expect(completionBlocker([{ status: "SCHEDULED" }], [])).toBe("field_work_open");
    expect(completionBlocker([{ status: "COMPLETED" }], [{ review_status: "APPROVED", visibility: "INTERNAL" }])).toBe("evidence_required");
    expect(completionBlocker([], [{ review_status: "PENDING_REVIEW", visibility: "INTERNAL" }])).toBe("evidence_pending");
    expect(completionBlocker([], [])).toBeNull();
  });
});

// ── Guards on the new code ─────────────────────────────────────────────────────

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}
const SRC = join(process.cwd(), "src");
const sources = filesUnder(SRC).map((path) => ({ path: relative(process.cwd(), path).replace(/\\/g, "/"), text: readFileSync(path, "utf8") }));
const APP = join(SRC, "app");

describe("guards on the Phase 2C code", () => {
  it("the evidence file routes exist, are route handlers (not pages), and check who is asking first", () => {
    for (const [route, guard] of [
      [evidenceFileRoutes.customer("[id]", "[evidenceId]"), "getCustomer()"],
      [evidenceFileRoutes.admin("[id]", "[evidenceId]"), "getAdmin()"],
    ]) {
      const group = route.startsWith("/admin") ? "(admin)" : "(portal)";
      const dir = join(APP, group, route.slice(1));
      expect(existsSync(join(dir, "route.ts")), route).toBe(true);
      expect(existsSync(join(dir, "page.tsx")), route).toBe(false);
      const code = readFileSync(join(dir, "route.ts"), "utf8");
      expect(code.indexOf(`await ${guard}`), route).toBeGreaterThan(0);
      expect(code.indexOf(`await ${guard}`), route).toBeLessThan(code.indexOf("evidenceFileRedirect("));
      expect(code, route).toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("customer code never reads the team's internal records", () => {
    const customer = sources.filter((f) => /^src\/(app\/\(portal\)|components\/portal|lib\/portal)\//.test(f.path));
    const hits = customer.filter((f) => /_internal\b/.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("customer queries of visits and evidence select named, customer-safe columns only", () => {
    const data = readFileSync(join(SRC, "lib", "portal", "data.ts"), "utf8");
    const visit = /const CUSTOMER_VISIT = "([^"]+)"/.exec(data)?.[1].split(", ") ?? [];
    const evidence = /const CUSTOMER_EVIDENCE = "([^"]+)"/.exec(data)?.[1].split(", ") ?? [];
    expect(visit.length).toBeGreaterThan(0);
    expect(evidence.length).toBeGreaterThan(0);
    for (const secret of ["storage_path", "original_name", "uploaded_by", "reviewed_by", "review_note", "published_by", "instructions", "execution_notes"]) {
      expect([...visit, ...evidence], secret).not.toContain(secret);
    }
  });

  it("pages never contain signed file links: evidence is linked through the app's own routes only", () => {
    const ui = sources.filter((f) => /^src\/(components|app)\//.test(f.path) && !f.path.endsWith("route.ts"));
    const hits = ui.filter((f) => /createSignedUrl|createSignedUploadUrl|storage\/v1/.test(f.text)).map((f) => f.path);
    expect(hits).toEqual([]);
  });

  it("evidence images never go through the Next.js image optimiser (it would cache private files)", () => {
    const ui = sources.filter((f) => /evidence/.test(f.path) && f.path.endsWith(".tsx"));
    expect(ui.length).toBeGreaterThan(2);
    for (const f of ui) expect(f.text, f.path).not.toMatch(/from ["']next\/image["']/);
  });

  it("no public evidence bucket, and no Storage writes outside the admin evidence actions", () => {
    const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "20260930090000_phase_2c_field_operations.sql"), "utf8");
    expect(migration).toMatch(/'request-evidence', 'request-evidence', false/);
    expect(migration).not.toMatch(/public\s*=\s*true/);
    const writers = sources.filter((f) => /\.(createSignedUploadUrl|remove|upload|update)\s*\(/.test(f.text) && /storage/.test(f.text)).map((f) => f.path);
    expect(writers).toEqual(["src/lib/admin/actions/evidence.ts"]);
  });
});
