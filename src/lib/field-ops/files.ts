import type { EvidenceMime } from "./domain";

/*
 * Checks on evidence files that don't trust the browser's word for what a
 * file is. `sniffEvidenceMime` reads the first bytes of the stored file (the
 * server does this before registering an upload), and `readJpegCaptureTime`
 * reads when a photo was taken from its EXIF data (the browser does this
 * before it resizes the photo, which drops the EXIF data and with it any
 * location). Both are pure and never throw.
 */

/** How many leading bytes `sniffEvidenceMime` needs. */
export const SNIFF_BYTES = 16;

const ascii = (bytes: Uint8Array, from: number, length: number) =>
  from + length <= bytes.length ? String.fromCharCode(...bytes.subarray(from, from + length)) : "";

/** The evidence type a file really is, from its first bytes, or null if it is none of them. */
export function sniffEvidenceMime(bytes: Uint8Array): EvidenceMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  // ISO base media (MP4). QuickTime ("qt  ") files are refused: most browsers can't play them.
  if (ascii(bytes, 4, 4) === "ftyp" && ascii(bytes, 8, 4).length === 4 && ascii(bytes, 8, 4) !== "qt  ") return "video/mp4";
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/** The file name part of what the browser reported, cleaned for storing as a label (never used as a path). */
export function cleanOriginalName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 255);
  return cleaned.length > 0 ? cleaned : null;
}

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const EXIF_OFFSET = /^[+-]\d{2}:\d{2}$/;

/**
 * When a JPEG photo was taken (EXIF DateTimeOriginal), or null. Cameras
 * record local time; when the photo also records its UTC offset
 * (OffsetTimeOriginal) that is used, otherwise India time, where field work
 * happens. Anything implausible (unparseable, before 2000, in the future) is
 * treated as unknown.
 */
export function readJpegCaptureTime(data: Uint8Array, now: Date = new Date()): Date | null {
  try {
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 4 <= data.length) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1];
      // Start of scan or end of image: the metadata segments are over.
      if (marker === 0xda || marker === 0xd9) return null;
      const length = (data[offset + 2] << 8) | data[offset + 3];
      if (length < 2) return null;
      if (marker === 0xe1 && ascii(data, offset + 4, 6) === "Exif\0\0") {
        const found = readExifDate(data.subarray(offset + 10, Math.min(data.length, offset + 2 + length)));
        if (!found) return null;
        const at = new Date(found);
        if (Number.isNaN(at.getTime()) || at.getTime() < Date.UTC(2000, 0, 1) || at.getTime() > now.getTime() + 86_400_000) return null;
        return at;
      }
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

/** ISO timestamp from the TIFF block of an EXIF segment, or null. */
function readExifDate(tiff: Uint8Array): string | null {
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const order = ascii(tiff, 0, 2);
  if (order !== "II" && order !== "MM") return null;
  const little = order === "II";
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  if (u16(2) !== 42) return null;

  /** An entry of an IFD: its type, count and the 4-byte value/offset field position. */
  const entries = (ifd: number) => {
    const count = u16(ifd);
    const found = new Map<number, { type: number; count: number; field: number }>();
    for (let i = 0; i < count && i < 512; i++) {
      const entry = ifd + 2 + i * 12;
      found.set(u16(entry), { type: u16(entry + 2), count: u32(entry + 4), field: entry + 8 });
    }
    return found;
  };
  const text = (e: { type: number; count: number; field: number } | undefined) => {
    if (!e || e.type !== 2 || e.count < 2 || e.count > 64) return null;
    const at = e.count > 4 ? u32(e.field) : e.field;
    return ascii(tiff, at, e.count - 1).replace(/\0+$/, "");
  };

  const exifPointer = entries(u32(4)).get(0x8769);
  if (!exifPointer) return null;
  const exif = entries(u32(exifPointer.field));
  const date = EXIF_DATE.exec(text(exif.get(0x9003)) ?? "");
  if (!date) return null;
  const zone = text(exif.get(0x9011));
  const offset = zone && EXIF_OFFSET.test(zone) ? zone : "+05:30";
  return `${date[1]}-${date[2]}-${date[3]}T${date[4]}:${date[5]}:${date[6]}${offset}`;
}
