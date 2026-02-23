import type { Metadata } from "next";

import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Veloryn",
    template: "%s | Veloryn",
  },
  description: "Veloryn – AI Engineering Intelligence Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
