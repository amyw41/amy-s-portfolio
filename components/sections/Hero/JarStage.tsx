"use client";

import { useRef } from "react";
import styles from "./JarStage.module.css";
import JarItem from "./JarItem";
import { useJarPhysics } from "./useJarPhysics";
import type { JarItemDef } from "./items.manifest";

interface JarStageProps {
  items: JarItemDef[];
}

export default function JarStage({ items }: JarStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, renderInfo, registerItemEl, debugWalls, debugPhysicsEnabled } = useJarPhysics(containerRef, items);

  return (
    <div ref={containerRef} className={styles.stage}>
      <img
        src="/images/drawings/jar.png"
        alt=""
        className={styles.jarImage}
        draggable={false}
        width={1600}
        height={2257}
      />

      {ready && (
        <div className={styles.itemLayer}>
          {items.map((item) => {
            const info = renderInfo[item.id];
            if (!info) return null;
            return (
              <JarItem
                key={item.id}
                item={item}
                ref={registerItemEl(item.id)}
                width={info.divW}
                height={info.divH}
                imgWidth={info.imgW}
                imgHeight={info.imgH}
                imgLeft={info.imgLeft}
                imgTop={info.imgTop}
              />
            );
          })}
        </div>
      )}

      {debugPhysicsEnabled && (
        <div className={styles.debugLayer} aria-hidden="true">
          {debugWalls.map((wall, i) => (
            <div
              key={i}
              className={styles.debugWall}
              style={{
                width: wall.width,
                height: wall.height,
                transform: `translate3d(${wall.x - wall.width / 2}px, ${wall.y - wall.height / 2}px, 0) rotate(${wall.angle}rad)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
