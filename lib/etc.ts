/**
 * Data for the "what's on my plate?" playground page (components/sections/
 * Playground). Ported from jar-portfolio's lib/etc.ts + app/etc/page.tsx's
 * own GALLERY array, merged into one list instead of jar-portfolio's two
 * separate ones (ETC_PHOTOS for captions/intrinsic size, GALLERY for plate-
 * view scatter position) — keeping a photo's caption and its plate position
 * in the same object means there's only one place to edit per photo, and no
 * chance of the two lists drifting out of sync with each other the way two
 * hand-maintained parallel arrays eventually can.
 *
 * "content"/"Me" is dropped entirely (no photos for it yet — matches
 * jar-portfolio's own GALLERY, which already excluded it there too).
 */

export type EtcCategorySlug = "drawing" | "dancing" | "nails";

export interface EtcPhoto {
  src: string;
  caption: string;
  /** Intrinsic pixel size — drives the collage view's own aspect-ratio box.
   * Not derived from `plate` below (their ratios don't always match
   * exactly — both are mockup-measured, by hand, independently). */
  width: number;
  height: number;
  /**
   * Position + size within the plate view's poster canvas, mockup-tuned (not
   * a formula) as a % of the canvas for position and literal px for size —
   * see components/sections/Playground/posterLayout.ts for how these
   * resolve to real pixels. Omitted for every nails photo: the reference
   * screenshot shows nails' plate bare, with no scattered photos around it
   * (unlike jar-portfolio's own overview page, which does scatter 4 nails
   * photos) — worth confirming with Amy whether that was ever meant to
   * change, since the photos themselves (and their captions below) already
   * exist and render fine in the collage view either way.
   */
  plate?: { xPct: number; yPct: number; width: number; height: number; z: number };
}

export interface EtcCategory {
  slug: EtcCategorySlug;
  label: string;
  plateImage: string;
  /** Plate's own position in the poster canvas — same %-of-canvas space as
   * each photo's `plate.xPct/yPct` above. */
  plateXPct: number;
  plateYPct: number;
  photos: EtcPhoto[];
}

/**
 * Row order top-to-bottom, alternating left/right: drawing (row 1, left),
 * dancing (row 2, right), nails (row 3, left) — matches the reference
 * screenshot. Dancing's plate + all 6 of its photos are mirrored
 * horizontally as one rigid unit from jar-portfolio's original left-side
 * numbers (newXPct = 100 - oldXPct) to sit on the right instead; only
 * positions moved, none of the photo files themselves are flipped.
 */
export const ETC_CATEGORIES: EtcCategory[] = [
  {
    slug: "drawing",
    label: "Drawing",
    plateImage: "/images/drawings/plate-drawing.png",
    plateXPct: 14.1,
    plateYPct: 9.7,
    photos: [
      {
        src: "/images/etc/drawing1.webp",
        caption: "Niu Zaizai - 2023.",
        width: 808,
        height: 1076,
        plate: { xPct: 30, yPct: 10, width: 202, height: 269, z: 1 },
      },
      {
        src: "/images/etc/drawing2.webp",
        caption: "Jo Yuri (Squid Games) - 2025.",
        width: 888,
        height: 896,
        plate: { xPct: 42, yPct: 14, width: 222, height: 224, z: 2 },
      },
      {
        src: "/images/etc/drawing3.webp",
        caption: "Cha Woongki (AHOF) - 2023.",
        width: 812,
        height: 824,
        plate: { xPct: 45, yPct: 7, width: 233, height: 236, z: 3 },
      },
      {
        src: "/images/etc/drawing4.png",
        caption: "Chihen (WIP, AHOF) - 2026.",
        width: 716,
        height: 892,
        plate: { xPct: 57, yPct: 11, width: 209, height: 253, z: 4 },
      },
    ],
  },
  {
    slug: "dancing",
    label: "Dancing",
    plateImage: "/images/drawings/plate-dance.png",
    plateXPct: 85.9,
    plateYPct: 36.8,
    photos: [
      {
        src: "/images/etc/dance1.webp",
        caption: "Curtain call after a group recital.",
        width: 1192,
        height: 892,
        plate: { xPct: 48, yPct: 34.6, width: 268, height: 193, z: 1 },
      },
      {
        src: "/images/etc/dance3.webp",
        caption: "Korean traditional hanbok dance.",
        width: 756,
        height: 1136,
        plate: { xPct: 63, yPct: 37, width: 200, height: 270, z: 3 },
      },
      {
        src: "/images/etc/dance4.webp",
        caption: "Fan dance in blue stage light.",
        width: 1160,
        height: 772,
        plate: { xPct: 32, yPct: 31, width: 270, height: 180, z: 4 },
      },
      {
        src: "/images/etc/dance5.webp",
        caption: "Extension into an arabesque.",
        width: 992,
        height: 660,
        plate: { xPct: 46, yPct: 40, width: 260, height: 172, z: 5 },
      },
      {
        src: "/images/etc/dance6.webp",
        caption: "Backstage at the Abstract Dance Challenge.",
        width: 704,
        height: 936,
        plate: { xPct: 14.61, yPct: 34, width: 186, height: 244, z: 10 },
      },
      {
        src: "/images/etc/dance7.webp",
        caption: "Fan in hand, between poses.",
        width: 872,
        height: 580,
        plate: { xPct: 28, yPct: 36.5, width: 280, height: 190, z: 3 },
      },
    ],
  },
  {
    slug: "nails",
    label: "Nails",
    plateImage: "/images/drawings/plate-nails.png",
    plateXPct: 14.1,
    plateYPct: 63.9,
    // No `plate` position on any of these — see EtcPhoto's own comment.
    photos: [
      {
        src: "/images/etc/nails1.jpg",
        caption: "Chrome foil accents on glazed nude nails.",
        width: 2160,
        height: 2373,
      },
      {
        src: "/images/etc/nails2.jpg",
        caption: "Negative space French with a crystal lattice accent.",
        width: 2160,
        height: 2880,
      },
      {
        src: "/images/etc/nails3.jpg",
        caption: "Leopard print with 3D star charms.",
        width: 2160,
        height: 2880,
      },
      {
        src: "/images/etc/nails4.jpg",
        caption: "Nude nails with bold number decals.",
        width: 2160,
        height: 2880,
      },
      {
        src: "/images/etc/nails5.jpg",
        caption: "Shimmery mauve coffin nails with a chrome accent.",
        width: 2160,
        height: 2880,
      },
    ],
  },
];

/** Every photo across every category, in authoring order — what the collage
 * view tiles (it doesn't care about categories or plate positions at all). */
export const ETC_PHOTOS: EtcPhoto[] = ETC_CATEGORIES.flatMap((cat) => cat.photos);
