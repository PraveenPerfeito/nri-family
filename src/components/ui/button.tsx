import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils/cn";

/**
 * Four button styles for the whole site:
 *  - primary:   the one action we want (Get Started, submit)
 *  - secondary: a supporting action (Explore Services)
 *  - quiet:     low-emphasis utility action (header Login)
 *  - ghost:     inline/tertiary links with an arrow
 * `tone="night"` adapts each style for dark bands.
 *
 * There is no class-merging step, so callers must not pass classes that
 * compete with these (e.g. another `display` or `px-*`). Use a variant
 * prefix instead (`max-sm:hidden`, `max-sm:px-3`), which always wins.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost";
export type ButtonSize = "md" | "lg";
type Tone = "light" | "night";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const sizes: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm rounded-control",
  lg: "h-12 px-5 text-[0.9375rem] rounded-control",
};

const variants: Record<Tone, Record<ButtonVariant, string>> = {
  light: {
    primary: "bg-brand text-white hover:bg-brand-strong shadow-sm",
    secondary: "bg-surface text-ink border border-line-strong hover:border-ink/40 hover:bg-subtle",
    quiet: "text-ink-muted hover:text-ink hover:bg-subtle",
    ghost: "text-brand hover:text-brand-strong underline-offset-4 hover:underline px-0 h-auto",
  },
  night: {
    primary: "bg-white text-night hover:bg-brand-soft",
    secondary: "border border-night-line text-night-text hover:border-night-muted hover:bg-night-raised",
    quiet: "text-night-muted hover:text-white hover:bg-night-raised",
    ghost: "text-brand-muted hover:text-white underline-offset-4 hover:underline px-0 h-auto",
  },
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  tone = "light",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; tone?: Tone; className?: string } = {}) {
  return cn(base, variant === "ghost" ? "text-sm" : sizes[size], variants[tone][variant], className);
}

type TrackProps = {
  /** Analytics event fired on click (via the delegated listener). */
  track?: AnalyticsEvent;
  /** Extra non-personal analytics context, e.g. `{ location: "hero" }`. */
  trackProps?: Record<string, string>;
};

function trackAttributes({ track, trackProps }: TrackProps) {
  if (!track) return {};
  const attrs: Record<string, string> = { "data-track": track };
  for (const [key, value] of Object.entries(trackProps ?? {})) attrs[`data-track-${key}`] = value;
  return attrs;
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  TrackProps & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    tone?: Tone;
    className?: string;
    arrow?: boolean;
    children: ReactNode;
  };

export function ButtonLink({
  variant = "primary",
  size = "md",
  tone = "light",
  className,
  arrow,
  track,
  trackProps,
  children,
  ...props
}: ButtonLinkProps) {
  const showArrow = arrow ?? variant === "ghost";
  return (
    <Link
      className={buttonClasses({ variant, size, tone, className: cn("group", className) })}
      {...trackAttributes({ track, trackProps })}
      {...props}
    >
      {children}
      {showArrow ? (
        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      ) : null}
    </Link>
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; tone?: Tone };

export function Button({ variant = "primary", size = "md", tone = "light", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, tone, className })} {...props} />;
}
