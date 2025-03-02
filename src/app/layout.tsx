// app/layout.tsx
import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

export const metadata: Metadata = {
  title: "SCF Tiers Admin",
  description: "For Managing the Discord Server Roles and Such",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ backgroundColor: "#121212" }}>
      <body style={{ backgroundColor: "#121212", color: "#ffffff", margin: 0 }}>
        <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%">
          {children}
        </Theme>
      </body>
    </html>
  );
}
