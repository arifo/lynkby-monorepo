import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lynkby — Link‑in‑bio, Short Links & Analytics",
  description:
    "All‑in‑one link management: build link‑in‑bio pages, create branded short links, generate QR codes, and track analytics — built for creators, marketers, and teams.",
  keywords: [
    "lynkby",
    "link in bio",
    "short links",
    "qr codes",
    "analytics",
    "link management",
    "bio page",
    "utm tracking",
  ],
  authors: [{ name: "Lynkby Team" }],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
