import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Facebook,
  Hammer,
  HardHat,
  House,
  Menu,
  Phone,
  Shovel,
  Trees,
  X,
} from "lucide-react";
import { toast } from "sonner";

/**
 * K&L CONSTRUCTION DESIGN REMINDER
 * Contemporary trade editorialism: confident Barlow Condensed typography, off-white paper,
 * charcoal materials and one functional signal-red accent. Keep all copy direct and useful.
 */

const primaryPhone = "089 249 6440";
const secondaryPhone = "083 851 4297";
const primaryPhoneLink = "+353892496440";
const secondaryPhoneLink = "+353838514297";

const navigation = [
  ["Services", "services"],
  ["Our work", "work"],
  ["About us", "about"],
  ["Contact", "contact"],
] as const;

const services = [
  { num: "01", name: "Roofing", note: "Repairs, renewals & dependable weather protection.", icon: House },
  { num: "02", name: "Second-fix carpentry", note: "The clean finishing work that brings a room together.", icon: Hammer },
  { num: "03", name: "Groundworks", note: "Practical preparation for a strong start and a tidy finish.", icon: Shovel },
  { num: "04", name: "Landscaping", note: "Hardwearing exterior spaces made for everyday use.", icon: Trees },
  { num: "05", name: "Power washing", note: "A straightforward refresh for patios, paths and exterior surfaces.", icon: HardHat },
];

const workPanels = [
  {
    title: "Roofing & repairs",
    type: "Weather-ready exteriors",
    image: "/kl-roofing-service.jpg",
    className: "md:col-span-7",
  },
  {
    title: "Second-fix detailing",
    type: "Careful interior finishing",
    image: "/kl-carpentry-service.jpg",
    className: "md:col-span-5",
  },
  {
    title: "Exterior care",
    type: "Surfaces, gardens & curb appeal",
    image: "/kl-property-care-service.jpg",
    className: "md:col-span-12",
  },
];

