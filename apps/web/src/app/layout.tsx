import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AccountSync } from "@/components/account/AccountSync";
import { brand } from "@/config/brand";
import "./globals.css";

// Self-hosted variable fonts (latin subset, which covers Spanish), so builds
// don't depend on Google Fonts. Both are SIL Open Font License: see ./fonts.
const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${outfit.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <AccountSync />
      </body>
    </html>
  );
}
