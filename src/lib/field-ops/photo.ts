import type { EvidenceKind, EvidenceMime } from "./domain";
import { readJpegCaptureTime } from "./files";

/*
 * Browser-only: getting a file ready for upload. Photos are redrawn at no
 * more than 2,560 px on the long side and saved as JPEG. That keeps them
 * quick to open on a phone abroad, and it drops the photo's EXIF data,
 * including any GPS location. When the photo was taken is read from the
 * EXIF data first. Videos and PDFs are uploaded as they are. The server
 * checks the stored file's contents again before it becomes evidence.
 */

export const PHOTO_MAX_EDGE = 2560;
const JPEG_QUALITY = 0.86;

export class UploadProblem extends Error {}

/** What kind of evidence a chosen file would be, from its type and name, or null. */
export function evidenceKindOfFile(file: Pick<File, "type" | "name">): EvidenceKind | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith("image/") || (!type && /\.(jpe?g|png|webp|heic|heif)$/.test(name))) return "PHOTO";
  if (type === "video/mp4" || (!type && name.endsWith(".mp4"))) return "VIDEO";
  if (type === "application/pdf" || (!type && name.endsWith(".pdf"))) return "DOCUMENT";
  return null;
}

async function resizePhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new UploadProblem("This photo can't be opened in this browser. Please use a JPEG, PNG or WebP photo.");
    }
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new UploadProblem("This photo couldn't be prepared. Please try again.");
    // JPEG has no transparency: transparent areas (in a PNG, say) become white.
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new UploadProblem("This photo couldn't be prepared. Please try again.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The file as it will be uploaded, its type, and when it was taken (photos only, when known). */
export async function prepareEvidenceFile(file: File): Promise<{ blob: Blob; mime: EvidenceMime; capturedAt: string | null }> {
  const kind = evidenceKindOfFile(file);
  if (kind === "PHOTO") {
    const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    const capturedAt = readJpegCaptureTime(head)?.toISOString() ?? null;
    return { blob: await resizePhoto(file), mime: "image/jpeg", capturedAt };
  }
  if (kind === "VIDEO") return { blob: file, mime: "video/mp4", capturedAt: null };
  if (kind === "DOCUMENT") return { blob: file, mime: "application/pdf", capturedAt: null };
  throw new UploadProblem("Use a JPEG, PNG, WebP or HEIC photo, an MP4 video or a PDF.");
}

/**
 * Send the file straight to the private bucket with the one-time upload link
 * (never through this app's server). Reports progress from 0 to 100.
 */
export function uploadToSignedUrl(url: string, apiKey: string, blob: Blob, mime: EvidenceMime, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", mime);
    if (apiKey) request.setRequestHeader("apikey", apiKey);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new UploadProblem(request.status === 413 ? "This file is too large to upload." : "The upload didn't go through. Please try again."));
    };
    request.onerror = () => reject(new UploadProblem("The upload didn't go through. Please check your connection and try again."));
    request.onabort = () => reject(new UploadProblem("The upload was stopped. Please try again."));
    request.send(blob);
  });
}
