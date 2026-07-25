import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Edycja strony",
  description: "Prosty edytor treści i zdjęć publicznej strony KLA.",
};

export default function SiteSettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
