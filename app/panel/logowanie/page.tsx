import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginPreview } from "./login-preview";
import { LoginForm } from "@/modules/identity/components/login-form";
import { db } from "@/lib/server/db";
import { getPublicPresentationMode } from "@/modules/site-content/public-mode";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPreviewPage() {
  const isStaticPreview = process.env.KLA_STATIC_PREVIEW === "1";
  const neutral = getPublicPresentationMode(process.env.KLA_PUBLIC_PRESENTATION_MODE) === "PRODUCT";

  if (!isStaticPreview) {
    const ownerExists = await db.user.count({ where: { role: "SYSTEM_OWNER" } });
    if (ownerExists === 0) redirect("/pierwsze-uruchomienie");
  }

  return (
    <Suspense fallback={<main className="panel-shell" />}>
      {isStaticPreview ? <LoginPreview /> : <LoginForm neutral={neutral} />}
    </Suspense>
  );
}