const process = [
  ["01", "Tell us the job", "Call us or send a few details about the work you need."],
  ["02", "Get a clear quote", "We’ll discuss the scope and provide a no-obligation quotation."],
  ["03", "Plan the work", "We agree the approach, timing and materials before work begins."],
  ["04", "A proper finish", "Your job is completed with care, communication and a clean handover."],
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function QuoteButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToId("quote")}
      className={`inline-flex items-center justify-center gap-2 bg-signal px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#c92323] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal ${className}`}
    >
      Request a free quote <ArrowUpRight size={16} strokeWidth={2.5} />
    </button>
  );
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleQuoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.message("Your quote form is ready to connect to K&L’s preferred inbox. For the quickest response, call us now.");
  };

  const openFacebookNotice = () => {
    toast.message("Add K&L’s Facebook page URL here before publishing.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f3ef] text-carbon">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-black/10 bg-[#f5f3ef]/95 shadow-sm backdrop-blur" : "bg-transparent"}`}>
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 md:px-8">
          <button type="button" onClick={() => scrollToId("top")} aria-label="Return to top" className="flex items-center gap-3 text-left">
            <span className="kl-mark-plate grid h-11 w-11 place-items-center border border-white/30 bg-carbon/95 p-2.5 shadow-lg">
              <img src="/kl-angular-mark.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className={`leading-none transition-colors ${scrolled ? "text-carbon" : "text-white"}`}>
              <strong className="display block text-[1.4rem] font-bold tracking-wide">K&L</strong>
              <span className="block pt-1 text-[.53rem] font-bold tracking-[.16em]">CONSTRUCTION & MAINTENANCE</span>
            </span>
          </button>

          <nav aria-label="Primary navigation" className={`hidden items-center gap-7 text-sm font-bold lg:flex ${scrolled ? "text-carbon" : "text-white"}`}>
            {navigation.map(([label, id]) => (
              <button key={id} type="button" onClick={() => scrollToId(id)} className="relative after:absolute after:-bottom-2 after:left-0 after:h-[2px] after:w-0 after:bg-signal after:transition-all hover:after:w-full">
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <a href={`tel:${primaryPhoneLink}`} className={`text-sm font-bold transition-colors hover:text-signal ${scrolled ? "text-carbon" : "text-white"}`}>
              {primaryPhone}
            </a>
            <QuoteButton />
          </div>

          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu" className={`grid h-11 w-11 place-items-center border lg:hidden ${scrolled ? "border-carbon text-carbon" : "border-white/60 text-white"}`}>
            {open ? <X size={22} /> : <Menu size={24} />}
          </button>
        </div>
        {open && (
          <div className="border-t border-black/10 bg-[#f5f3ef] px-5 pb-6 pt-4 shadow-xl lg:hidden">
            <nav aria-label="Mobile navigation" className="flex flex-col">
              {navigation.map(([label, id]) => (
                <button key={id} type="button" onClick={() => { setOpen(false); scrollToId(id); }} className="flex items-center justify-between border-b border-black/10 py-4 text-left text-lg font-bold">
                  {label}<ChevronRight size={18} className="text-signal" />
                </button>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <a href={`tel:${primaryPhoneLink}`} className="flex items-center justify-center gap-2 border border-carbon py-3 text-sm font-bold"><Phone size={15} /> Call now</a>
              <QuoteButton className="px-3" />
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="grain relative isolate min-h-[790px] overflow-hidden bg-carbon pt-[78px] text-white sm:min-h-[720px]">
          <img src="/kl-hero-roofing.jpg" alt="Roofers working on a slate roof" className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
          <div className="hero-shade absolute inset-0" />
          <div className="absolute bottom-0 left-0 h-[11rem] w-[39%] max-w-[430px] border-t-4 border-signal bg-carbon/90 md:h-[14rem]" />
          <div className="relative mx-auto flex min-h-[712px] max-w-[1440px] flex-col justify-between px-5 pb-10 pt-16 md:px-8 md:pb-12 lg:min-h-[642px] lg:pb-14 lg:pt-24">
            <div className="max-w-3xl pt-12 lg:pt-16">
              <div className="reveal flex items-center gap-3">
                <span className="red-line" />
                <p className="eyebrow text-white/80">Ireland · Construction & property care</p>
              </div>
              <h1 className="reveal reveal-delay-1 display mt-6 max-w-[720px] text-[clamp(4rem,9.2vw,8.6rem)] font-bold uppercase leading-[.82] tracking-[-.035em]">
                Built properly.<br /><em className="font-bold text-signal">Maintained</em> with care.
              </h1>
              <p className="reveal reveal-delay-2 mt-8 max-w-xl text-base leading-7 text-white/82 sm:text-lg">
                Reliable roofing, construction and property maintenance for homes and projects that deserve a capable team and a clean finish.
              </p>
              <div className="reveal reveal-delay-3 mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <QuoteButton className="px-6 py-4" />
                <a href={`tel:${primaryPhoneLink}`} className="inline-flex items-center gap-2 border border-white/50 bg-white/5 px-6 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white hover:text-carbon">
                  <Phone size={16} /> Call {primaryPhone}
                </a>
              </div>
            </div>
            <div className="relative z-10 grid gap-5 text-white sm:grid-cols-[1fr_auto] sm:items-end lg:pl-[41%]">
              <p className="max-w-md text-sm leading-6 text-white/90"><span className="font-bold">One team. Five practical services.</span> From small maintenance tasks to larger construction projects, K&L makes it easier to get the job moving.</p>
              <button type="button" onClick={() => scrollToId("services")} className="group flex items-center gap-3 text-left text-sm font-bold"><span className="grid h-10 w-10 place-items-center rounded-full border border-white/70 transition group-hover:bg-white group-hover:text-carbon"><ArrowRight size={17} /></span> Explore our services</button>
            </div>
          </div>
        </section>

        <section id="about" className="paper-grid relative scroll-mt-20 bg-[#f5f3ef] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto grid max-w-[1280px] gap-14 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
            <div>
              <span className="red-line" />
              <p className="eyebrow mt-5">The K&L approach</p>
              <h2 className="display mt-4 text-5xl font-bold uppercase leading-[.87] tracking-[-.03em] md:text-6xl">The work matters.<br />So does the way we do it.</h2>
            </div>
            <div className="max-w-2xl pt-1">
              <p className="text-xl leading-8 text-carbon md:text-2xl md:leading-9">K&L Construction & Maintenance is built around straightforward communication, practical know-how and workmanship you can rely on.</p>
              <p className="mt-6 max-w-xl leading-7 text-[#5e6066]">Whether you need a roof attended to, a room finished properly, a patio refreshed or a wider property project completed, we bring the same clear approach: understand the work, plan it properly and leave it looking right.</p>
              <div className="mt-10 grid max-w-xl gap-5 border-t border-carbon/20 pt-7 sm:grid-cols-2">
                <div><p className="display text-3xl font-bold uppercase">Small jobs</p><p className="mt-1 text-sm text-[#5e6066]">Handled with the same care as a larger project.</p></div>
                <div><p className="display text-3xl font-bold uppercase">Clear contact</p><p className="mt-1 text-sm text-[#5e6066]">Call direct, ask questions, know what comes next.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-20 bg-carbon px-5 py-20 text-white md:px-8 md:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-10 border-b border-white/20 pb-12 md:grid-cols-[1fr_auto] md:items-end">
              <div><span className="red-line" /><p className="eyebrow mt-5 text-white/60">What we do</p><h2 className="display mt-4 text-5xl font-bold uppercase leading-[.87] tracking-[-.03em] md:text-7xl">Practical work.<br />Proper standards.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-white/70">Choose a single service or bring K&L in for a broader property and construction plan.</p>
            </div>
            <div className="divide-y divide-white/15">
              {services.map(({ num, name, note, icon: Icon }) => (
                <button key={num} type="button" onClick={() => scrollToId("quote")} className="group grid w-full grid-cols-[3rem_1fr_auto] items-center gap-3 py-6 text-left transition md:grid-cols-[6rem_1fr_2fr_auto] md:gap-6 md:py-8">
                  <span className="display text-lg text-signal">{num}</span>
                  <h3 className="display text-3xl font-bold uppercase leading-none md:text-4xl">{name}</h3>
                  <p className="hidden text-sm leading-6 text-white/65 md:block">{note}</p>
                  <span className="grid h-10 w-10 place-items-center border border-white/30 text-white transition group-hover:border-signal group-hover:bg-signal"><Icon size={18} strokeWidth={1.8} /></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="work" className="scroll-mt-20 bg-[#e9e6df] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-12 flex flex-col gap-5 md:mb-16 md:flex-row md:items-end md:justify-between"><div><span className="red-line" /><p className="eyebrow mt-5">Work focus</p><h2 className="display mt-4 text-5xl font-bold uppercase leading-[.86] tracking-[-.03em] md:text-7xl">Built for the<br />everyday.</h2></div><p className="max-w-sm text-sm leading-6 text-[#5e6066]">Each K&L service is suited to the work that keeps homes, sites and exterior spaces working as they should.</p></div>
            <div className="grid gap-4 md:grid-cols-12">
              {workPanels.map((panel) => (
                <button key={panel.title} type="button" onClick={() => scrollToId("quote")} className={`group hover-lift relative min-h-[300px] overflow-hidden text-left ${panel.className}`}>
                  <img src={panel.image} alt="" className="image-zoom absolute inset-0 h-full w-full object-cover" />
                  <div className="image-shade absolute inset-0" />
                  <span className="absolute left-6 top-6 border border-white/50 bg-carbon/60 px-3 py-1.5 text-[.62rem] font-bold uppercase tracking-[.15em] text-white backdrop-blur-sm">{panel.type}</span>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-white"><h3 className="display max-w-xs text-4xl font-bold uppercase leading-[.85]">{panel.title}</h3><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/60 transition group-hover:bg-signal group-hover:border-signal"><ArrowUpRight size={18} /></span></div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f5f3ef] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1280px]">
            <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-24"><div><span className="red-line" /><p className="eyebrow mt-5">How it works</p><h2 className="display mt-4 text-5xl font-bold uppercase leading-[.86] tracking-[-.03em] md:text-6xl">A clear way<br />to get it done.</h2></div><p className="max-w-xl text-xl leading-8 text-[#55575d]">Good work begins with a good conversation. K&L keeps the first steps simple, so you can move from task to plan without the runaround.</p></div>
            <div className="mt-14 grid gap-0 border-t border-carbon/20 sm:grid-cols-2 lg:grid-cols-4">
              {process.map(([num, title, text]) => <div key={num} className="border-b border-carbon/20 py-7 pr-6 lg:border-b-0 lg:border-r lg:pl-6 lg:first:pl-0"><span className="display text-2xl font-bold text-signal">{num}</span><h3 className="mt-10 text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#62646a]">{text}</p></div>)}
            </div>
          </div>
        </section>

        <section id="quote" className="grain relative scroll-mt-16 overflow-hidden bg-carbon px-5 py-20 text-white md:px-8 md:py-28">
          <div className="absolute -right-12 top-0 text-[25rem] leading-none font-black text-white/[.025]" aria-hidden="true">K</div>
          <div className="relative mx-auto grid max-w-[1280px] gap-14 lg:grid-cols-[.82fr_1.18fr] lg:gap-24">
            <div><span className="red-line" /><p className="eyebrow mt-5 text-white/60">Let’s talk about the job</p><h2 className="display mt-4 text-5xl font-bold uppercase leading-[.85] tracking-[-.03em] md:text-7xl">Request a<br /><span className="text-signal">free quote.</span></h2><p className="mt-7 max-w-md leading-7 text-white/72">Tell us what needs doing. For an immediate conversation, call K&L directly using either number below.</p><div className="mt-9 space-y-3"><a href={`tel:${primaryPhoneLink}`} className="group flex items-center justify-between border-b border-white/20 pb-4 text-xl font-bold transition hover:text-signal"><span className="flex items-center gap-3"><Phone size={18} className="text-signal" /> {primaryPhone}</span><ArrowUpRight size={19} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></a><a href={`tel:${secondaryPhoneLink}`} className="group flex items-center justify-between border-b border-white/20 pb-4 text-xl font-bold transition hover:text-signal"><span className="flex items-center gap-3"><Phone size={18} className="text-signal" /> {secondaryPhone}</span><ArrowUpRight size={19} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" /></a></div></div>
            <form onSubmit={handleQuoteSubmit} className="quote-panel bg-[#f5f3ef] p-6 text-carbon sm:p-8 md:p-10"><p className="eyebrow text-signal">Quick enquiry</p><h3 className="display mt-3 text-4xl font-bold uppercase leading-none">What can we help with?</h3><div className="mt-8 grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold">Your name<input required name="name" placeholder="Name" className="mt-2 h-12 w-full border-b border-carbon/30 bg-transparent px-0 text-base font-normal outline-none transition placeholder:text-[#888a90] focus:border-signal" /></label><label className="block text-sm font-bold">Phone number<input required name="phone" type="tel" placeholder="Phone number" className="mt-2 h-12 w-full border-b border-carbon/30 bg-transparent px-0 text-base font-normal outline-none transition placeholder:text-[#888a90] focus:border-signal" /></label><label className="block text-sm font-bold sm:col-span-2">Email address<input required name="email" type="email" placeholder="Email address" className="mt-2 h-12 w-full border-b border-carbon/30 bg-transparent px-0 text-base font-normal outline-none transition placeholder:text-[#888a90] focus:border-signal" /></label><label className="block text-sm font-bold sm:col-span-2">Tell us about the work<textarea required name="message" placeholder="For example: roof repair, landscaping, carpentry…" rows={4} className="mt-2 w-full resize-none border-b border-carbon/30 bg-transparent px-0 py-3 text-base font-normal outline-none transition placeholder:text-[#888a90] focus:border-signal" /></label></div><button type="submit" className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-signal px-5 py-4 text-sm font-bold text-white transition hover:bg-[#c92323]">Send my quote request <ArrowRight size={16} /></button><p className="mt-4 text-xs leading-5 text-[#74767c]">Prefer to speak to someone now? Call <a className="font-bold text-carbon underline decoration-signal decoration-2 underline-offset-2" href={`tel:${primaryPhoneLink}`}>{primaryPhone}</a>.</p></form>
          </div>
        </section>

        <section id="reviews" className="scroll-mt-20 border-l-4 border-signal bg-carbon px-5 py-16 text-white md:px-8 md:py-20"><div className="mx-auto flex max-w-[1280px] flex-col gap-8 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow text-white/55">Client feedback</p><h2 className="display mt-3 text-4xl font-bold uppercase leading-[.9] md:text-5xl">Real words from real work.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-white/70">K&L will add approved customer feedback here as projects are completed. No invented reviews—just genuine client experience.</p></div><button type="button" onClick={() => scrollToId("quote")} className="inline-flex shrink-0 items-center justify-center gap-2 border border-signal bg-signal px-5 py-3.5 text-sm font-bold text-white transition hover:bg-transparent hover:text-white">Start your enquiry <ArrowUpRight size={16} /></button></div></section>
      </main>

      <footer id="contact" className="scroll-mt-20 bg-[#111217] px-5 pb-24 pt-16 text-white md:px-8 md:pb-12 md:pt-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-12 border-b border-white/15 pb-12 md:grid-cols-[1.25fr_.75fr_.75fr] md:gap-8"><div><div className="flex items-center gap-3"><span className="kl-mark-plate grid h-12 w-12 place-items-center border border-white/20 bg-carbon p-2.5"><img src="/kl-angular-mark.png" alt="" className="h-full w-full object-contain" /></span><span className="leading-none"><strong className="display block text-[1.65rem] font-bold tracking-wide">K&L</strong><span className="block pt-1 text-[.55rem] font-bold tracking-[.16em] text-white/60">CONSTRUCTION & MAINTENANCE</span></span></div><p className="mt-6 max-w-sm text-sm leading-6 text-white/65">Reliable construction and property maintenance across Ireland. Built properly. Maintained with care.</p></div><div><p className="eyebrow text-white/45">Get in touch</p><div className="mt-5 space-y-3"><a href={`tel:${primaryPhoneLink}`} className="block text-lg font-bold transition hover:text-signal">{primaryPhone}</a><a href={`tel:${secondaryPhoneLink}`} className="block text-lg font-bold transition hover:text-signal">{secondaryPhone}</a></div></div><div><p className="eyebrow text-white/45">Follow K&L</p><button type="button" onClick={openFacebookNotice} className="mt-5 inline-flex items-center gap-2 border border-white/30 px-4 py-3 text-sm font-bold transition hover:border-signal hover:bg-signal"><Facebook size={17} /> Facebook</button><p className="mt-3 text-xs leading-5 text-white/45">Facebook link to be added before launch.</p></div></div>
          <div className="flex flex-col gap-4 pt-7 text-xs text-white/45 md:flex-row md:items-center md:justify-between"><p>© {new Date().getFullYear()} K&L Construction & Maintenance. All rights reserved.</p><div className="flex gap-5"><button type="button" onClick={() => scrollToId("services")} className="transition hover:text-white">Services</button><button type="button" onClick={() => scrollToId("quote")} className="transition hover:text-white">Free quote</button></div></div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-white/20 bg-carbon p-2 md:hidden"><a href={`tel:${primaryPhoneLink}`} className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-white"><Phone size={16} /> Call now</a><button type="button" onClick={() => scrollToId("quote")} className="flex items-center justify-center gap-2 bg-signal py-3 text-sm font-bold text-white">Free quote <ArrowUpRight size={16} /></button></div>
    </div>
  );
}
