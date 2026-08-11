import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { content } from "@/data/content";

export default function About() {
  const t = content.about;

  return (
    <section id="about" className="py-24 md:py-32 bg-[#0C0E0D] border-t border-[#1D2124]">
      <div className="container grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#8AFF3C] font-semibold mb-5">
            {t.eyebrow}
          </p>
          <h2 className="text-[#F4F6F3] mb-5">{t.title}</h2>
          <p className="text-[#9BA39C] leading-relaxed max-w-md">{t.body}</p>
        </div>

        <div className="bg-[#101312] border border-[#2B322E] rounded-2xl p-6 md:p-8">
          <h3 className="text-[#F4F6F3] mb-3">{t.boxTitle}</h3>
          <p className="text-[#9BA39C] leading-relaxed">{t.boxBody}</p>
          <hr className="border-t border-[#2B322E] my-6" />
          <b className="block text-[#F4F6F3] mb-2">{t.fileNote}</b>
          <p className="text-[#9BA39C] leading-relaxed mb-6">{t.fileBody}</p>
          <a href="#custom">
            <Button className="btn-neon">
              {t.cta}
              <ArrowRight size={16} />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
