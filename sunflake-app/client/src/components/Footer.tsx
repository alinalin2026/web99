import { Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { SUNFLAKE_EMAIL } from "@/data/contact";
import { logoIcon } from "@/data/media";

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#2C2C2C] text-[#F8F5F0]">
      <div className="container py-20 text-center">
        <img src={logoIcon} alt="" className="h-12 w-auto mx-auto mb-6 opacity-90" />
        <h2 className="text-2xl md:text-3xl text-white mb-3">{t.footer.contactTitle}</h2>
        <p className="text-white/70 max-w-md mx-auto mb-8 leading-relaxed">
          {t.footer.contactBody}
        </p>
        <a href={`mailto:${SUNFLAKE_EMAIL}`}>
          <Button className="btn-coral" size="lg">
            <Mail size={16} />
            {SUNFLAKE_EMAIL}
          </Button>
        </a>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/50">
          <p>{t.footer.tagline}</p>
          <p>
            © {year} <Link href="/" className="hover:text-white transition-colors">{t.footer.rights}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
