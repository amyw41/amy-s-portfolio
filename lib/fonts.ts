import { Gaegu, Geist } from "next/font/google";

// Rebrand v2 typeface — home page only for now (Home/index.tsx applies the
// class to its frame); every other route stays on the root layout's Roboto.
// Geist is a variable font, so no weight list is needed. Its letter-spacing
// lives with it in Home.module.css (--home-tracking).
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

// The "annotation hand": a thin, monoline, separate-letter handwriting for
// the home page's doodle labels only (Home/ScrollHint.tsx's "scroll down!")
// — like a café's hand-lettered menu board. Light weight only. Home only,
// like Geist (applied with it on Home's frame), so it's only preloaded there.
export const gaegu = Gaegu({
  weight: "300",
  subsets: ["latin"],
  variable: "--font-annotation",
  display: "swap",
});
