import "./case-study.css";

// case-study.css (Tailwind entry, scoped to this route) is imported here so
// it only ever loads for /projects/*. No font loading of its own anymore —
// case-study.css's `--font-body` / `--font-instrument` theme values (read
// by CaseStudyKit's `font-body`/`font-instrument` Tailwind classes) now
// point straight at the site's own `--font-roboto` variable (set once, on
// <html>, by the root layout), so every case-study page renders in Roboto
// like the rest of the site instead of the two extra fonts
// (Instrument Serif, Public Sans) this was ported from jar-portfolio with.
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
