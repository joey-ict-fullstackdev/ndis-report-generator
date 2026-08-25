import "./globals.css";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: "NDIS Progress Report Generator",
  description:
    "Draft NDIS progress reports from session notes, with every claim traced to its source.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
