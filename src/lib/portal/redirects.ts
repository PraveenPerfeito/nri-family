import { routes } from "@/config/routes";

/**
 * Where to send someone after signing in or following an email link. Only
 * same-site paths inside the portal (or the password reset page) are
 * accepted, so a crafted `next` parameter can never bounce a customer to
 * another website (open-redirect protection).
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
  const allowed = url.pathname === "/app" || url.pathname.startsWith("/app/") || url.pathname === routes.resetPassword;
  return allowed ? `${url.pathname}${url.search}` : fallback;
}
