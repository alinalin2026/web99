import { Compass } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { content } from "@/data/content";

export default function NotFound() {
  const t = content.notFound;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#08090A] px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#8AFF3C]/10 text-[#8AFF3C] mx-auto mb-6">
          <Compass size={26} />
        </div>
        <h1 className="text-[#F4F6F3] text-3xl mb-3">{t.title}</h1>
        <p className="text-[#9BA39C] leading-relaxed mb-8">{t.body}</p>
        <Link href="/">
          <Button className="btn-neon" size="lg">
            {t.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}
