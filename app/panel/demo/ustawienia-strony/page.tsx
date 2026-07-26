import { SiteSettingsScreen } from "@/modules/site-content/components/site-settings-screen";
import { redirect } from "next/navigation";

export default function SiteSettingsPage() {
  if (process.env.KLA_STATIC_PREVIEW !== "1") {
    redirect("/panel/szkola/narzedzia/strona");
  }
  return <SiteSettingsScreen />;
}
