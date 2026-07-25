import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/modules/identity/components/reset-password-form";

export const metadata: Metadata = { title: "Nowe hasło" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="auth-page" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
