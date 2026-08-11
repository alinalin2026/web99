import { MapPinned, Search, Sunrise } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const icons = [MapPinned, Search, Sunrise];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#F8F5F0]">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <h2 className="text-coral mb-4">{t.howItWorks.title}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.howItWorks.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 md:gap-8">
          {t.howItWorks.steps.map((step, i) => {
            const Icon = icons[i];
            return (
              <div
                key={step.title}
                className={`relative pl-0 ${i === 1 ? "md:mt-10" : i === 2 ? "md:mt-20" : ""}`}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8704A]/10 text-[#E8704A] shrink-0">
                    <Icon size={22} />
                  </div>
                  <span className="font-display text-4xl text-[#2B6BA6]/25 font-bold leading-none">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-xl mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
