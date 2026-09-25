"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the site header as "scrolled" once the page leaves the top, so CSS can
 * make it more opaque with a soft edge (see [data-site-header] in globals.css).
 * Uses an IntersectionObserver on a 1px sentinel — no scroll listeners.
 */
export function HeaderScrollState() {
  const sentinel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    const el = sentinel.current;
    if (!header || !el) return;
    const observer = new IntersectionObserver(([entry]) => {
      header.dataset.scrolled = entry.isIntersecting ? "false" : "true";
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <span ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />;
}
