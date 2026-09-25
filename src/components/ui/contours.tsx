import { cn } from "@/lib/utils/cn";

/*
 * Topographic contour lines, generated on the server: smooth closed curves
 * around a point. Drawn at very low contrast so they almost disappear — the
 * map-inspired texture behind heroes and the closing CTA.
 */
function contourPath(cx: number, cy: number, r: number, seed: number): string {
  const steps = 48;
  const pts = Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    const k = 1 + 0.07 * Math.sin(3 * t + seed) + 0.045 * Math.cos(5 * t - seed * 1.3) + 0.02 * Math.sin(7 * t + seed * 0.7);
    return [cx + Math.cos(t) * r * k * 1.35, cy + Math.sin(t) * r * k] as const;
  });
  // Catmull-Rom → cubic Bézier for a smooth closed path.
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < steps; i++) {
    const p0 = pts[(i - 1 + steps) % steps];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % steps];
    const p3 = pts[(i + 2) % steps];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

const cache = new Map<string, string[]>();

function rings(cx: number, cy: number, count: number): string[] {
  const key = `${cx},${cy},${count}`;
  let paths = cache.get(key);
  if (!paths) {
    paths = Array.from({ length: count }, (_, i) => contourPath(cx, cy, 70 + i * 62, i * 0.9));
    cache.set(key, paths);
  }
  return paths;
}

/**
 * Decorative contour field. `origin` places the centre inside a 1400×760
 * canvas; the SVG is anchored to the top-right (or top-centre) and cropped.
 */
export function ContourLines({
  origin = [1020, 150],
  count = 7,
  stroke = "rgb(14 26 43 / 0.055)",
  align = "right",
  className,
}: {
  origin?: [number, number];
  count?: number;
  stroke?: string;
  align?: "right" | "center";
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 h-full w-full max-w-[1400px] min-w-[900px]",
        align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
        className,
      )}
      viewBox="0 0 1400 760"
      preserveAspectRatio={align === "right" ? "xMaxYMin slice" : "xMidYMid slice"}
    >
      <g fill="none" stroke={stroke} strokeWidth="1">
        {rings(origin[0], origin[1], count).map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
