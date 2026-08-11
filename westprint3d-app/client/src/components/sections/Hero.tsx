import { Button } from "@/components/ui/button";
import { content } from "@/data/content";
import { hero } from "@/data/media";

export default function Hero() {
  const t = content.hero;

  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 20%, rgba(138,255,60,0.10), transparent 70%)",
        }}
      />
      <div className="container relative grid lg:grid-cols-2 gap-14 items-center">
        <div className="animate-fadeInUp">
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#8AFF3C] font-semibold mb-5">
            {t.eyebrow}
          </p>
          <h1 className="text-[#F4F6F3]">
            {t.titleStart} <span className="text-neon">{t.titleEmphasis}</span>
          </h1>
          <p className="text-[#9BA39C] text-lg leading-relaxed mt-6 max-w-md">{t.lead}</p>

          <div className="flex flex-wrap gap-4 mt-9">
            <a href="#shop">
              <Button className="btn-neon" size="lg">
                {t.ctaPrimary}
              </Button>
            </a>
            <a href="#custom">
              <Button variant="outline" className="btn-outline-neon" size="lg">
                {t.ctaSecondary}
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-14 max-w-md">
            {t.trust.map((item) => (
              <div key={item.title}>
                <b className="block text-[#F4F6F3] font-semibold text-sm md:text-base">{item.title}</b>
                <span className="text-[#9BA39C] text-xs md:text-sm">{item.body}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-fadeIn">
          <div className="absolute -top-4 left-4 z-10 rounded-full bg-[#0D0F0D]/90 border border-[#2B322E] px-4 py-2 text-xs font-semibold text-[#8AFF3C] backdrop-blur-sm">
            {t.imageTag}
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#2B322E] shadow-2xl">
            <img src={hero} alt="WestPrint3D illuminated custom lightbox" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
