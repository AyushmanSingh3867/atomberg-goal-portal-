import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Goal Setting Portal | Atomberg",
  description: "Align thrust areas, track performance benchmarks, and govern corporate achievements for the FY2026-27 cycle.",
};

import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-slate-100 flex min-h-screen`}
      >
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 w-full overflow-x-hidden relative radial-bg bg-dot-pattern min-h-screen">
            {children}
          </main>
        </AuthProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#1e1e2f',
              color: '#fff',
              border: '1px solid rgba(99,102,241,0.3)',
            }
          }} 
        />
      </body>
    </html>
  );
}
