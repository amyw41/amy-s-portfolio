"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

// Marker-style highlight: background-size sweeps 0% -> 100% behind the text
// over 1s whenever it's scrolled into view (threshold 0.6, i.e. 60% of the
// text visible), and toggles back out if it scrolls out of view again — no
// `once` lock, so it replays every time. Text color is applied statically
// (not animated in sync with the reveal).
//
// Wrap any span of text: <TextHighlight>exact phrase</TextHighlight>.
const DEFAULT_COLOR = "#F2EBF5";
const DEFAULT_TEXT_COLOR = "black";
const REVEAL_DURATION = 1; // seconds
const VIEWPORT_THRESHOLD = 0.6;

export default function TextHighlight({
  children,
  color = DEFAULT_COLOR,
  textColor = DEFAULT_TEXT_COLOR,
}: {
  children: ReactNode;
  color?: string;
  textColor?: string;
}) {
  return (
    <motion.span
      initial={{ backgroundSize: "0% 100%" }}
      whileInView={{ backgroundSize: "100% 100%" }}
      viewport={{ amount: VIEWPORT_THRESHOLD }}
      transition={{ duration: REVEAL_DURATION, ease: "easeInOut" }}
      style={{
        backgroundImage: `linear-gradient(120deg, ${color} 0%, ${color} 100%)`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 0",
        color: textColor,
        padding: "0.05em 0.15em",
      }}
    >
      {children}
    </motion.span>
  );
}
