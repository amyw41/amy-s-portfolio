/**
 * All user-facing copy lives here, nested per-locale so a `zh` key can be
 * added later without touching any component. Components read
 * `content.en.<section>.<key>` (or take the active locale as a prop once
 * the language toggle is wired up).
 */
export const content = {
  en: {
    hero: {
      title: "amy wang's jar",
      tagline: "I design systems that make sense.",
      lang: {
        en: "EN",
        zh: "中文",
      },
      social: {
        linkedin: { label: "LinkedIn", href: "https://linkedin.com/in/amy-wang" },
        gmail: { label: "Email", href: "mailto:hello@amywang.dev" },
        twitter: { label: "Twitter", href: "https://twitter.com/amywang" },
      },
      nav: {
        work: "my work",
        about: "about me",
        playground: "playground",
      },
      toggles: {
        projects: "Projects",
        favourites: "Favourites",
      },
    },
    about: {
      placeholder: "About — coming soon.",
    },
    playground: {
      placeholder: "Playground — coming soon.",
    },
  },
} as const;

export type Locale = keyof typeof content;
