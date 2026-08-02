import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "NDIS Progress Report Generator",
  description:
    "Draft NDIS progress reports from session notes, with every claim traced to its source.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
