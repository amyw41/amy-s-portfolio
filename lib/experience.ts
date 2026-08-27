// Work/community history shown on the About page, below the bio (see
// components/sections/About/Experience.tsx). Ported directly from
// jar-portfolio's lib/experience.ts — same shape, same data, this repo's
// own copy so About isn't reaching into the source repo at runtime.
export type ExperienceEntry = {
  company: string;
  title: string;
  // Pre-formatted display string (not a real Date) — matches how dates are
  // handled elsewhere on the site (e.g. PortfolioProject's own
  // "description" tagline), and every entry's own date range reads
  // differently enough (single month vs. a span) that a shared formatter
  // wouldn't save much.
  date: string;
  // Path under /public/images/logos.
  logo: string;
  // Optional — when set, the whole row becomes a link to the company's own
  // site (opens in a new tab) and shows a small hover/focus preview card
  // (see Experience.tsx's own CompanyPreview). Omitted entirely (not just
  // falsy) for an entry with no known site, same convention as Project's
  // own optional `video` field — ExperienceRow renders those as a plain
  // non-interactive row.
  url?: string;
};

export type ExperienceGroup = {
  label: string;
  entries: ExperienceEntry[];
};

export const EXPERIENCE: ExperienceGroup[] = [
  {
    label: "experience",
    entries: [
      {
        company: "RRC Companies",
        title: "APM Intern",
        date: "May - Aug 2026",
        logo: "/images/logos/rrc_companies_logo.jpg",
        url: "https://rrccompanies.com/",
      },
    ],
  },
  {
    label: "community",
    entries: [
      {
        company: "UW Blueprint",
        title: "Product Designer",
        date: "Sep 2026",
        logo: "/images/logos/uw_blueprint_logo.jpg",
        url: "https://uwblueprint.org/",
      },
      {
        company: "UW Cube",
        title: "Design Engineer",
        date: "May – Aug 2026",
        logo: "/images/logos/uwcube_logo.jpg",
      },
      {
        company: "Technova",
        title: "Product Designer",
        date: "May – Aug 2026",
        logo: "/images/logos/technova_logo.jpg",
        url: "https://itstechnova.org/",
      },
    ],
  },
];
