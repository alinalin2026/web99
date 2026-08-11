import { ArrowRight } from "lucide-react";
import { content } from "@/data/content";
import { bench, desk, entryway, gaming } from "@/data/media";

const productImages: Record<string, string> = { gaming, bench, entryway, desk };

export default function PopularPrints() {
  const t = content.products;

  return (
    <section className="py-24 md:py-32 bg-[#0C0E0D] border-y border-[#1D2124]">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <h2 className="text-[#F4F6F3] mb-4">{t.title}</h2>
          <p className="text-lg text-[#9BA39C] leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.items.map((item) => (
            <article
              key={item.key}
              className="card-glow rounded-2xl overflow-hidden bg-[#101312] border border-[#2B322E]"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={productImages[item.key]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="text-[#F4F6F3] text-base mb-1">{item.title}</h3>
                <p className="text-[#9BA39C] text-sm mb-4">{item.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[#9BA39C] font-mono text-sm">€—</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8AFF3C]">
                    {t.viewItem}
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
