import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";

export interface WhatsInsideItem {
  id: string;
  name: string;
  image: string;
  description: string;
}

/**
 * Display copy for the About page's carousel/gallery — the jar's own
 * physical "favourite" items (not the 3 "project" items already covered by
 * their own case-study cards elsewhere on the site). Ported from
 * amy-wangs-jar's lib/items.ts (its own WHATS_INSIDE_ITEMS), but that file
 * predates several roster changes this repo's own JAR_ITEMS manifest
 * (components/sections/Hero/items.manifest.ts) has already been through —
 * bingsu/handcream/hufflepuff/kitty-plush are gone (see items.manifest.ts's
 * own top comment: their PNGs were removed), and cam/bear-hirono/rabbit are
 * new arrivals with no old copy to port. `id`/`image` for every entry below
 * are taken directly from items.manifest.ts's own JAR_ITEMS (filtered to
 * category: "favourite") rather than retyped by hand, so this list can
 * never point at an image the jar itself doesn't actually have. Descriptions
 * for the 3 new arrivals are placeholders — TODO: replace with Amy's own
 * copy, the same way every other entry here has hers.
 */
const ITEM_COPY: Record<string, { name: string; description: string }> = {
  ballet: {
    name: "Ballet Shoes",
    description: "I've been dancing since I was 4. I'm currently relearning ballet pointe.",
  },
  "kitty-mirror": {
    name: "Hello Kitty Mirror",
    description: "The mirror I use to film content.",
  },
  laneige: {
    name: "Laneige Lip Balm",
    description: "I don't go anywhere without lip balm. This is matcha flavored.",
  },
  chips: {
    name: "Turtle Chips",
    description: "Fav snack ever.",
  },
  pineapple: {
    name: "Pineapple Soda",
    description: "Fav drink!!!",
  },
  bottle: {
    name: "Water Bottle",
    description: "Best investment ever, I drink like 10 bottles of water a day now.",
  },
  skullpanda: {
    name: "Skullpanda Charm",
    description: "I like MLP and Skullpandas. Dash is my fav.",
  },
  // TODO (placeholders — no copy existed for these 3 in the old
  // amy-wangs-jar reference; replace with Amy's own descriptions).
  cam: {
    name: "Digital Camera",
    description: "As obsessed with taking digi pics as the girl next door.",
  },
  "bear-hirono": {
    name: "Hirono Bear",
    description: "One of my favourite designer toys.",
  },
  rabbit: {
    name: "Rabbit Plush",
    description: "Another one of my favourite plushies.",
  },
};

export const WHATS_INSIDE_ITEMS: WhatsInsideItem[] = JAR_ITEMS.filter((item) => item.category === "favourite").map(
  (item) => {
    const copy = ITEM_COPY[item.id];
    return {
      id: item.id,
      name: copy?.name ?? item.id,
      image: item.src,
      description: copy?.description ?? "",
    };
  },
);
