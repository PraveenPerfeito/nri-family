/*
 * Product preview system: the building blocks for the page-hero previews of the
 * future family-office platform. One visual language, a different screen per
 * page. Page compositions live in ./previews; their sample data in
 * src/data/previews.ts.
 */
export { ProductPreviewShell, FloatingCard } from "./product-preview-shell";
export { PreviewHeader } from "./preview-header";
export { PreviewBadge } from "./preview-badge";
export { PreviewSection, PreviewTitle } from "./preview-section";
export { PreviewDivider } from "./preview-divider";
export { PreviewMetric } from "./preview-metric";
export { PreviewStatus } from "./preview-status";
export { PreviewRow } from "./preview-row";
export { PreviewAvatar } from "./preview-avatar";
export { PreviewAction } from "./preview-action";
export { PreviewActivity } from "./preview-activity";
export { PreviewTimeline } from "./preview-timeline";
export { PreviewProgress, PreviewStages } from "./preview-progress";
export type { PreviewTone, PreviewActivityItem, PreviewStep } from "./types";
