import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPreview } from "@/lib/previews";
import SiteTemplate from "@/templates";
import PreviewActionBar from "@/templates/shared/PreviewActionBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preview = await getPreview(id);
  if (!preview) notFound();

  return (
    <main>
      <PreviewActionBar previewId={id} />
      <SiteTemplate site={preview.site} />
    </main>
  );
}
