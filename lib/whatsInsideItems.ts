import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";

export interface WhatsInsideItem {
  id: string;
  name: string;
  image: string;
}

// TODO (Amy): these names are my best guess from each PNG's own filename in
// public/images/items/ — flagged below wherever the filename doesn't spell
// out the exact product (e.g. "laneige" names the brand but not which
// product; "chips"/"pineapple" don't say the flavor/brand). Swap in the
// real names/flavors you'd actually use.
const NAMES: Record<string, string> = {
  ballet: "Ballet Shoes",
  bottle: "Water Bottle",
  chips: "Chips", // TODO: flavor/brand?
  "kitty-mirror": "Hello Kitty Mirror",
  laneige: "Laneige Lip Balm", // TODO: which Laneige product exactly?
  pineapple: "Pineapple Soda", // TODO: soda, or something else?
  skullpanda: "Skullpanda Charm", // TODO: keychain, blind-box figure, something else?
  cam: "Camera", // TODO: digital or film?
  "bear-hirono": "Hirono Bear",
  rabbit: "Rabbit Plush", // TODO: plush, or a figure?
};

/**
 * Display copy for the About page's carousel/gallery — the jar's own
 * physical "favourite" items, reusing components/sections/Hero/
 * items.manifest.ts's own JAR_ITEMS directly (the same data the homepage
 * Hero already renders falling/bouncing in the jar) rather than a separate
 * re-authored list, filtered to category:"favourite" — the 3 category:
 * "project" items (cybersea/skinsprout/spotify) already have their own
 * full case-study cards elsewhere on the site, so repeating them here as
 * jar knick-knacks would be redundant.
 */
export const WHATS_INSIDE_ITEMS: WhatsInsideItem[] = JAR_ITEMS.filter((item) => item.category === "favourite").map(
  (item) => ({
    id: item.id,
    name: NAMES[item.id] ?? item.id,
    image: item.src,
  }),
);
