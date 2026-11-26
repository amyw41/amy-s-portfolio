// The facts on an unfinished case study's page (app/[slug]/page.tsx: its
// header, then the under-construction sign; Amy's mock, 2026-11-26). Finished
// case studies keep their own (their META). CHECK (Amy): UW Flow's are guesses.
export const UNFINISHED_FACTS: Record<string, { label: string; values: string[] }[]> = {
  cybersea: [
    { label: "ROLE", values: ["Design Engineer"] },
    { label: "TIMELINE", values: ["Jan 2026 (36h)"] },
    { label: "TEAM", values: ["1 designer, 2 devs"] },
  ],
  spotify: [
    { label: "ROLE", values: ["Product Designer"] },
    { label: "TIMELINE", values: ["June 2026"] },
    { label: "TEAM", values: ["1 designer, 1 dev"] },
  ],
  skinsprout: [
    { label: "ROLE", values: ["Product Designer"] },
    { label: "TIMELINE", values: ["May 2026"] },
    { label: "TEAM", values: ["1 designer (solo)"] },
  ],
  uwflow: [
    { label: "ROLE", values: ["Designer"] },
    { label: "TIMELINE", values: ["2026"] },
    { label: "TEAM", values: ["UW Flow"] },
  ],
  blueprint: [
    { label: "ROLE", values: ["Product Designer"] },
    { label: "TIMELINE", values: ["Sep 2026 – now"] },
    { label: "TEAM", values: ["UW Blueprint"] },
  ],
};
