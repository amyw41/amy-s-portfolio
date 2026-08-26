/**
 * Photos for the Extras modal's own gallery (components/sections/Projects/
 * ExtrasModal.tsx) — same shape as lib/etc.ts's EtcPhoto (src/caption/
 * intrinsic width+height), reused so ExtrasModal can lay these out with the
 * exact same masonry algorithm Playground's own collage view uses (see
 * components/sections/Playground/justifiedLayout.ts) instead of a second,
 * parallel implementation.
 */

export interface ExtrasPhoto {
  src: string;
  caption: string;
  /** Intrinsic pixel size — drives the gallery's own natural-aspect-ratio
   * box, same as EtcPhoto's own width/height. */
  width: number;
  height: number;
}

export const EXTRAS_PHOTOS: ExtrasPhoto[] = [
  {
    src: "/images/projects/extras/After Hours.png",
    caption: "After Hours.",
    width: 2488,
    height: 3208,
  },
  {
    src: "/images/projects/extras/relish.png",
    caption: "Relish.",
    width: 3348,
    height: 2324,
  },
  {
    src: "/images/projects/extras/rust.png",
    caption: "Rust.",
    width: 2488,
    height: 3208,
  },
];
