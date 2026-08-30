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
    default: "eDziennik — bezpieczny system szkoły językowej",
    template: "%s | eDziennik",
  },
  description:
    "Mobilny system dla szkoły językowej: grafik, komunikacja, umowy, płatności, materiały, obecność i postępy.",
  icons: {
    icon: [{ url: "/product-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/product-mark.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "eDziennik — bezpieczny system szkoły językowej",
    description:
      "Mobilny system operacyjny szkoły językowej z kontrolą ról, audytem i bezpiecznym hostingiem.",
    images: [{ url: "/product-og.png", width: 1600, height: 900 }],
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "eDziennik",
    description: "Bezpieczny system operacyjny szkoły językowej.",
    images: ["/product-og.png"],
  },
  robots: { index: true, follow: true },
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
