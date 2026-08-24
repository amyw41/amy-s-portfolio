"use client";

import { useRef, useState, type CSSProperties } from "react";
import styles from "./Footer.module.css";
import type { FooterItemDef } from "./items";

interface FooterItemProps {
  item: FooterItemDef;
  zIndex: number;
  onActivate: () => void;
}

/** Reference viewport width items.ts's own px numbers were authored/sized
 * against — at this width every item renders at exactly its authored size;
 * narrower or wider, every one of an item's six numbers (clipW/clipH/imgW/
 * imgH/imgLeft/imgTop) scales by the SAME fraction, so proportions between
 * the crop box and the full image behind it — the whole point of matching
 * the jar's own geometry — never drift apart from each other. */
const REFERENCE_VW = 1400;
/** How far each value is allowed to shrink/grow from its authored size —
 * matches the ~0.55–1.15x band the rest of this app's own per-item
 * clamp()s already use elsewhere (e.g. Hero.module.css's --hero-load-ms
 * siblings), rather than inventing a new ratio for this file alone. */
const MIN_FRACTION = 0.55;
const MAX_FRACTION = 1.15;

/** clamp(px, vw, px) for one of an item's own authored numbers — vw-based
 * so the whole pile scales together as the viewport does, exactly like the
 * jar's own single container-width-derived `s` scales every item together,
 * just expressed per-field instead of via one shared custom property (CSS
 * clamp() requires its min/max share the same type as its middle value;
 * mixing a raw unitless multiplier with px/vw lengths across a var()
 * boundary risks silently invalid CSS, so each field gets its own clamp
 * instead). Handles negative bases (imgLeft/imgTop) by sorting the two
 * bounds rather than assuming min-fraction gives the smaller value — for a
 * negative base, scaling by the *larger* fraction actually produces the
 * more negative (smaller) number. */
function scaled(base: number): string {
  // 1.2 (the other session's own bump) * 0.8 (shrink everything, per
  // request) = 0.96 — one shared multiplier so every item's clipW/clipH/
  // imgW/imgH/imgLeft/imgTop scales down together in lockstep, same as the
  // 1.2 bump it's layered on top of.
  base = base * 1.2 * 0.8;
  const a = base * MIN_FRACTION;
  const b = base * MAX_FRACTION;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const vw = (base / REFERENCE_VW) * 100;
  return `clamp(${min}px, ${vw}vw, ${max}px)`;
}

/**
 * Plain pointer dragging, no physics — position stays at the item's
 * authored percentage coordinates; dragging only ever adds a translate
 * offset on top of that (never touches left/top), so the pile holds its
 * arrangement across viewport widths.
 *
 * Sizing/crop is the same two-layer technique as the jar's own JarItem.tsx
 * (an outer clip box sized to the item's alpha bbox, overflow:hidden, with
 * the full source image behind it offset by imgLeft/imgTop) minus
 * everything JarItem also does that this brief explicitly doesn't need
 * here: no outline ring, no dim overlay, no border/highlight on click —
 * just the crop, so the item reads the same size here as it does in the
 * jar. Every item's own clipW/clipH/imgW/imgH/imgLeft/imgTop already bakes
 * in items.ts's own ITEM_SCALE; --s (set once, up on .panel) is the one
 * remaining shared multiplier every item reads its own numbers through, so
 * the whole pile scales down together on a narrow viewport exactly like
 * the jar's own single `s` scales every item together — never an
 * independent per-item clamp() the way this file used to do it.
 */
export default function FooterItem({ item, zIndex, onActivate }: FooterItemProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    onActivate();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  return (
    <div
      className={styles.item}
      aria-hidden="true"
      style={
        {
          left: `${item.left}%`,
          top: `${item.top}%`,
          width: scaled(item.clipW),
          height: scaled(item.clipH),
          zIndex,
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${item.rotate}deg)`,
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <img
        src={item.src}
        alt=""
        loading="lazy"
        draggable={false}
        className={styles.image}
        style={
          {
            width: scaled(item.imgW),
            height: scaled(item.imgH),
            left: scaled(item.imgLeft),
            top: scaled(item.imgTop),
          } as CSSProperties
        }
      />
    </div>
  );
}
