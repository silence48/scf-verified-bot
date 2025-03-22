// app/layout.tsx
import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "@/app/globals.css";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import { Navbar } from "@/components/NavBar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

const schabo = localFont({
  src: [
    {
      path: "./fonts/SCHABO-Condensed.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-schabo",
  display: "swap",
});
export const metadata: Metadata = {
  title: "SCF Tiers Admin",
  description: "For Managing the Discord Server Roles and Such",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${schabo.variable}`}>
       <body className={cn("min-h-screen bg-gradient-to-b from-[#0c0e14] to-[#0f1218] text-white", inter.className)}>
        <Navbar />
        <main className="container mx-auto px-4">{children}</main>
      </body>
    </html>
  );
}
