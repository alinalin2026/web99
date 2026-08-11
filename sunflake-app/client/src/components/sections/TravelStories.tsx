import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { storyImages } from "@/data/media";

export default function TravelStories() {
  const { t } = useLanguage();

  return (
    <section id="stories" className="py-24 md:py-32 bg-[#F8F5F0]">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <h2 className="text-coral mb-4">{t.stories.sectionTitle}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {t.stories.sectionSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {t.stories.items.map((story, i) => (
            <Link
              key={story.slug}
              href={`/stories/${story.slug}`}
              className={`group block rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 ${
                i === 0 ? "md:col-span-2 md:row-span-1" : ""
              }`}
            >
              <div className={`overflow-hidden ${i === 0 ? "h-64 md:h-80" : "h-56"}`}>
                <img
                  src={storyImages[story.slug]}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 md:p-7">
                <p className="text-xs uppercase tracking-wide text-[#2B6BA6] font-semibold mb-2">
                  {story.readTime} {t.stories.minuteRead}
                </p>
                <h3 className="text-xl mb-3 group-hover:text-[#E8704A] transition-colors duration-200">
                  {story.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {story.excerpt}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E8704A]">
                  {t.stories.readMore}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
