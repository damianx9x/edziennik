import type { Metadata } from "next";

import { SiteSettingsScreen } from "@/modules/site-content/components/site-settings-screen";
import { requireDirector } from "@/modules/identity/auth/session";

export const metadata: Metadata = { title: "Treść publicznej strony" };
export const dynamic = "force-dynamic";

export default async function DirectorSiteSettingsPage() {
  await requireDirector("/panel/szkola/narzedzia/strona");
  return (
    <SiteSettingsScreen
      backHref="/panel/szkola/narzedzia"
      backLabel="Narzędzia"
      protectedMode
    />
  );
}
