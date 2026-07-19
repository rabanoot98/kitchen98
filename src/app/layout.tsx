import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "כשרות מטבח 98",
  description: "ניהול מלאי מחסן ומעקב ברירת קטניות",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "מטבח 98", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d6f5c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
