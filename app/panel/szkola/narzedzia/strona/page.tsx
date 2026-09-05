import type { Metadata } from "next";

import { SiteSettingsScreen } from "@/modules/site-content/components/site-settings-screen";
import { requireDirector } from "@/modules/identity/auth/session";
import { requireEnabledModule } from "@/modules/module-access/server";

export const metadata: Metadata = { title: "Treść publicznej strony" };
export const dynamic = "force-dynamic";

export default async function DirectorSiteSettingsPage() {
  const session = await requireDirector("/panel/szkola/narzedzia/strona");
  await requireEnabledModule(session, "siteEditor");
  return (
    <SiteSettingsScreen
      backHref="/panel/szkola/narzedzia"
      backLabel="Narzędzia"
      protectedMode
    />
  );
}
