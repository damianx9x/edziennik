import type { Metadata } from "next";

import { PasswordRecoveryForm } from "@/modules/identity/components/password-recovery-form";

export const metadata: Metadata = { title: "Odzyskaj dostęp" };

export default function PasswordRecoveryPage() {
  return <PasswordRecoveryForm />;
}
