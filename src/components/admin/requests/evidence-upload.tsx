"use client";

import { useRef, useState, type FormEvent } from "react";
import { focusFirstError, validateForm } from "@/components/forms/client-validation";
import { Field, Input, Select, Textarea } from "@/components/forms/fields";
import { FormStatus, PendingButton } from "@/components/portal/forms/form-status";
import { finishEvidenceUpload, prepareEvidenceUpload } from "@/lib/admin/actions/evidence";
import { EVIDENCE_DESCRIPTION_MAX, EVIDENCE_TITLE_MAX, EVIDENCE_TITLE_MIN, evidenceStages } from "@/lib/field-ops/domain";
import { UploadProblem, evidenceKindOfFile, prepareEvidenceFile, uploadToSignedUrl } from "@/lib/field-ops/photo";
import type { FieldErrors } from "@/lib/validation/leads";
import { useAnnounce } from "./feedback";

type Phase = "idle" | "preparing" | "uploading" | "saving";

const phaseLabels: Record<Exclude<Phase, "idle">, string> = {
  preparing: "Preparing the file…",
  uploading: "Uploading…",
  saving: "Checking and saving…",
};

/**
 * Add a photo, video or PDF as evidence. The file goes straight to the
 * private bucket with a one-time upload link; the server then checks what
 * was stored and registers it. New evidence waits for review and is not
 * visible to the customer. The title and description are what the customer
 * will read if it is shared. The form stays in place for the next file, so
 * it confirms each upload itself, next to its button.
 */
export function EvidenceUploadForm({ requestId }: { requestId: string }) {
  const announce = useAnnounce();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const statusRef = useRef<HTMLDivElement>(null);
  const busy = phase !== "idle";

  const report = (outcome: { error?: string; done?: string }) => {
    setError(outcome.error);
    setDone(outcome.done);
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: true }));
  };
  const fail = (message: string) => report({ error: message });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const errors = validateForm(form);
    const file = (form.elements.namedItem("file") as HTMLInputElement | null)?.files?.[0];
    if (!file) errors.file = "Please choose a photo, video or PDF.";
    else if (!evidenceKindOfFile(file)) errors.file = "Use a JPEG, PNG, WebP or HEIC photo, an MP4 video or a PDF.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstError(form, errors);
      return;
    }
    setFieldErrors({});
    setError(undefined);
    setDone(undefined);
    const data = new FormData(form);

    try {
      setPhase("preparing");
      const prepared = await prepareEvidenceFile(file!);
      const ticket = await prepareEvidenceUpload({ requestId, mimeType: prepared.mime, size: prepared.blob.size });
      if (!ticket.ok) throw new UploadProblem(ticket.message);

      setPhase("uploading");
      setProgress(0);
      await uploadToSignedUrl(ticket.uploadUrl, ticket.apiKey, prepared.blob, prepared.mime, setProgress);

      setPhase("saving");
      const result = await finishEvidenceUpload({
        requestId,
        evidenceId: ticket.evidenceId,
        mimeType: prepared.mime,
        stage: String(data.get("stage") ?? ""),
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        capturedAt: prepared.capturedAt,
        originalName: file!.name,
      });
      if (result.status === "success") {
        form.reset();
        report({ done: result.message });
      } else if (result.refreshed) {
        announce(result);
      } else {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        fail(result.message ?? "The evidence couldn't be saved. Please try again.");
      }
    } catch (problem) {
      fail(problem instanceof UploadProblem ? problem.message : "The upload didn't go through. Please check your connection and try again.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} onChange={() => Object.keys(fieldErrors).length > 0 && setFieldErrors({})} noValidate className="space-y-4" aria-busy={busy}>
      <Field
        id="evidence-file"
        label="Photo, video or PDF"
        hint="Photos are resized to 2,560 px and saved as JPEG, which removes location data. MP4 videos up to 50 MB, PDFs up to 20 MB."
        error={fieldErrors.file}
      >
        {(describedBy) => (
          <input
            id="evidence-file"
            type="file"
            name="file"
            required
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,application/pdf"
            aria-describedby={describedBy}
            aria-invalid={fieldErrors.file ? true : undefined}
            disabled={busy}
            className="block w-full rounded-control text-sm text-ink file:mr-3 file:h-10 file:cursor-pointer file:rounded-control file:border file:border-line-strong file:bg-surface file:px-4 file:text-sm file:font-medium file:text-ink hover:file:border-ink/35 focus-visible:shadow-focus focus-visible:outline-none"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field id="evidence-stage" label="When was it taken?" error={fieldErrors.stage}>
          {(describedBy) => (
            <Select id="evidence-stage" name="stage" required defaultValue="" data-label="when it was taken" aria-describedby={describedBy} aria-invalid={fieldErrors.stage ? true : undefined} disabled={busy}>
              <option value="" disabled>
                Choose
              </option>
              {evidenceStages.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="evidence-title" label="Title" hint="The customer reads this if you share it. It is also the photo's description for screen readers." error={fieldErrors.title}>
          {(describedBy) => (
            <Input
              id="evidence-title"
              name="title"
              required
              minLength={EVIDENCE_TITLE_MIN}
              maxLength={EVIDENCE_TITLE_MAX}
              placeholder="Front garden after trimming"
              data-label="a title"
              aria-describedby={describedBy}
              aria-invalid={fieldErrors.title ? true : undefined}
              disabled={busy}
            />
          )}
        </Field>
      </div>
      <Field id="evidence-description" label="Description" optional hint="Also shown to the customer if you share it." error={fieldErrors.description}>
        {(describedBy) => (
          <Textarea
            id="evidence-description"
            name="description"
            rows={2}
            maxLength={EVIDENCE_DESCRIPTION_MAX}
            aria-describedby={describedBy}
            aria-invalid={fieldErrors.description ? true : undefined}
            disabled={busy}
            className="min-h-16"
          />
        )}
      </Field>
      <div aria-live="polite" className="text-sm text-ink-muted">
        {busy ? (
          <div className="space-y-1.5">
            <p>
              {phaseLabels[phase as Exclude<Phase, "idle">]}
              {phase === "uploading" ? ` ${progress}%` : ""}
            </p>
            {phase === "uploading" ? (
              <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <FormStatus error={error} success={done} statusRef={statusRef} />
      <PendingButton pending={busy} variant="secondary" pendingLabel="Adding…">
        Add evidence
      </PendingButton>
      <p className="text-xs text-ink-subtle">Nothing is shown to the customer until it is approved and you choose to share it.</p>
    </form>
  );
}
