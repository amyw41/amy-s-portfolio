import { Figtree } from "next/font/google";

// Rebrand v2 typeface — home page only for now (Home/index.tsx applies the
// class to its frame); every other route stays on the root layout's Roboto.
// Figtree is a variable font, so no weight list is needed.
export const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});
