import type { ReactNode } from "react";

// The panel receives a per-request CSP nonce in proxy.ts. Keeping this segment
// dynamic lets Next.js attach that nonce to its own bootstrap scripts instead
// of serving prerendered inline scripts that the browser would correctly block.
export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return children;
}
