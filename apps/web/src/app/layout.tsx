import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lynkby - TikTok-Native Link-in-Bio Platform",
  description: "Ultra-fast landing pages that auto-sync your TikToks. Lowest-fee tip jar. Simple analytics. Built for TikTok creators.",
  keywords: ["TikTok", "link-in-bio", "landing page", "creator tools", "tip jar", "analytics", "social media"],
  authors: [{ name: "Lynkby Team" }],
  openGraph: {
    title: "Lynkby - TikTok-Native Link-in-Bio Platform",
    description: "Ultra-fast landing pages that auto-sync your TikToks. Lowest-fee tip jar. Simple analytics.",
    type: "website",
    url: "https://lynkby.com",
    siteName: "Lynkby",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lynkby - TikTok-Native Link-in-Bio Platform",
    description: "Ultra-fast landing pages that auto-sync your TikToks. Lowest-fee tip jar. Simple analytics.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
