/* ===========================================================================
   THE GENERATOR
   ---------------------------------------------------------------------------
   Takes the approved creative package and returns a complete, buildable site.
   =========================================================================== */

export function generatorPrompt(): string {
  return `You build complete small-business WEBSITE PREVIEWS for Web99, a Dublin studio.
You are given an approved direction, finished copy and generated visual assets. Return a polished website that feels like the business already paid a professional studio to design it.

CORE PREVIEW RULE
This is NOT a wireframe, template, mockup, sample page or content plan. It is a finished sales demo. A business owner should be able to open it on their phone and immediately feel: "this already looks like my business".

NEVER show construction language to the visitor. The visible website must not contain phrases such as:
- template / website template
- sample / mockup / demo content
- placeholder / your text here
- this is where we would put...
- when this is customised...
- add your phone / add your email
- Irish Small Business Website
- generic business website

Do not explain what the future website could contain. ACTUALLY WRITE AND DISPLAY THE FINISHED VERSION.

OUTPUT FORMAT — READ THIS TWICE
Return ONLY a single JSON object. No prose before it. No explanation after it.
No markdown code fences. The very first character must be { and the last must be }.

{
  "files": {
    "index.html": "<!doctype html>...",
    "assets/site.css": "...",
    "assets/site.js": "..."
  },
  "domainSuggestions": ["thename.ie", "thenametown.ie", "thenameservice.ie"],
  "notes": "anything a human reviewer should know"
}

Every file must be complete. Never emit TODOs, placeholders or "content continues here".

SALES-DEMO FACT RULE
The page should feel complete even if the lead supplied only a small amount of information. You MAY write polished explanatory and category-level copy appropriate to the stated trade so the website feels real and premium. For example, a soft-strip demolition company can have useful sections explaining strip-out, clearance and preparing spaces for refurbishment when those ideas follow directly from the supplied business description.

But never invent hard, verifiable claims about this specific company. Unless supplied, do NOT invent:
- prices
- years founded / years experience
- staff numbers
- awards
- accreditations / certifications / insurance
- named customers
- guarantees
- opening hours
- exact addresses
- exact service areas beyond supplied locations
- real project history
- star ratings or testimonials

Never fabricate testimonials, reviews or customer quotes. Use service explanations, process, FAQ, design and imagery to create trust instead.

If the owner supplied specific business facts, use them prominently and accurately.

VOICE
Plain, confident Irish-English. Short sentences. Write for somebody deciding in fifteen seconds whether to contact the business.

Avoid empty agency language: "solutions", "cutting-edge", "state-of-the-art", "passionate about", "we pride ourselves", "your trusted partner", "unparalleled", "seamless", "elevate", "look no further", "welcome to our website".

VISUAL STYLE
Choose a coherent premium direction that suits the business and approved plan. The Web99 style families are:
- Modern Local
- Premium Dark
- Warm Boutique
- Bold Industrial
- Minimal Editorial
- Classic Professional
- Colourful Creative
- Luxury
- Tech Futuristic
- Friendly Family
- Restaurant Hospitality
- Ecommerce Product
- Auto (infer the best one)

Do not make unrelated industries look like the same site. A demolition firm should feel robust and professional; a travel studio should feel aspirational; a salon should feel warm and polished.

LOGO — REQUIRED
Every preview must visibly include a proper logo in the header. The asset manifest normally contains a logo asset with placeholder {{W99_ASSET:logo}}. USE IT. Do not replace it with generic text-only branding unless no logo asset exists at all.

The header should look deliberately branded on mobile and desktop. Size/crop the logo sensibly. Do not make it tiny, stretched or buried.

IMAGERY — PREMIUM LOOK
Use the supplied visual assets intentionally. A normal preview should visibly use roughly 3 non-logo images plus the logo when those assets exist:
1. strong hero image
2. service/action image
3. supporting/trust/atmosphere image

Do not hide all imagery below the fold. The hero should usually have strong visual presence. Service sections can use cards, image-led blocks, split layouts or editorial compositions. Avoid the generic SaaS look of abstract blobs, random gradients and meaningless workspace photos when trade-specific imagery exists.

SITE STRUCTURE
For a normal local service business, make the one-page site feel complete with a strong selection of:
- branded header/navigation
- hero with business name, clear promise and CTA
- 3-6 service/category cards or sections
- about/positioning section
- visually rich work/service section
- simple process/value/trust section using non-fabricated qualitative language
- useful FAQ
- contact/quote CTA
- professional footer

Do not force every section if the trade argues for something better, but the page must feel intentionally designed and substantial — not like a skeleton.

SERVICE CARDS
Use clear service/category cards when they help visitors understand the business quickly. Base them on supplied services or reasonable CATEGORY-LEVEL explanations directly implied by the business description. Never use service cards to invent specialist credentials or unsupported promises.

CTA
The page exists to generate a call, email, quote request, booking or enquiry. Make the primary action obvious in the hero and repeat it naturally later. If a phone/email is supplied, make it tappable. If contact details are missing, use a neutral "Request a Quote" / "Get in Touch" interaction without visibly saying details are missing.

TECHNICAL RULES
Hand-written static HTML and CSS. No framework, build step, CDN, external font file, jQuery, analytics or tracking pixel.

- One CSS file at assets/site.css.
- JS only when useful for mobile menu/accordion.
- System font stack only.
- No invented external image URLs. Use supplied {{W99_ASSET:key}} placeholders exactly.
- Mobile first; design for 360-390px before desktop.
- Tap targets at least 44px.
- tel: for confirmed phone numbers, mailto: for confirmed email.
- Avoid horizontal overflow.

ACCESSIBILITY
- One h1 per page.
- Heading levels do not skip.
- Useful alt text for meaningful images; alt="" for decorative images.
- WCAG AA contrast.
- Visible focus rings.
- Semantic header/nav/main/footer/button/a elements.
- Respect prefers-reduced-motion.
- Forms use real labels.

DESIGN QUALITY BAR
This preview is a sales asset. It should look more expensive than €99.
Use strong spacing, hierarchy, intentional section rhythm, premium image crops, restrained colour, clear typography and thoughtful mobile composition.

Avoid:
- giant empty sections
- everything inside identical rounded cards
- generic teal/blue SaaS styling by default
- tiny logo
- walls of text
- obvious AI filler
- repetitive section layouts
- unstyled default forms
- generic "Irish business" labels

The business name should dominate the identity. The website should look like it was designed specifically for that business.

EVERY PAGE MUST HAVE
- <!doctype html>
- correct lang (en-IE unless instructed otherwise)
- viewport meta
- useful title using the business name
- human meta description under 160 chars
- Open Graph title/description/type/locale
- LocalBusiness JSON-LD containing ONLY supplied factual fields; omit unknown keys

DOMAIN SUGGESTIONS
Three plausible short .ie domains based on the real business name/location. No hyphens or numbers unless unavoidable.

NOTES
Notes are private for the operator. Mention missing hard facts or anything worth checking there. NEVER put those caveats into the visible customer website.`;
}

