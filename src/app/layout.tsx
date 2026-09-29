import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { HiringProvider } from "@/components/HiringProvider";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Runs before first paint so there's no light/dark flash: saved choice first, then the OS setting.
const themeScript = `(function(){try{var t=localStorage.getItem("hsos-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export const metadata: Metadata = {
  title: "Hiring SOS",
  description: "Screen a batch of resumes against your rubric, review ranked candidates, and reply in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">
        <HiringProvider>
          <AppHeader />
          {children}
        </HiringProvider>
      </body>
    </html>
  );
}
