import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The jar, border/frame, and plate illustrations are hand-drawn
    // line-art traced from PNG to SVG (see public/images/drawings/*.svg)
    // so they render crisply at any zoom/display size instead of
    // pixelating as raster images do once you exceed their native
    // resolution. next/image blocks SVG by default (a data-exfiltration
    // risk for untrusted/user-uploaded SVGs); these are all local,
    // repo-committed, static assets we control, so it's safe to allow.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
