import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Federated Outreach CRM",
  description: "Mini CRM for B2B outreach and FL prioritization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
