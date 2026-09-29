import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";

const navItems = [
  { href: "/coaching", label: "Coaching" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="Inspire Goalkeeping home">
      <span className={`logo-mark ${light ? "logo-mark-light" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 44 44" fill="none">
          <path d="M8 12.5 22 6l14 6.5v11.2c0 7.3-5.7 12.7-14 15.8-8.3-3.1-14-8.5-14-15.8V12.5Z" fill="currentColor" opacity=".98" />
          <path d="M13 27V15m0 0h18m0 0v12M13 21h18" stroke="var(--logo-accent)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16.5 12.5c1.7-3 4-4.5 6.7-4.5 2.7 0 5 1.5 6.3 4.5" stroke="var(--logo-accent)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="29.5" cy="11.5" r="2.4" fill="var(--logo-accent)" />
        </svg>
      </span>
      <span className={`logo-wordmark ${light ? "text-white" : "text-ink"}`}>
        <span>Inspire</span>
        <small>Goalkeeping</small>
      </span>
    </Link>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="site-header">
        <div className="container flex h-[78px] items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={`nav-link ${location === item.href ? "nav-link-active" : ""}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <a href="tel:+353896564601" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/70 transition-colors hover:text-coral">
              <Phone size={15} strokeWidth={1.8} />
              <span>+353 89 656 4601</span>
            </a>
            <Link href="/contact" className="button button-dark button-sm">
              Book a session <ArrowUpRight size={15} />
            </Link>
          </div>
          <button className="icon-button md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="mobile-menu md:hidden">
            <div className="container flex flex-col gap-1 pb-5 pt-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="mobile-nav-link">
                  {item.label}
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              <a href="tel:+353896564601" className="mobile-nav-link text-coral">
                Call +353 89 656 4601 <Phone size={16} />
              </a>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="footer-dark">
        <div className="container">
          <div className="grid gap-12 py-16 md:grid-cols-[1.4fr_.8fr_.8fr] md:py-20">
            <div>
              <Logo light />
              <p className="mt-7 max-w-sm text-[15px] leading-7 text-white/60">
                Specialist goalkeeper coaching for boys and girls across the South-East of Ireland — from first saves to next-level performance.
              </p>
              <p className="mt-8 font-display text-2xl italic text-coral">Train. Believe. Inspire.</p>
            </div>
            <div>
              <p className="eyebrow text-coral">Explore</p>
              <div className="mt-5 flex flex-col gap-3">
                {navItems.map((item) => <Link key={item.href} href={item.href} className="footer-link">{item.label}</Link>)}
              </div>
            </div>
            <div>
              <p className="eyebrow text-coral">Get in touch</p>
              <div className="mt-5 flex flex-col gap-3 text-[15px] text-white/70">
                <a href="mailto:inspiregk2023@gmail.com" className="footer-link">inspiregk2023@gmail.com</a>
                <a href="tel:+353896564601" className="footer-link">+353 89 656 4601</a>
                <span>South-East Ireland</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs tracking-wide text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Inspire Goalkeeping. All rights reserved.</span>
            <div className="flex items-center gap-5">
              <Link href="/terms" className="footer-link">Terms</Link>
              <Link href="/privacy" className="footer-link">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
