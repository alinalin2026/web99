import { content } from "@/data/content";

export default function Process() {
  const t = content.process;

  return (
    <section className="py-24 md:py-32">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <h2 className="text-[#F4F6F3] mb-4">{t.title}</h2>
          <p className="text-lg text-[#9BA39C] leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {t.steps.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="flex items-center justify-center w-11 h-11 rounded-full border border-[#8AFF3C]/40 text-[#8AFF3C] font-display font-semibold mb-6">
                {i + 1}
              </div>
              <h3 className="text-[#F4F6F3] mb-3">{step.title}</h3>
              <p className="text-[#9BA39C] leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
