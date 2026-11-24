import { notFound } from "next/navigation";
import { ETC_CATEGORIES } from "@/lib/etc";
import CategoryDetail from "@/components/sections/Playground/CategoryDetail";
import UnderConstruction from "@/components/ui/UnderConstruction";
import { UNDER_CONSTRUCTION } from "@/lib/underConstruction";

// Prerenders one static page per playground category — same
// generateStaticParams pattern as app/[slug]/page.tsx.
export function generateStaticParams() {
  return ETC_CATEGORIES.map((category) => ({ category: category.slug }));
}

export default async function PlaygroundCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = ETC_CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();
  // Not finished yet (lib/underConstruction.ts): the barricade instead.
  if (UNDER_CONSTRUCTION.play) return <UnderConstruction />;

  return <CategoryDetail category={category} />;
}
