import { content } from "@/data/content";

export default function StatsBand() {
  return (
    <div className="border-b border-[#1D2124]">
      <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {content.stats.map((stat) => (
          <div key={stat.title} className="text-center md:text-left">
            <strong className="block text-[#8AFF3C] font-display text-lg md:text-xl mb-1">{stat.title}</strong>
            <span className="text-[#9BA39C] text-sm">{stat.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
