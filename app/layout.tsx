import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Township Green Loop",
    template: "%s · Township Green Loop",
  },
  description:
    "Residents fund township solar, shop energy upgrades and EV charging — and earn back in ringgit, points and cleaner air.",
  applicationName: "Township Green Loop",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Green Loop",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#215D4A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      {/* Extensions such as Grammarly add attributes to <body> before React
          hydrates, which otherwise reports a mismatch in development. */}
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
