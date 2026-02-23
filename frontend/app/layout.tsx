import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
