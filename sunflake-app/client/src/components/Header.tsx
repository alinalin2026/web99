import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import LanguagePill from "@/components/LanguagePill";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { logoLockup } from "@/data/media";
import { cn } from "@/lib/utils";

export default function Header() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const onHome = location === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks: { href: string; label: string }[] = [
    { href: "#how-it-works", label: t.nav.howItWorks },
    { href: "#quiz", label: t.nav.quiz },
    { href: "#stories", label: t.nav.stories },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || !onHome
          ? "bg-[#F8F5F0]/90 backdrop-blur-md shadow-sm py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container flex items-center justify-between gap-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 shrink-0 rounded-full px-3 py-1.5 transition-colors duration-300",
            scrolled || !onHome ? "bg-transparent px-0 py-0" : "bg-white/85 backdrop-blur-sm shadow-sm"
          )}
        >
          <img src={logoLockup} alt="SunFlake Holidays" className="h-7 md:h-8 w-auto" />
        </Link>

        {onHome && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#2C2C2C] hover:text-[#E8704A] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <LanguagePill />
          <a href={onHome ? "#quiz" : "/#quiz"}>
            <Button className="btn-coral hidden sm:inline-flex" size="sm">
              {t.nav.cta}
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
