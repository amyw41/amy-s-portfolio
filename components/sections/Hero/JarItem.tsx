"use client";

import { forwardRef, type CSSProperties } from "react";
import styles from "./JarItem.module.css";
import { CATEGORY_COLOR } from "./jar-visual-state";
import type { JarItemDef } from "./items.manifest";

interface JarItemProps {
  item: JarItemDef;
  /** The div's size — the item's alpha bbox at display scale. This is
   * the visible/collision footprint; the body is centred on it. */
  width: number;
  height: number;
  /** The full (padded) source image's size at the same display scale. */
  imgWidth: number;
  imgHeight: number;
  /** Positions the full image inside the div so the alpha bbox — not the
   * file's own centre — lines up with the div's bounds. */
  imgLeft: number;
  imgTop: number;
  /** Geometry for the 'blob' border ring — see useJarPhysics's RenderInfo
   * and lib/outline.ts. Unused for 'box' items. */
  ringLeft: number;
  ringTop: number;
  ringWidth: number;
  ringHeight: number;
  /** Pre-generated ring mask data URL for 'blob' items (null if this item
   * is a 'box', or if generation failed — see lib/outline.ts). */
  outlineMask: string | null;
  /** All visual state (dim / border) comes from the two toggles upstream
   * (see jar-visual-state.ts) — never from clicking this item itself.
   * Clicking only ever changes position/layer order (see useJarPhysics's
   * bringToFront), which this component has no say in. */
  dimmed: boolean;
  bordered: boolean;
}

