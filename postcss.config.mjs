// Only activates for CSS files that actually opt in via `@import
// "tailwindcss/..."` (currently just app/projects/[slug]/case-study.css) —
// this plugin doesn't rewrite or inject anything into files that never
// reference Tailwind, so the rest of the site's CSS Modules + lib/tokens.css
// pass through untouched. See case-study.css's own top comment for how
// leakage into the rest of the site (Tailwind's global preflight reset, in
// particular) is avoided even within the one file that does opt in.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
