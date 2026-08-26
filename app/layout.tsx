import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { content } from "@/lib/content";
import Taskbar from "@/components/ui/Taskbar/Taskbar";
import PageTransition from "@/components/ui/PageTransition/PageTransition";
import Footer from "@/components/sections/Footer";
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
    // suppressHydrationWarning on both tags — this hydration mismatch isn't
    // caused by anything in this app's own render output; it's browser
    // extensions (Grammarly, a "chrome-extension-installed" flag, etc.)
    // injecting their own attributes (data-gr-ext-installed, data-new-gr-c-s-
    // check-loaded, data-cap-chrome-extension-installed) straight onto
    // <html>/<body> before React hydrates, which React then reports as a
    // server/client mismatch even though nothing about the actual page is
    // wrong. suppressHydrationWarning only silences the warning for these
    // two elements' own attributes — it doesn't suppress mismatches
    // anywhere inside them, so a real hydration bug in the page content
    // would still surface normally.
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Rendered once here (not per-page) so every route except "/" gets
         * it automatically — see Taskbar.tsx's own comment for why this
         * can't just be a `usePathname` check inline in this (Server
         * Component) layout. */}
        <Taskbar />
        {/* Fades each route's content in on navigation — see
         * PageTransition.tsx's own comment. Outside Taskbar on purpose:
         * Taskbar has its own independent mount fade and shouldn't remount
         * (and re-fade) every time the route changes between two non-home
         * pages the way PageTransition's pathname-keyed content does. */}
        <PageTransition>
          {children}
          <Footer />
        </PageTransition>
      </body>
    </html>
  );
}
