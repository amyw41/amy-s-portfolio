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
   * Position + size within the plate view's poster canvas, hand-tuned as a
   * % of the canvas for position and literal px for size — see
   * components/sections/Playground/posterLayout.ts for how these resolve to
   * real pixels. Every photo has one now, nails included — nails' own were
   * originally left out (an early reference screenshot showed nails' plate
   * bare), but Amy asked for them scattered around the plate too, matching
   * drawing/dancing.
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
 *
 * drawing/nails' plateXPct was originally 14.1, and dancing's mirror was
 * 85.9 — both shifted by 4.69 (drawing/nails +4.69, dancing -4.69, keeping
 * the same mirrored pair) so each plate's own left/right edge lands flush
 * with the poster canvas edge instead of bleeding off it. The old 14.1
 * put drawing's plate (PLATE_SIZE 480, so a 240px half-width) centered at
 * just 14.1% of DESIGN_WIDTH (1277px) ≈ 180px — 60px less than its own
 * half-width, so its left edge sat at roughly -60px, off the canvas
 * entirely, well past where every other section's content (including this
 * page's own heading) starts. 18.79% centers it at (18.79/100)*1277 ≈
 * 240px, exactly flush with the canvas's left edge. drawing's own photos
 * (authored as absolute canvas positions, not relative to the plate) got
 * the same +4.69 shift so the whole plate+photo cluster moves as one rigid
 * unit and their relative arrangement to each other and to the plate is
 * unchanged — same rigid-unit treatment dancing's own mirror already used,
 * just a smaller nudge instead of a full 100-x flip. Dancing's photos got
 * -4.69 to match its own -4.69 plate shift for the same reason. Nails had
 * no photos to shift at the time (added afterward — see EtcPhoto's own
 * comment), so its own plate scatter below is already authored flush
 * against the +4.69-shifted plateXPct directly, nothing to re-shift.
 */
export const ETC_CATEGORIES: EtcCategory[] = [
  {
    slug: "drawing",
    label: "drawing",
    plateImage: "/images/drawings/plate-drawing.png",
    plateXPct: 18.79,
    plateYPct: 9.7,
    photos: [
      {
        src: "/images/etc/drawing1.webp",
        caption: "Niu Zaizai • 2023",
        width: 808,
        height: 1076,
        plate: { xPct: 34.69, yPct: 10, width: 202, height: 269, z: 1 },
      },
      {
        src: "/images/etc/drawing2.webp",
        caption: "Jo Yuri (Squid Games) • 2025",
        width: 888,
        height: 896,
        plate: { xPct: 46.69, yPct: 14, width: 222, height: 224, z: 2 },
      },
      {
        src: "/images/etc/drawing3.webp",
        caption: "Cha Woongki (AHOF) • 2023",
        width: 812,
        height: 824,
        plate: { xPct: 49.69, yPct: 7, width: 233, height: 236, z: 3 },
      },
      {
        src: "/images/etc/drawing4.png",
        caption: "*WIP Chihen (AHOF) • 2026",
        width: 716,
        height: 892,
        plate: { xPct: 61.69, yPct: 11, width: 209, height: 253, z: 4 },
      },
    ],
  },
  {
    slug: "dancing",
    label: "dancing",
    plateImage: "/images/drawings/plate-dance.png",
    plateXPct: 81.21,
    plateYPct: 36.8,
    photos: [
      {
        src: "/images/etc/dance1.webp",
        caption: "My last recital! (2025)",
        width: 1192,
        height: 892,
        plate: { xPct: 43.5, yPct: 33, width: 268, height: 193, z: 3 },
      },
      {
        src: "/images/etc/dance3.webp",
        caption: "Chaoxian (朝鲜) ethnic group dance (2025)",
        width: 756,
        height: 1136,
        plate: { xPct: 59, yPct: 37, width: 200, height: 270, z: 4 },
      },
      {
        src: "/images/etc/dance4.webp",
        caption: "Waiting for the wind (2026)",
        width: 1160,
        height: 772,
        plate: { xPct: 24, yPct: 30, width: 270, height: 180, z: 6 },
      },
      {
        src: "/images/etc/dance5.webp",
        caption: "Waiting for the wind (2026)",
        width: 992,
        height: 660,
        plate: { xPct: 42, yPct: 39.5, width: 260, height: 175, z: 5 },
      },
      {
        src: "/images/etc/dance6.webp",
        caption: "The Mountain Spirit (2025)",
        width: 704,
        height: 936,
        plate: { xPct: 9.92, yPct: 34, width: 186, height: 244, z: 10 },
      },
      {
        src: "/images/etc/dance7.webp",
        caption: "Waiting for the wind (2026)",
        width: 872,
        height: 580,
        plate: { xPct: 23.5, yPct: 36.5, width: 280, height: 190, z: 2 },
      },
    ],
  },
  {
    slug: "nails",
    label: "nails",
    plateImage: "/images/drawings/plate-nails.png",
    plateXPct: 18.79,
    plateYPct: 63.9,
    // Scattered to the right of the plate, same spirit as drawing's own
    // cluster (same plateXPct, so the same "flush against the canvas's own
    // left edge, photos fanning out rightward" shape) — sized down a bit
    // from drawing's own photos since there are 5 of these instead of 4.
    photos: [
      {
        src: "/images/etc/nails1.jpg",
        caption: "2026",
        width: 2160,
        height: 2373,
        plate: { xPct: 38, yPct: 65, width: 210, height: 231, z: 3 },
      },
      {
        src: "/images/etc/nails2.jpg",
        caption: "2026",
        width: 2160,
        height: 2880,
        plate: { xPct: 50, yPct: 58, width: 210, height: 273, z: 2 },
      },
      {
        src: "/images/etc/nails3.jpg",
        caption: "April 2026",
        width: 2160,
        height: 2880,
        plate: { xPct: 66.5, yPct: 60, width: 220, height: 293, z: 5 },
      },
      {
        src: "/images/etc/nails4.jpg",
        caption: "2026",
        width: 2160,
        height: 2880,
        plate: { xPct: 54, yPct: 67.5, width: 205, height: 263, z: 0 },
      },
      {
        src: "/images/etc/nails5.jpg",
        caption: "Shimmery mauve coffin nails with a chrome accent.",
        width: 2160,
        height: 2880,
        plate: { xPct: 82, yPct: 62, width: 200, height: 267, z: 4 },
      },
    ],
  },
];

/** Every photo across every category, in authoring order — what the collage
 * view tiles (it doesn't care about categories or plate positions at all). */
export const ETC_PHOTOS: EtcPhoto[] = ETC_CATEGORIES.flatMap((cat) => cat.photos);
