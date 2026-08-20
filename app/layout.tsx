import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { content } from "@/lib/content";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: content.en.hero.title,
  description: content.en.hero.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
