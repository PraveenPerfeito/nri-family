import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0b1522",
          color: "#e8edf3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#0f5a4f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 32 32">
              <path d="M8 14.5 16 8l8 6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="19.5" r="3.6" fill="none" stroke="#fff" strokeWidth="2.4" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#ffffff" }}>{siteConfig.name}</div>
            <div style={{ fontSize: 18, letterSpacing: 4, color: "#9eacbf", textTransform: "uppercase" }}>
              {siteConfig.descriptor}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#ffffff", lineHeight: 1.05, letterSpacing: -2 }}>
            {siteConfig.tagline}
          </div>
          <div style={{ fontSize: 34, color: "#a8cdc2" }}>{siteConfig.promise}</div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 22, color: "#9eacbf" }}>
          <span>Property care</span>
          <span>·</span>
          <span>Inspections</span>
          <span>·</span>
          <span>Documents</span>
          <span>·</span>
          <span>Family assistance</span>
        </div>
      </div>
    ),
    size,
  );
}
