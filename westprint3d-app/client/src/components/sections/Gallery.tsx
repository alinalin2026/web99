import { content } from "@/data/content";
import { galleryImages } from "@/data/media";

export default function Gallery() {
  const t = content.gallery;

  return (
    <section id="gallery" className="py-24 md:py-32 bg-[#0C0E0D] border-y border-[#1D2124]">
      <div className="container">
        <div className="max-w-2xl mb-14">
          <h2 className="text-[#F4F6F3] mb-4">{t.title}</h2>
          <p className="text-lg text-[#9BA39C] leading-relaxed">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {galleryImages.map((img) => (
            <div
              key={img.alt}
              className="card-glow rounded-xl overflow-hidden border border-[#2B322E] aspect-square"
            >
              <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
