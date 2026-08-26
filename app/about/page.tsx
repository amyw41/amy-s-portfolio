import { content } from "@/lib/content";

export default function AboutPage() {
  return (
    <main className="pageContainer" style={{ paddingBlock: "var(--pad)" }}>
      <p style={{ fontSize: "var(--fs-tagline)", fontWeight: 300 }}>
        {content.en.about.placeholder}
      </p>
    </main>
  );
}
