import type { RenderStatus } from "@/types";

const STATUS_CONFIG: Record<
  RenderStatus,
  { label: string; color: string; dot: string }
> = {
  draft:            { label: "Draft",           color: "text-muted-fg border-border bg-muted/50",        dot: "bg-muted-fg" },
  config_generated: { label: "Outline Ready",   color: "text-warning border-warning/30 bg-warning/10",   dot: "bg-warning" },
  rendering:        { label: "Rendering...",     color: "text-accent border-accent/30 bg-accent/10",      dot: "bg-accent animate-pulse" },
  ready:            { label: "Ready",            color: "text-success border-success/30 bg-success/10",   dot: "bg-success" },
  failed:           { label: "Failed",           color: "text-danger border-danger/30 bg-danger/10",      dot: "bg-danger" },
};

/**
 * Displays a colored status badge for a DemoProject's renderStatus.
 *
 * @param status - The current renderStatus value.
 */
export function StatusBadge({ status }: { status: RenderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`status-badge border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
