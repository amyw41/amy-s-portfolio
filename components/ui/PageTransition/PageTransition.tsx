"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FADE_IN_TRANSITION } from "@/lib/motion";
import { useCaseZoom } from "@/components/ui/CaseZoom";

// Wraps every route's content (rendered once, from the root layout, right
// alongside Taskbar) so navigating between pages always fades the
// destination's content in on mount instead of it just snapping into
// place — in particular, per request, clicking a case study's own Back
// button (which calls router.back(), see CaseStudyKit.tsx's
// TableOfContents) should land back on a page that fades in, the same way
// the case study itself faded in on the way there.
//
// key={pathname} is what makes this actually retrigger on navigation: React
// treats a keyed element as a brand-new instance whenever its key changes,
// so changing route remounts this motion.div and replays the fade; a
// re-render of the SAME route (e.g. a state update within a page) leaves
// the key untouched and does NOT retrigger it. This intentionally has no
// exit animation (no AnimatePresence) — Next's App Router doesn't hold the
// outgoing page around to animate it out without extra wiring, so this
// only ever animates the incoming page in, which is exactly what was
// asked for.
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Zooming into a case study, or back home from one: that has its own
  // motion, so no fade on top of it.
  const zoom = useCaseZoom();
  const ownMotion = !!zoom && (zoom.phase !== "idle" || zoom.returning);

  return (
    <motion.div
      key={pathname}
      initial={ownMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      // duration/ease matched to every other mount fade-in on the site
      // (Taskbar's own fade-in, and CaseStudyHero/TableOfContents in
      // CaseStudyKit.tsx) — was 0.35s, the one outlier at a different rate;
      // now all four fade-ins run at the same 0.45s easeOut, via the one
      // shared constant (lib/motion.ts) instead of 5 independent copies.
      transition={FADE_IN_TRANSITION}
    >
      {children}
    </motion.div>
  );
}
