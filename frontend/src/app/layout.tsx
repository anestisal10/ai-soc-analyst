import type { Metadata } from "next";
import { Syne, DM_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Fix #28: Updated description to reflect actual stack (Groq/Kimi K2, not Claude)
export const metadata: Metadata = {
  title: "AI SOC Analyst — Cybersecurity Control Center",
  description: "AI-powered phishing analysis control center using dual-brain LLM agents (Gemini + Groq/Kimi K2) with OSINT enrichment and auto-remediation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${dmMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
