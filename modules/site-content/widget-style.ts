import type { SiteContent } from "./schema";

export function widgetClassName(widget: SiteContent["widgets"][number]) {
  const inverted = widget.tone === "navy" && (widget.surface ?? "solid") === "solid" && Number(widget.opacity ?? "100") >= 65;
  return `home-widget home-widget-${widget.size} home-widget-${widget.tone} home-widget-surface-${widget.surface ?? "solid"} home-widget-border-${widget.borderStyle ?? "accent"} home-widget-blend-${widget.blend ?? "normal"} home-widget-align-${widget.alignment ?? "left"} home-widget-density-${widget.density ?? "comfortable"}${inverted ? " home-widget-inverted" : ""}`;
}
