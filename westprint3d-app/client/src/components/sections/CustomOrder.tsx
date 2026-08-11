import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WESTPRINT3D_EMAIL } from "@/data/contact";
import { content } from "@/data/content";

export default function CustomOrder() {
  const t = content.custom;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Custom quote request${name ? ` — ${name}` : ""}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      "What I'd like made:",
      description,
    ].join("\n");
    window.location.href = `mailto:${WESTPRINT3D_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="custom" className="py-24 md:py-32">
      <div className="container grid lg:grid-cols-2 gap-14 items-start">
        <div>
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#8AFF3C] font-semibold mb-5">
            {t.eyebrow}
          </p>
          <h2 className="text-[#F4F6F3] mb-5">{t.title}</h2>
          <p className="text-lg text-[#9BA39C] leading-relaxed mb-8 max-w-md">{t.body}</p>
          <div className="flex flex-wrap gap-3">
            {t.tags.map((tag) => (
              <span
                key={tag}
                className="btn-outline-neon rounded-full px-4 py-2 text-sm inline-flex items-center"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#101312] border border-[#2B322E] rounded-2xl p-6 md:p-8 space-y-4"
        >
          <Input
            required
            placeholder={t.form.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#08090A] border-[#2B322E] text-[#F4F6F3] placeholder:text-[#9BA39C] h-11"
          />
          <Input
            required
            type="email"
            placeholder={t.form.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#08090A] border-[#2B322E] text-[#F4F6F3] placeholder:text-[#9BA39C] h-11"
          />
          <Textarea
            required
            placeholder={t.form.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-[#08090A] border-[#2B322E] text-[#F4F6F3] placeholder:text-[#9BA39C] min-h-32"
          />
          <Button type="submit" className="btn-neon w-full" size="lg">
            {t.form.submit}
            <ArrowRight size={16} />
          </Button>
        </form>
      </div>
    </section>
  );
}
