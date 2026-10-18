import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: "MyKaraoke — Your songs. Your stage. Your party.",
    template: "%s | MyKaraoke",
  },
  description:
    "A fresh way to bring everyone into the karaoke party. Host on the big screen and let friends join from their phones.",
  applicationName: "MyKaraoke",
  icons: { icon: "/brand/microphone-logo.png" },
  openGraph: {
    title: "MyKaraoke",
    description: "Your songs. Your stage. Your party.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