const JarItem = forwardRef<HTMLDivElement, JarItemProps>(function JarItem(
  {
    item,
    width,
    height,
    imgWidth,
    imgHeight,
    imgLeft,
    imgTop,
    ringLeft,
    ringTop,
    ringWidth,
    ringHeight,
    outlineMask,
    dimmed,
    bordered,
  },
  ref,
) {
  const isBox = item.shape === "box";
  // Computed per-render from this item's own live width/height again, NOT
  // the static var(--jar-item-radius) token (lib/tokens.css) — that fixed
  // value (12px) doesn't track the container's own scale factor the way
  // every other size in this feature does, which is exactly the "why are
  // the project thumbnails so rounded" bug from earlier this session (a
  // flat px reads far more rounded on a narrower viewport, where the card
  // itself has shrunk but the radius hasn't). The "drifts between cards"
  // concern that motivated the static token doesn't actually apply to the
  // 3 project PNGs here — measured directly against the files, cybersea/
  // skinsprout/spotify share the same aspect ratio (~1.354:1) and the same
  // sizeScale, so a per-item computed value already renders pixel-identical
  // across all 3 in practice.
  //
  // 0.019, not the original 0.06: the project PNGs already have their own
  // rounded corners baked in — measured directly against the files, ~32–35px
  // against a ~1536–1548px shorter edge, i.e. ~2.2%. They're fully opaque
  // everywhere except that corner curve (no transparent padding to trim —
  // see alpha-bbox.ts, the bbox is the full file), so this div's own clip
  // stacks on top of that existing curve rather than starting from a square
  // corner. At 6% (or the token's flat 12px, which computes to well past
  // 6% on most viewport widths) the clip cuts noticeably past the image's
  // already-transparent corner, over-rounding it — which is what was
  // reading as inconsistent next to items like kitty-mirror that get no
  // radius here at all. Started at the image's own measured ~2.2%, but that
  // still read as visibly looser than the card's real corner once seen live
  // (the .clip radius vs. the border's — see the outer .item div's own
  // borderRadius below — should trace the same curve, but a card's actual
  // rendered corner is a hard edge with real content up to it, not a
  // perfect circular arc, so the two don't necessarily agree at these small
  // sizes); nudged down by hand to 0.019 to tighten it.
  const borderRadius = isBox ? Math.min(width, height) * 0.019 : 0;
  const catColor = CATEGORY_COLOR[item.category];

  // 'box' items border via box-shadow (zero-cost, pixel-perfect against a
  // rectangle) — 'blob' items via the pre-generated ring behind the image
  // instead (see the .ring block below). Never an alpha-traced rectangle.
  // Always a real (same-structure) shadow value, spread animated 0 ->
  // var(--outline-thickness), rather than toggling to/from "none" —
  // browsers don't reliably tween a box-shadow list against "none", so that
  // would snap instead of the spec'd 250ms ease-out. var(--outline-
  // thickness) is the same single source of truth 'blob' items read (via
  // getOutlineThicknessPx in useJarPhysics.ts) to size their own ring.
  const boxBorderShadow = isBox ? `0 0 0 ${bordered ? "var(--outline-thickness)" : "0px"} ${catColor}` : undefined;
  // Only reached for a 'blob' item whose ring generation actually failed
  // (see lib/outline.ts's getOutlineMask) — stacked drop-shadows stand in
  // for the ring so a border still shows, just softer/rougher. Applied to
  // the outer (unclipped) wrapper, not the <img> itself, so the shadow
  // isn't cut off by .clip's own overflow:hidden below.
  const useDropShadowFallback = !isBox && bordered && !outlineMask;

  return (
    <div
      ref={ref}
      className={styles.item}
      style={{
        width,
        height,
        // A box-shadow follows its OWN element's border-radius, not a
        // descendant's — this outer .item div was missing borderRadius
        // entirely (only the inner .clip div below had it, for the actual
        // image clip), so the box-shadow border was drawing as a plain
        // square-cornered rectangle around a rounded card: a red/pink
        // outline with hard corners hugging a soft-cornered image. Same
        // value as .clip's, so the two actually trace the same curve.
        borderRadius: isBox ? borderRadius : undefined,
        boxShadow: boxBorderShadow,
        filter: useDropShadowFallback
          ? `drop-shadow(1.5px 0 0 ${catColor}) drop-shadow(-1.5px 0 0 ${catColor}) drop-shadow(0 1.5px 0 ${catColor}) drop-shadow(0 -1.5px 0 ${catColor})`
          : undefined,
      }}
    >
      {/* Ring sits outside .clip's overflow:hidden (it pads past the div's
       * own bounds by design — see ringLeft/Top/Width/Height) and earlier
       * in the DOM than .clip, so it paints behind the item's image. */}
      {!isBox && outlineMask && (
        <div
          className={`${styles.ring} ${bordered ? styles.ringActive : ""}`}
          style={
            {
              left: ringLeft,
              top: ringTop,
              width: ringWidth,
              height: ringHeight,
              "--cat-color": catColor,
              maskImage: `url(${outlineMask})`,
              WebkitMaskImage: `url(${outlineMask})`,
            } as CSSProperties
          }
        />
      )}

      {/* Clips the full (padded) source image down to the alpha bbox — see
       * the original comment this carried forward: e.g. cam.png's beaded
       * strap hangs outside its cropRegion and must never actually render. */}
      <div className={styles.clip} style={{ width, height, borderRadius }}>
        {/* Plain <img>, not next/image, on purpose: width/height/left/top
         * here are per-render floats out of computeRenderInfo's alpha-bbox
         * math (useJarPhysics.ts), not fixed intrinsic dimensions — next/
         * image's own optimizer/loader has no role to play on a size that's
         * entirely recomputed client-side every resize. */}
        <img
          src={item.src}
          alt=""
          aria-hidden="true"
          className={styles.image}
          draggable={false}
          style={{ width: imgWidth, height: imgHeight, left: imgLeft, top: imgTop }}
        />

        {/* Dimming construction: never a plain opacity drop on the item
         * itself — a white silhouette overlay, masked to the item's own
         * alpha (or sharing the box's own border-radius for 'box' items),
         * faded in/out at var(--dim-white). Animating only opacity here
         * keeps this compositor-only, so it costs nothing while physics
         * keeps writing this item's own transform every tick. */}
        <div
          className={`${styles.dimOverlay} ${dimmed ? styles.dimActive : ""}`}
          style={
            isBox
              ? { left: 0, top: 0, width, height, borderRadius }
              : {
                  left: imgLeft,
                  top: imgTop,
                  width: imgWidth,
                  height: imgHeight,
                  maskImage: `url(${item.src})`,
                  WebkitMaskImage: `url(${item.src})`,
                }
          }
        />
      </div>
    </div>
  );
});

export default JarItem;
