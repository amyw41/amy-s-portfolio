import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { content } from "@/lib/content";
import Taskbar from "@/components/ui/Taskbar/Taskbar";
import PageTransition from "@/components/ui/PageTransition/PageTransition";
import Footer from "@/components/sections/Footer";
import "./globals.css";

// weight: back to just 300/400 — briefly included "500" so About's
// heading elements could genuinely render lighter than a phantom 500 (see
// About.module.css's .heading comment for that whole story), but loading
// a real 500 face changed the browser's fallback match for EVERY other
// element on the site requesting a heavier weight it doesn't have too:
// e.g. Tailwind's font-medium/font-semibold/font-bold on the case-study
// pages (CaseStudyKit.tsx's meta labels included) used to fall back to
// the nearest available real face, which was 400 — with 500 now loaded,
// that same fallback search lands on 500 instead, silently making all of
// that text render heavier than it used to ("something happened to the
// weight of the headers"). Nothing in About actually needs a genuine 500
// anymore (.heading/.whatsInsideHeading are 300, .companyName is 400), so
// dropping it back to 300/400 undoes the site-wide side effect with no
// loss.
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
