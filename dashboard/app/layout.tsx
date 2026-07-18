import type { Metadata } from 'next'
import './globals.css'

const TAGLINE =
  "Operational database for AI agents. Open source — self-host free.";
const SITE_URL = process.env.DASHBOARD_URL || "http://localhost:3001";

export const metadata: Metadata = {
  title: {
    default: "ZizkaDB — Operational database for AI agents",
    template: "%s · ZizkaDB",
  },
  description: TAGLINE,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/zizka-logo.png", type: "image/png" },
    ],
    shortcut: "/icon-32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ZizkaDB — Operational database for AI agents",
    description: TAGLINE,
    url: SITE_URL,
    siteName: "ZizkaDB",
    type: "website",
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "ZizkaDB" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZizkaDB — Operational database for AI agents",
    description: TAGLINE,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
