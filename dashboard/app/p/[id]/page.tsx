import { notFound, redirect } from "next/navigation";
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

  // Donor-template preview (real pre-built design, see lib/donor-templates.ts)
  // -- its own SPA needs a real script tag executing, not a React embed, so
  // hand off to the [...path] route that serves it as a real document.
  if (preview.generated) redirect(`/p/${id}/index.html`);

  return (
    <main>
      <PreviewActionBar previewId={id} />
      <SiteTemplate site={preview.site} />
    </main>
  );
}
