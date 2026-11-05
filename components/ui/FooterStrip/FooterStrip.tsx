import styles from "./FooterStrip.module.css";
import { content } from "@/lib/content";

const copy = content.en.footer;
const LINKS = [copy.links.linkedin, copy.links.email, copy.links.twitter];

/**
 * The rebrand's footer: a thin black strip — "designed + built by amy
 * (2026)" on the left, the social links on the right. Ends the home page's
 * work view and every case study. `className` places it (margins, reach).
 */
export default function FooterStrip({ className = "" }: { className?: string }) {
  return (
    <footer className={`${styles.strip} ${className}`}>
      <span className={styles.credit}>{copy.credit}</span>
      <nav className={styles.links} aria-label={content.en.sidebar.social.label}>
        {LINKS.map((link, i) => (
          <span key={link.href}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <a
              className={styles.link}
              href={link.href}
              {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {link.label}
            </a>
          </span>
        ))}
      </nav>
    </footer>
  );
}
