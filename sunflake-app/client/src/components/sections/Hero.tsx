import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { heroImage } from "@/data/media";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-[92vh] flex items-end overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt=""
          className="w-full h-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      </div>

      <div className="container relative z-10 pb-20 pt-40">
        <p className="text-white/90 uppercase tracking-[0.2em] text-xs md:text-sm font-semibold mb-4 animate-fadeIn">
          {t.hero.eyebrow}
        </p>
        <h1 className="text-white max-w-3xl text-balance drop-shadow-sm animate-fadeInUp">
          {t.hero.title}
        </h1>
        <p className="text-white/90 max-w-xl mt-6 text-lg leading-relaxed animate-fadeInUp stagger-1">
          {t.hero.subtitle}
        </p>
        <div className="flex flex-wrap gap-4 mt-9 animate-fadeInUp stagger-2">
          <a href="#quiz">
            <Button className="btn-coral" size="lg">
              {t.hero.ctaPrimary}
            </Button>
          </a>
          <a href="#how-it-works">
            <Button
              size="lg"
              variant="outline"
              className="border-white/70 text-white bg-white/10 hover:bg-white/20 hover:text-white backdrop-blur-sm"
            >
              {t.hero.ctaSecondary}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
