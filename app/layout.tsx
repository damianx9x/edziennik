import type { Metadata, Viewport } from "next";

import { FeedbackWidget } from "./components/feedback-widget";
import { PageVisitTracker } from "./components/page-visit-tracker";
import { ThemeToggle } from "./components/theme-toggle";
import { SiteContentProvider } from "../modules/site-content/site-content-provider";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "King’s Language Academy — nauka, która dodaje odwagi",
    template: "%s | King’s Language Academy",
  },
  description:
    "Prywatna szkoła języka angielskiego dla dzieci i młodzieży. Małe grupy na Pomorzu i online oraz prosty eDziennik KLA.",
  icons: {
    icon: [{ url: "/kla-logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/kla-logo.jpg", type: "image/jpeg" }],
  },
  openGraph: {
    title: "King’s Language Academy — nauka, która dodaje odwagi",
    description:
      "Prywatna szkoła angielskiego: małe grupy, dużo mówienia i jeden prosty eDziennik dla społeczności KLA.",
    images: [{ url: "/og.png", width: 1729, height: 910 }],
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "King’s Language Academy",
    description: "Nauka, która dodaje odwagi.",
    images: ["/og.png"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body>
        <SiteContentProvider>
          {children}
          <PageVisitTracker />
          <ThemeToggle />
          <FeedbackWidget />
        </SiteContentProvider>
      </body>
    </html>
  );
}
