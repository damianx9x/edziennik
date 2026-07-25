import type { Metadata } from "next";

import { TwoFactorChallenge } from "@/modules/identity/components/two-factor-challenge";

export const metadata: Metadata = { title: "Kod bezpieczeństwa" };

export default function TwoFactorChallengePage() {
  return <TwoFactorChallenge />;
}
