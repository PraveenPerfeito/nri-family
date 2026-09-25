import { DemoLabel } from "@/components/ui/badge";

/**
 * The one sample-data badge per preview: "Concept preview" for product screens,
 * "Illustrative data" for example records and reports. Wraps the site-wide
 * DemoLabel so labels stay identical everywhere.
 */
export function PreviewBadge({ kind = "concept" }: { kind?: "concept" | "illustrative" }) {
  return <DemoLabel kind={kind} />;
}
