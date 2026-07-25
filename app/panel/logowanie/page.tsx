import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginPreview } from "./login-preview";
import { LoginForm } from "@/modules/identity/components/login-form";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPreviewPage() {
  const isStaticPreview = process.env.KLA_STATIC_PREVIEW === "1";

  return (
    <Suspense fallback={<main className="panel-shell" />}>
      {isStaticPreview ? <LoginPreview /> : <LoginForm />}
    </Suspense>
  );
}
