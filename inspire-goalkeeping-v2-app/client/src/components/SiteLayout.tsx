import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/coaching", label: "The programme" },
  { href: "/about", label: "Our standard" },
  { href: "/contact", label: "Join in" },
];

function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/" className="brand-lockup" aria-label="Inspire Goalkeeping home">
    <span className={`brand-crest ${light ? "brand-crest-light" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 50 50" fill="none"><path d="M25 3 44 9v14c0 12.3-7.7 20-19 24C13.7 43 6 35.3 6 23V9l19-6Z" fill="currentColor"/><path d="M12 27V15h26v12M12 21h26M17 12.5c2-4 4.6-6 8-6s6 2 8 6" stroke="var(--crest-accent)" strokeWidth="2" strokeLinecap="round"/><circle cx="34.5" cy="11" r="3" fill="var(--crest-accent)"/><path d="M19 36h12" stroke="var(--crest-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
    </span>
    <span className={`brand-type ${light ? "text-white" : "text-ink"}`}><strong>INSPIRE</strong><small>GOALKEEPING ACADEMY</small></span>
  </Link>;
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return <div className="min-h-screen bg-cloud text-ink">
    <header className="site-header site-header-v2"><div className="container flex h-[84px] items-center justify-between"><Logo /><nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">{navItems.map(item => <Link key={item.href} href={item.href} className={`nav-link-v2 ${location === item.href ? "active" : ""}`}>{item.label}</Link>)}</nav><div className="hidden items-center gap-4 md:flex"><a href="tel:+353896564601" className="phone-link"><Phone size={15}/> +353 89 656 4601</a><Link href="/contact" className="button button-lime button-sm">Join a session <ArrowUpRight size={15}/></Link></div><button className="icon-button icon-button-v2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={22}/> : <Menu size={22}/>}</button></div>{open && <div className="mobile-menu mobile-menu-v2 md:hidden"><div className="container flex flex-col gap-1 pb-6 pt-2">{navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="mobile-nav-link mobile-nav-link-v2">{item.label}<ArrowUpRight size={16}/></Link>)}<a href="tel:+353896564601" className="mobile-nav-link mobile-nav-link-v2 text-lime">Call +353 89 656 4601 <Phone size={16}/></a></div></div>}</header>
    <main>{children}</main>
    <footer className="footer-v2"><div className="container"><div className="grid gap-12 py-14 md:grid-cols-[1.3fr_.8fr_.9fr] md:py-18"><div><Logo light/><p className="mt-6 max-w-sm text-sm leading-6 text-white/55">Goalkeeper coaching for the next generation — built around clarity, confidence and consistent work.</p><p className="mt-7 font-display text-2xl font-semibold text-lime">Raise your line.</p></div><div><p className="eyebrow text-lime">Navigate</p><div className="mt-5 flex flex-col gap-3">{navItems.map(item => <Link key={item.href} href={item.href} className="footer-link-v2">{item.label}</Link>)}</div></div><div><p className="eyebrow text-lime">Contact</p><div className="mt-5 flex flex-col gap-3 text-sm text-white/65"><a className="footer-link-v2" href="mailto:inspiregk2023@gmail.com">inspiregk2023@gmail.com</a><a className="footer-link-v2" href="tel:+353896564601">+353 89 656 4601</a><span>South-East Ireland</span></div></div></div><div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Inspire Goalkeeping Academy</span><div className="flex items-center gap-5"><Link href="/terms" className="footer-link-v2">Terms</Link><Link href="/privacy" className="footer-link-v2">Privacy</Link></div></div></div></footer>
  </div>;
}
