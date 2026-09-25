import { FileText, FolderLock, Lock } from "lucide-react";
import { documentPreview as d } from "@/data/previews";
import { FloatingCard, PreviewAction, PreviewDivider, PreviewHeader, PreviewRow, PreviewSection, PreviewStatus, PreviewTitle, ProductPreviewShell } from "..";

/** Document Assistance: important papers organised and visible from one private workspace. */
export function DocumentPreview() {
  const due = d.documents.find((doc) => doc.tone === "attention");
  return (
    <ProductPreviewShell
      label="Concept preview: document workspace"
      summary={`Concept preview with sample data. A private document workspace with ${d.count} documents across three properties. ${d.documents
        .map((doc) => `${doc.name} for ${doc.property}: ${doc.status.toLowerCase()}`)
        .join("; ")}. Access: private, the owner and authorised team only. Last updated ${d.lastUpdated}.`}
      floating={
        due ? (
          <FloatingCard className="bottom-[calc(100%-0.5rem)] -right-6 w-60">
            <p className="text-label flex items-center gap-1.5 text-attention">
              <span className="size-1.5 rounded-full bg-attention-bright" />
              {due.status}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{due.name}</p>
            <p className="text-[0.6875rem] text-ink-subtle">
              {due.property} · {due.date}
            </p>
          </FloatingCard>
        ) : null
      }
    >
      <PreviewHeader icon={FolderLock} title="Documents" />

      <PreviewSection>
        <PreviewTitle
          eyebrow="Private workspace"
          title={`${d.count} documents`}
          aside={
            <span className="text-label inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-ink">
              <Lock className="size-3 text-brand" strokeWidth={2.25} />
              Private
            </span>
          }
        />
        <ul className="mt-4 divide-y divide-line-subtle rounded-control border border-line-subtle">
          {d.documents.map((doc) => (
            <li key={doc.name} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-subtle">
                <FileText className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[0.8125rem] font-medium text-ink">{doc.name}</span>
                  <span className="sm:hidden">
                    <PreviewStatus tone={doc.tone}>{doc.status}</PreviewStatus>
                  </span>
                </span>
                <span className="block truncate text-[0.6875rem] text-ink-subtle">
                  {doc.property} · {doc.date}
                </span>
              </span>
              <span className="max-sm:hidden">
                <PreviewStatus tone={doc.tone}>{doc.status}</PreviewStatus>
              </span>
              <span className="max-sm:hidden">
                <PreviewAction />
              </span>
            </li>
          ))}
        </ul>
      </PreviewSection>

      <PreviewDivider />
      <PreviewSection className="py-2">
        <div className="divide-y divide-line-subtle">
          <PreviewRow label="Access" value="Owner and authorised team" />
          <PreviewRow label="Last updated" value={d.lastUpdated} />
        </div>
      </PreviewSection>
    </ProductPreviewShell>
  );
}
