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
  // Project pages moved from /projects/[slug] to just /[slug] (per request,
  // "amyz.wang/name" instead of "amyz.wang/projects/name") — this permanent
  // redirect means any old /projects/* link (bookmarked, shared, indexed by
  // search engines) still lands on the right page instead of 404ing. Next
  // resolves redirects before matching filesystem routes, so this fires even
  // though app/projects/[slug]/ itself still physically exists on disk.
  async redirects() {
    return [
      {
        source: "/projects/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
