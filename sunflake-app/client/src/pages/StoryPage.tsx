import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { storyImages } from "@/data/media";
import NotFound from "@/pages/NotFound";

export default function StoryPage() {
  const { t } = useLanguage();
  const { slug } = useParams();
  const story = t.stories.items.find((item) => item.slug === slug);

  if (!story) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="relative h-[50vh] min-h-[320px]">
          <img
            src={storyImages[story.slug]}
            alt={story.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="relative z-10 container h-full flex flex-col justify-end pb-12 pt-32">
            <p className="text-white/80 text-sm font-semibold mb-3">
              {story.readTime} {t.stories.minuteRead}
            </p>
            <h1 className="text-white max-w-3xl drop-shadow-sm">{story.title}</h1>
          </div>
        </div>

        <article className="container max-w-2xl py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E8704A] mb-10 hover:underline"
          >
            <ArrowLeft size={14} />
            {t.stories.backToStories}
          </Link>

          {story.body.map((paragraph, i) => (
            <p key={i} className="text-lg leading-relaxed text-[#2C2C2C] mb-6">
              {paragraph}
            </p>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
