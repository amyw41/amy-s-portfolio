import Link from "next/link";
import styles from "./StarLogo.module.css";

/** The star's file (Amy's hand-drawn mark), 231 × 249. */
const SRC = "/images/logos/black-star.png";
const ASPECT = 231 / 249;

/**
 * Amy's star, the site's logo: a link home, at the top of home's sidebar and
 * as the case studies' way back. No hover effect. `size` is its height in
 * px.
 */
export default function StarLogo({ size = 32, className = "", label = "Amy Wang, home" }: { size?: number; className?: string; label?: string }) {
  return (
    <Link
      href="/"
      className={`${styles.star} ${className}`}
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC} alt="" width={Math.round(size * ASPECT)} height={size} draggable={false} />
    </Link>
  );
}
