import type { CSSProperties } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import type { SiteContent } from "../schema";
import { widgetClassName } from "../widget-style";

export function WidgetPreview({ widget }: { widget: SiteContent["widgets"][number] }) {
  return <article className={widgetClassName(widget)} style={{ "--widget-opacity": Number(widget.opacity ?? "100") / 100 } as CSSProperties}>
    <div className="home-widget-top"><span>{widget.badge}</span><Sparkles aria-hidden="true" /></div>
    <h2>{widget.title}</h2><p>{widget.text}</p>
    <span className="widget-preview-action">{widget.actionLabel} <ArrowRight size={16} aria-hidden="true" /></span>
  </article>;
}
