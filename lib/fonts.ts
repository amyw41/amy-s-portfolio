import { Geist } from "next/font/google";

// Rebrand v2 typeface — home page only for now (Home/index.tsx applies the
// class to its frame); every other route stays on the root layout's Roboto.
// Geist is a variable font, so no weight list is needed. Its letter-spacing
// lives with it in Home.module.css (--home-tracking).
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
