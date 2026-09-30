"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FormStatus } from "@/components/portal/forms/form-status";
import { idleState, type ActionState } from "@/lib/portal/form-state";

/*
 * A panel-level place for messages that must outlive the form that caused
 * them. After a visit or a piece of evidence changes, the form that changed
 * it is often replaced by the next step, so its own message would vanish
 * with it. Actions report success here, and refusals that come with a page
 * refresh (someone else changed the record meanwhile); the region stays put,
 * is announced to screen readers and receives focus (the button that was
 * pressed may no longer exist). Other errors stay next to the form.
 */

const AnnounceContext = createContext<(state: ActionState) => void>(() => undefined);

export function FeedbackRegion({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ActionState>(idleState);
  const [version, setVersion] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // In a transition, so the message appears together with the refreshed page, not before it.
  const announce = useCallback((state: ActionState) => {
    startTransition(() => {
      setMessage(state);
      setVersion((v) => v + 1);
    });
  }, []);

  // Focus moves to the message (the button that was pressed may be gone) without scrolling the
  // page, so an admin reviewing one item after another keeps their place; it is announced either
  // way. Only a refusal is scrolled into view, so it can't go unseen.
  useEffect(() => {
    if (version === 0) return;
    ref.current?.focus({ preventScroll: true });
    if (message.status === "error") ref.current?.scrollIntoView({ block: "nearest" });
  }, [version, message.status]);

  return (
    <AnnounceContext.Provider value={announce}>
      <div className={message.status === "idle" ? undefined : "mb-4"}>
        <FormStatus
          success={message.status === "success" ? message.message : undefined}
          error={message.status === "error" ? message.message : undefined}
          statusRef={ref}
        />
      </div>
      {children}
    </AnnounceContext.Provider>
  );
}

/**
 * Wraps a Server Action for useActionState: a success, or a refusal that
 * refreshed the page, is also reported to the panel's feedback region, while
 * the result still comes back to the form.
 */
export function useReportingAction(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
  const announce = useContext(AnnounceContext);
  return useCallback(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.status === "success" || result.refreshed) announce(result);
      return result;
    },
    [action, announce],
  );
}

/** Report to the region from code that doesn't use useActionState (the evidence upload). */
export const useAnnounce = () => useContext(AnnounceContext);
