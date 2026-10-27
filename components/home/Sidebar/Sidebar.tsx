"use client";

import { useState } from "react";
import styles from "./Sidebar.module.css";
import Identity from "./Identity";
import NavSection, { type NavItem } from "./NavSection";
import { content } from "@/lib/content";
import { PROJECTS } from "@/lib/projects";

const copy = content.en.sidebar;
const links = content.en.footer.links;

type SectionId = "work" | "other" | "contact";

// Built from PROJECTS so a new project shows up in the menu automatically.
// Extras isn't a Project (no category), so it's appended by hand, same as
// the case-study route's own generateStaticParams does.
const WORK_ITEMS: NavItem[] = [
  ...PROJECTS.map((p) => ({ label: p.title, href: `/${p.slug}` })),
  { label: copy.extras, href: "/extras" },
];

const OTHER_ITEMS: NavItem[] = [
  { label: copy.other.about, href: "/about" },
  { label: copy.other.playground, href: "/playground" },
];

const CONTACT_ITEMS: NavItem[] = [
  { label: links.email.label, href: links.email.href },
  { label: links.linkedin.label, href: links.linkedin.href, external: true },
  { label: links.twitter.label, href: links.twitter.href, external: true },
];

export default function Sidebar() {
  // One shared id instead of a boolean per section: opening one closes the
  // others for free.
  const [openId, setOpenId] = useState<SectionId | null>(null);

  function handleOpenChange(id: SectionId) {
    return (open: boolean) => setOpenId((current) => (open ? id : current === id ? null : current));
  }

  return (
    <aside className={styles.sidebar}>
      <Identity />
      <nav className={styles.menus}>
        <NavSection
          label={copy.menus.work}
          items={WORK_ITEMS}
          open={openId === "work"}
          onOpenChange={handleOpenChange("work")}
          openOnHover
        />
        <NavSection
          label={copy.menus.other}
          items={OTHER_ITEMS}
          open={openId === "other"}
          onOpenChange={handleOpenChange("other")}
        />
        <NavSection
          label={copy.menus.contact}
          items={CONTACT_ITEMS}
          open={openId === "contact"}
          onOpenChange={handleOpenChange("contact")}
        />
      </nav>
    </aside>
  );
}
