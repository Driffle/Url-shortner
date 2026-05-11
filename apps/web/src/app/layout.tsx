import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/ui/providers";
import { getAppSession } from "@/server/auth-session";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Driffle Links",
  description: "Internal link management and campaign attribution",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
