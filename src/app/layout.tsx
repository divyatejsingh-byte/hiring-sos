import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HiringProvider } from "@/components/HiringProvider";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Hiring SOS",
  description: "Screen a batch of resumes against your rubric, review ranked candidates, and reply in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <HiringProvider>
          <AppHeader />
          {children}
        </HiringProvider>
      </body>
    </html>
  );
}
