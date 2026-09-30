"use client";

import { startTransition, useActionState, useEffect, useRef, type RefObject } from "react";
import { Field, Textarea } from "@/components/forms/fields";
import { FormStatus } from "@/components/portal/forms/form-status";
import { Button } from "@/components/ui/button";
import { approveEvidenceAction, publishEvidenceAction, rejectEvidenceAction } from "@/lib/admin/actions/evidence";
import { REVIEW_NOTE_MAX, type EvidenceReviewStatus, type EvidenceVisibility } from "@/lib/field-ops/domain";
import { idleState } from "@/lib/portal/form-state";
import { ConfirmDialog } from "./confirm-dialog";
import { useReportingAction } from "./feedback";

/*
 * Review steps for one piece of evidence: approve or reject what is waiting
 * for review, then share approved evidence with the customer (confirmed
 * first) or still reject it. Shared and rejected evidence offer nothing.
 * The database refuses every other step, whatever the page offered.
 */

type Props = {
  requestId: string;
  evidence: { id: string; title: string; review_status: EvidenceReviewStatus; visibility: EvidenceVisibility };
  customerName: string;
};

function useEvidenceAction(action: typeof approveEvidenceAction, formRef: RefObject<HTMLFormElement | null>, statusRef: RefObject<HTMLDivElement | null>) {
  const [state, formAction, pending] = useActionState(useReportingAction(action), idleState);
  useEffect(() => {
    if (state.status === "error" && !state.refreshed) statusRef.current?.focus();
  }, [state, statusRef]);
  const send = () => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startTransition(() => formAction(data));
  };
  return { state, formAction, pending, send };
}

export function EvidenceActions({ requestId, evidence, customerName }: Props) {
  const statusRef = useRef<HTMLDivElement>(null);
  const approveForm = useRef<HTMLFormElement>(null);
  const publishForm = useRef<HTMLFormElement>(null);
  const rejectForm = useRef<HTMLFormElement>(null);
  const approve = useEvidenceAction(approveEvidenceAction, approveForm, statusRef);
  const publish = useEvidenceAction(publishEvidenceAction, publishForm, statusRef);
  const reject = useEvidenceAction(rejectEvidenceAction, rejectForm, statusRef);
  const publishDialog = useRef<HTMLDialogElement>(null);
  const rejectDialog = useRef<HTMLDialogElement>(null);
  const publishButton = useRef<HTMLButtonElement>(null);
  const rejectButton = useRef<HTMLButtonElement>(null);
  const busy = approve.pending || publish.pending || reject.pending;
  const pendingReview = evidence.review_status === "PENDING_REVIEW";
  const approvedInternal = evidence.review_status === "APPROVED" && evidence.visibility === "INTERNAL";
  if (!pendingReview && !approvedInternal) return null;

  // (Refusals that refreshed the page are shown by the panel's feedback region.)
  const error = [approve, publish, reject].map((a) => (a.state.status === "error" && !a.state.refreshed ? a.state.message : undefined)).find(Boolean);
  const hidden = (
    <>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="evidenceId" value={evidence.id} />
    </>
  );

  return (
    <div className="space-y-2">
      <FormStatus error={error} statusRef={statusRef} />
      <div className="flex flex-wrap gap-2">
        {pendingReview ? (
          <form ref={approveForm} action={approve.formAction}>
            {hidden}
            <Button type="submit" variant="secondary" disabled={busy} aria-label={`Approve: ${evidence.title}`}>
              {approve.pending ? "Approving…" : "Approve"}
            </Button>
          </form>
        ) : (
          <form ref={publishForm} action={publish.formAction}>
            {hidden}
            <Button ref={publishButton} variant="secondary" disabled={busy} onClick={() => publishDialog.current?.showModal()} aria-label={`Share with customer: ${evidence.title}`}>
              {publish.pending ? "Sharing…" : "Share with customer"}
            </Button>
          </form>
        )}
        <Button ref={rejectButton} variant="quiet" disabled={busy} onClick={() => rejectDialog.current?.showModal()} aria-label={`Reject: ${evidence.title}`}>
          {reject.pending ? "Rejecting…" : "Reject"}
        </Button>
      </div>

      <ConfirmDialog
        dialogRef={publishDialog}
        id={`confirm-share-${evidence.id}`}
        title="Share this with the customer?"
        confirmLabel="Share"
        onConfirm={() => {
          publishDialog.current?.close();
          publish.send();
        }}
        onClose={() => publishButton.current?.focus()}
      >
        <p>
          {customerName} will see “{evidence.title}” on their request and get a notification.
        </p>
        <p>Shared evidence stays visible to them. It can&apos;t be withdrawn from the console.</p>
      </ConfirmDialog>

      <dialog
        ref={rejectDialog}
        aria-labelledby={`reject-${evidence.id}-title`}
        onClose={() => rejectButton.current?.focus()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-night/40"
      >
        <form
          ref={rejectForm}
          action={reject.formAction}
          onSubmit={(event) => {
            event.preventDefault();
            rejectDialog.current?.close();
            reject.send();
          }}
          className="p-6"
        >
          {hidden}
          <h2 id={`reject-${evidence.id}-title`} className="text-lg font-semibold tracking-tight">
            Reject this evidence?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">It stays on record for the team and is never shown to the customer.</p>
          <Field id={`reason-${evidence.id}`} label="Reason" optional hint="Internal: only the team sees it." className="mt-4">
            {(describedBy) => <Textarea id={`reason-${evidence.id}`} name="reason" rows={3} maxLength={REVIEW_NOTE_MAX} aria-describedby={describedBy} className="min-h-20" />}
          </Field>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => rejectDialog.current?.close()}>
              Go back
            </Button>
            <Button type="submit" variant="danger">
              Reject
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
