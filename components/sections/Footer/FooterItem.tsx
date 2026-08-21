"use client";

import { useRef, useState } from "react";
import styles from "./Footer.module.css";
import type { FooterItemDef } from "./items";

interface FooterItemProps {
  item: FooterItemDef;
  zIndex: number;
  onActivate: () => void;
}

/** Plain pointer dragging, no physics — position stays at the item's
 * authored percentage coordinates; dragging only ever adds a translate
 * offset on top of that (never touches left/top), so the pile holds its
 * loose-triangle arrangement across viewport widths. */
export default function FooterItem({ item, zIndex, onActivate }: FooterItemProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLImageElement>) {
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

  function handlePointerMove(e: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLImageElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  return (
    <img
      src={item.src}
      alt={item.alt}
      draggable={false}
      className={styles.item}
      style={{
        left: `${item.left}%`,
        top: `${item.top}%`,
        width: item.width,
        zIndex,
        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${item.rotate}deg)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    />
  );
}
