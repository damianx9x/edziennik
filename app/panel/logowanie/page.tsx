import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPreview } from "./login-preview";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPreviewPage() {
  return (
    <Suspense fallback={<main className="panel-shell" />}>
      <LoginPreview />
    </Suspense>
  );
}
