import { content } from "@/data/content";
import { hero, planters, workshop } from "@/data/media";

const categoryImages: Record<string, string> = {
  lightboxes: hero,
  household: planters,
  workshop: workshop,
};

export default function WhatWeMake() {
  const t = content.shop;

  return (
    <section id="shop" className="py-24 md:py-32">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <h2 className="text-[#F4F6F3] mb-4">{t.title}</h2>
          <p className="text-lg text-[#9BA39C] leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {t.categories.map((cat) => (
            <article
              key={cat.key}
              className="card-glow rounded-2xl overflow-hidden bg-[#101312] border border-[#2B322E]"
            >
              <div className="h-56 overflow-hidden">
                <img src={categoryImages[cat.key]} alt={cat.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-[#F4F6F3] mb-2">{cat.title}</h3>
                <p className="text-[#9BA39C] leading-relaxed">{cat.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
