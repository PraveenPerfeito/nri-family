import { routes } from "@/config/routes";

const pathOnly = (path: string) => path.split(/[?#]/)[0];

/** The customer workspace: /app and everything below it. */
export const isPortalPath = (path: string) => {
  const p = pathOnly(path);
  return p === "/app" || p.startsWith("/app/");
};

/** The admin console: /admin and everything below it. */
export const isAdminPath = (path: string) => {
  const p = pathOnly(path);
  return p === "/admin" || p.startsWith("/admin/");
};

/**
 * Where to send someone after signing in or following an email link. Only
 * same-site paths inside the portal or the admin console (or the password
 * reset page) are accepted, so a crafted `next` parameter can never bounce
 * anyone to another website (open-redirect protection). Whether the person
 * may open that page is decided by the page itself.
 */
export function safeNextPath(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001F]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, "https://portal.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://portal.invalid") return fallback;
  const allowed = isPortalPath(url.pathname) || isAdminPath(url.pathname) || url.pathname === routes.resetPassword;
  return allowed ? `${url.pathname}${url.search}` : fallback;
}
