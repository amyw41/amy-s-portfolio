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
        linkedin: { label: "LinkedIn", href: "https://linkedin.com/in/amyw41" },
        gmail: { label: "Email", href: "mailto:amy.wang1@uwaterloo.ca" },
        twitter: { label: "Twitter", href: "https://twitter.com/apriberri" },
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
    projects: {
      heading: "what's inside?",
      filters: {
        work: "Work",
        personal: "Personal Project",
        hackathon: "Hackathon",
      },
      extras: {
        title: "extras",
        description: "A few more things worth a look.",
        modalTitle: "Extras",
        galleryPlaceholder: "Gallery — coming soon.",
        closeLabel: "Close",
      },
    },
    footer: {
      links: {
        linkedin: { label: "Linkedin", href: "https://linkedin.com/in/amyw41" },
        email: { label: "Email", href: "mailto:amy.wang1@uwaterloo.ca" },
        twitter: { label: "X / Twitter", href: "https://twitter.com/apriberri" },
      },
      heading: "thank you for dropping by !",
      credit: "Designed + built by Amy (2026)",
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
