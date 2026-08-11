import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { content } from "@/data/content";
import { logo } from "@/data/media";
import { cn } from "@/lib/utils";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled
          ? "bg-[#08090A]/90 backdrop-blur-md border-[#2B322E] py-3"
          : "bg-gradient-to-b from-black/60 to-transparent border-transparent py-5"
      )}
    >
      <div className="container flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0 rounded-lg bg-white px-4 py-2 shadow-lg">
          <img src={logo} alt="WestPrint3D" className="h-7 md:h-9 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {content.nav.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#F4F6F3]/80 hover:text-[#8AFF3C] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#custom">
          <Button className="btn-neon hidden sm:inline-flex" size="sm">
            {content.nav.cta} →
          </Button>
        </a>
      </div>
    </header>
  );
}