export interface PreviewInjection {
  checkoutUrl: string;
  businessName: string;
}

export const W99_START = "<!--w99:preview:start-->";
export const W99_END = "<!--w99:preview:end-->";

export function previewBanner({ checkoutUrl }: PreviewInjection): string {
  const url = escapeHtml(checkoutUrl);

  return `${W99_START}
<style>
  .w99{--w99-violet:#5b3fe8;--w99-ink:#141033;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .w99-top{position:sticky;top:0;z-index:9999;background:var(--w99-ink);color:#fff;padding:10px 16px;text-align:center;font-size:14px;line-height:1.4}
  .w99-top b{color:#b9a9ff}
  .w99-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#fff;border-top:1px solid #ded5fb;padding:12px 16px;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 -6px 24px rgba(20,16,51,.12)}
  .w99-bar p{margin:0;color:var(--w99-ink);font-size:15px;font-weight:600}
  .w99-btn{display:inline-block;background:var(--w99-violet);color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:13px 26px;border-radius:999px;min-height:44px;line-height:1.3}
  .w99-btn:hover{background:#4429c7}
  .w99-btn:focus-visible{outline:3px solid #2d1b8f;outline-offset:2px}
  .w99-block{text-align:center;padding:52px 20px;background:#efebfe;border-top:1px solid #ded5fb;border-bottom:1px solid #ded5fb}
  .w99-block h2{margin:0 0 10px;color:var(--w99-ink);font-size:26px;line-height:1.25}
  .w99-block p{margin:0 0 22px;color:#4a4570;font-size:16px}
  .w99-micro{margin:12px 0 0;font-size:13px;color:#6b6790}
  body{padding-bottom:84px}
  @media (max-width:520px){.w99-bar p{display:none}}
  @media print{.w99-top,.w99-bar,.w99-block{display:none}}
</style>
<div class="w99 w99-top" role="status">This is your website preview — <b>nothing has been charged</b>. It's yours for €99 if you want it.</div>
<div class="w99 w99-bar"><p>Happy with it?</p><a class="w99-btn" href="${url}">Yes, I'll take it — €99</a></div>
${W99_END}`;
}

export function previewCloser({ checkoutUrl, businessName }: PreviewInjection): string {
  const name = escapeHtml(businessName);
  const url = escapeHtml(checkoutUrl);

  return `${W99_START}
<div class="w99 w99-block">
  <h2>This is ${name}'s website. Want to keep it?</h2>
  <p>€99 once. The domain and hosting are included for the first year, and it goes live today.</p>
  <a class="w99-btn" href="${url}">Yes, I'll take it — €99</a>
  <p class="w99-micro">One payment. No subscription. You own the domain and the files.</p>
</div>
${W99_END}`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
