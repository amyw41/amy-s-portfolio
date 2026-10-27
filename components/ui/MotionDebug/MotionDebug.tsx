"use client";

import { useEffect } from "react";
import { getSlowFactor, storeIntroParam } from "@/lib/motion";

// Applies the ?slow / ?intro debug params (see lib/motion.ts) once, on
// mount. Rendered from the root layout so the params work on every route,
// not just home. Renders nothing.
//
// --slow on <html> is for CSS-driven animations: write durations as
// calc(300ms * var(--slow, 1)) and they follow ?slow too.
export default function MotionDebug() {
  useEffect(() => {
    document.documentElement.style.setProperty("--slow", String(getSlowFactor()));
    storeIntroParam();
  }, []);

  return null;
}
