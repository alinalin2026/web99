import { NextRequest, NextResponse } from "next/server";
import { isOperator } from "@/lib/auth";
import {
  createWeb99SalesCampaign,
  findCampaignByName,
  resolveMetaPixelId,
  uploadMetaAdImageFromUrl,
} from "@/lib/meta-sales";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PAGE_ID = "1326711580514431";
const CAMPAIGN_NAME = "Web99 | Ireland | Sales | Broad | €99 Website | 2026-08";

export async function POST(req: NextRequest) {
  if (!(await isOperator(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await findCampaignByName(CAMPAIGN_NAME);
  if (existing) {
    return NextResponse.json({ ok: true, alreadyExists: true, campaign: existing });
  }

  try {
    const pixelId = await resolveMetaPixelId(true);
    if (!pixelId) throw new Error("Could not resolve or create a Meta Pixel/Dataset.");

    const [purple, blue, laptop, banner] = await Promise.all([
      uploadMetaAdImageFromUrl("https://www.web99.ie/assets/img/ads/web99-purple-value.jpg"),
      uploadMetaAdImageFromUrl("https://www.web99.ie/assets/img/ads/web99-blue-package.jpg"),
      uploadMetaAdImageFromUrl("https://www.web99.ie/assets/img/ads/web99-laptop-mockup.png"),
      uploadMetaAdImageFromUrl("https://www.web99.ie/assets/img/ads/web99-banner.png"),
    ]);

    const result = await createWeb99SalesCampaign({
      name: CAMPAIGN_NAME,
      dailyBudgetEur: 100,
      pixelId,
      pageId: PAGE_ID,
      link: "https://www.web99.ie/",
      ads: [
        {
          name: "A1 | See It First | Purple Value",
          imageHash: purple.hash,
          primaryText:
            "Need a proper website for your business without the usual upfront cost? Web99 builds it first. See the finished site live, then pay €99 only if you want it. Domain and first-year hosting are included.",
          headline: "See Your Website Before You Pay",
          description: "Built for your business. €99 if you love it.",
        },
        {
          name: "A2 | €99 Package | Blue",
          imageHash: blue.hash,
          primaryText:
            "A business website for €99 — with first-year hosting and domain, business email, Facebook page setup and 3 months of content included. Tell Sarah what your business does and we’ll build the first draft.",
          headline: "The €99 Website Package",
          description: "Website, domain, hosting, email and more.",
        },
        {
          name: "A3 | Laptop Mockup | Irish Business",
          imageHash: laptop.hash,
          primaryText:
            "Run a small business in Ireland? Tell us what you do and what you want the website to achieve. We’ll build the first draft and send you the live link. No card up front.",
          headline: "Get Your Business Online for €99",
          description: "No card upfront. See it first.",
        },
        {
          name: "A4 | Banner | Ready in 24 Hours",
          imageHash: banner.hash,
          primaryText:
            "Your business could have a finished website to review within 24 hours. You pay nothing to see it. If you love it, it’s €99.",
          headline: "Your Website, Ready in 24 Hours",
          description: "See it live before you decide.",
        },
        {
          name: "A5 | See It First | Copy B",
          imageHash: laptop.hash,
          primaryText:
            "No DIY website builder. No upfront card. Tell Web99 about your business and we’ll build the site for you. See it first; pay €99 only if you want it.",
          headline: "We Build It. You Decide.",
          description: "A simpler way to get online.",
        },
      ],
    });

    return NextResponse.json({ ok: true, created: true, ...result });
  } catch (error) {
    const err = error as Error & { code?: number; subcode?: number };
    return NextResponse.json(
      { ok: false, error: err.message, code: err.code ?? null, subcode: err.subcode ?? null },
      { status: 502 }
    );
  }
}
