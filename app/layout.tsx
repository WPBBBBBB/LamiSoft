import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PwaSwRegister } from "@/components/pwa-sw-register";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") || undefined

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <title>AL-LamiSoft - اللامي سوفت</title>
        <meta name="description" content="قم بإدارة مبيعاتك والمشتريات والمخازن الخاصة بك, كذلك التحكم بالبيانات وأمكانية جرد المخزن بشكل دوري . الأطلاع على أرباح المتجر وتقارير شاملة بكل شيء. جرب اللامي سوفت الأن" />
        <link rel="icon" href="/aave.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />

        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="application-name" content="AL-LamiSoft" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaSwRegister />
        <AppShell nonce={nonce}>{children}</AppShell>
      </body>
    </html>
  );
}
