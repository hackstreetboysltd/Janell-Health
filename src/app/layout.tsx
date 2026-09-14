import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Janell Health — Trusted care. Right at home.",
  description:
    "Verified home nursing and caregiving in Nairobi. Request a visit, pay after acceptance, review your professional.",
  icons: {
    icon: [
      { url: "/brand/janell-health-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/janell-health-icon.png", sizes: "794x794", type: "image/png" },
    ],
    apple: "/brand/janell-health-icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2F5D4A" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1210" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  return (
    <html lang="en" className="min-h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
