import { Compass } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F5F0] px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#E8704A]/10 text-[#E8704A] mx-auto mb-6">
          <Compass size={26} />
        </div>
        <h1 className="text-3xl mb-3">{t.notFound.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">{t.notFound.body}</p>
        <Link href="/">
          <Button className="btn-coral" size="lg">
            {t.notFound.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}
