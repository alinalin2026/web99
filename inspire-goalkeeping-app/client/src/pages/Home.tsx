import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Quote, Shield, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";

import heroImage from "@/assets/images/hero.jpg";
import trainingImage from "@/assets/images/training.jpg";
import coachImage from "@/assets/images/coach.jpg";
import saveImage from "@/assets/images/save.jpg";

const services = [
  { number: "01", title: "Weekly goalkeeper sessions", body: "A consistent weekly rhythm to sharpen technique, confidence and decision-making in a positive group environment.", tag: "Build your base" },
  { number: "02", title: "1–2–1 coaching", body: "Focused individual coaching built around the areas that matter most to the player in front of us.", tag: "Own your progress" },
  { number: "03", title: "Club goalkeeper coaching", body: "A specialist goalkeeper layer for clubs who want better sessions, clearer development and more confident keepers.", tag: "Raise the standard" },
  { number: "04", title: "Clinics & camps", body: "High-energy, high-repetition days that challenge keepers to learn fast, compete well and enjoy the work.", tag: "Make it memorable" },
];

const journey = [
  { icon: Target, title: "See the player", body: "We start with where the goalkeeper is today — their habits, confidence and ambitions." },
  { icon: Shield, title: "Build the toolkit", body: "Sessions blend technique, movement, decision-making and the bravery to try again." },
  { icon: Sparkles, title: "Grow the person", body: "The goal is a player who communicates, competes and believes in the next moment." },
];

export default function Home() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-image-wrap"><img src={heroImage} alt="Young goalkeeper making a diving save during training" className="hero-image" /></div>
        <div className="hero-overlay" />
        <div className="hero-grain" />
        <div className="container relative z-10 flex min-h-[calc(100vh-78px)] flex-col justify-between py-12 lg:py-16">
          <div className="flex items-start justify-between">
            <p className="eyebrow text-white/65">South-East Ireland · GK development</p>
            <div className="hidden items-center gap-3 text-right text-xs uppercase tracking-[0.2em] text-white/55 sm:flex">
              <span className="h-px w-10 bg-white/40" />
              <span>Est. 2023</span>
            </div>
          </div>
          <div className="max-w-4xl pb-5 pt-20 lg:pb-12">
            <p className="eyebrow mb-5 text-coral">Train · Believe · Inspire</p>
            <h1 className="max-w-4xl font-display text-[clamp(3.5rem,9vw,8.2rem)] font-semibold leading-[.88] tracking-[-.065em] text-white">
              Let’s develop<br /><span className="text-coral">the next</span><br />generation.
            </h1>
            <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-md text-base leading-7 text-white/70 sm:text-lg">Specialist goalkeeper coaching for boys and girls of all ages and ability levels — from first steps in goal to the next level.</p>
              <Link href="/contact" className="button button-coral w-fit">Start the journey <ArrowUpRight size={17} /></Link>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/20 pt-5 text-xs uppercase tracking-[0.2em] text-white/50">
            <span>Every save is part of the story.</span>
            <a href="#coaching" className="inline-flex items-center gap-2 text-white transition-colors hover:text-coral">Scroll to explore <ArrowDownRight size={15} /></a>
          </div>
        </div>
      </section>

      <section className="marquee-strip"><div className="marquee-track"><span>Train with purpose</span><i>✳</i><span>Believe in the work</span><i>✳</i><span>Inspire the next save</span><i>✳</i><span>Train with purpose</span><i>✳</i><span>Believe in the work</span><i>✳</i></div></section>

      <section id="coaching" className="section-pad bg-paper">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
            <div>
              <p className="eyebrow text-coral">The Inspire approach</p>
              <h2 className="section-title mt-5">More than<br /><em>just</em> saves.</h2>
            </div>
            <div className="max-w-2xl lg:pt-10">
              <p className="lead-copy">Goalkeeping is a unique position. It asks for technical detail, quick decisions, communication and the confidence to own the next moment.</p>
              <p className="mt-6 text-base leading-7 text-ink/60">At Inspire Goalkeeping, every session is built to help young players grow their toolkit and their belief. We create an environment where mistakes are information, effort is visible and progress feels personal.</p>
              <Link href="/about" className="text-link mt-8">How we coach <ArrowUpRight size={16} /></Link>
            </div>
          </div>
          <div className="mt-16 grid gap-5 sm:grid-cols-3">
            {journey.map((item, index) => {
              const Icon = item.icon;
              return <div key={item.title} className="soft-card group" style={{ animationDelay: `${index * 80}ms` }}><div className="flex items-start justify-between"><Icon className="text-coral" size={26} strokeWidth={1.5} /><span className="font-mono text-xs text-ink/35">0{index + 1}</span></div><h3 className="mt-14 font-display text-2xl font-semibold tracking-tight">{item.title}</h3><p className="mt-3 text-sm leading-6 text-ink/55">{item.body}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-sand">
        <div className="container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="eyebrow text-coral">What we offer</p><h2 className="section-title mt-5">Coaching<br /><em>that meets</em> you there.</h2></div><Link href="/coaching" className="text-link mb-2">View all coaching <ArrowUpRight size={16} /></Link></div>
          <div className="mt-14 grid gap-3">
            {services.map((service) => <Link key={service.number} href="/coaching" className="service-row group"><span className="font-mono text-xs text-coral">{service.number}</span><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-coral sm:text-3xl">{service.title}</h3><span className="w-fit rounded-full border border-ink/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink/45">{service.tag}</span></div><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">{service.body}</p></div><ChevronRight className="shrink-0 text-ink/35 transition-all group-hover:translate-x-1 group-hover:text-coral" size={22} /></Link>)}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
            <div className="image-frame image-frame-tall"><img src={trainingImage} alt="Goalkeepers working through a reaction drill" /><div className="image-stamp">Develop<br />with intent</div></div>
            <div className="lg:pl-4"><p className="eyebrow text-coral">For players & families</p><h2 className="section-title mt-5">Find your<br /><em>next</em> save.</h2><p className="mt-7 max-w-md text-base leading-7 text-ink/60">Whether your child is new to goalkeeping, playing occasionally, pushing for a starting place or preparing for trials, there is a place to start.</p><ul className="mt-8 grid gap-4 text-sm text-ink/70"><li className="flex items-center gap-3"><Check size={17} className="text-coral" /> New to goalkeeping</li><li className="flex items-center gap-3"><Check size={17} className="text-coral" /> Looking to improve a specific area</li><li className="flex items-center gap-3"><Check size={17} className="text-coral" /> Preparing for trials or the next level</li></ul><Link href="/contact" className="button button-dark mt-10">Talk to Inspire <ArrowUpRight size={16} /></Link></div>
          </div>
        </div>
      </section>

      <section className="quote-section"><div className="container relative z-10 grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center"><div className="image-frame image-frame-portrait"><img src={coachImage} alt="Inspire Goalkeeping coach standing beside a goal" /></div><div className="lg:pl-10"><Quote className="text-coral" size={42} strokeWidth={1.4} /><blockquote className="mt-7 max-w-3xl font-display text-[clamp(2.4rem,5vw,4.8rem)] font-medium leading-[.98] tracking-[-.045em] text-white">“Every save, every mistake, every training session — it’s all part of their journey.”</blockquote><p className="mt-8 text-xs uppercase tracking-[0.2em] text-white/45">The Inspire mindset</p></div></div></section>

      <section className="cta-section"><div className="container relative z-10"><div className="max-w-3xl"><p className="eyebrow text-coral">Ready when you are</p><h2 className="mt-5 font-display text-[clamp(3.5rem,8vw,7.5rem)] font-semibold leading-[.88] tracking-[-.06em] text-white">Own the<br /><span className="text-coral">next</span> moment.</h2><div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center"><Link href="/contact" className="button button-coral w-fit">Get in touch <ArrowUpRight size={17} /></Link><span className="text-sm text-white/55">South-East Ireland · All ages & abilities</span></div></div><div className="absolute bottom-8 right-7 hidden max-w-[170px] text-right font-display text-xl italic leading-tight text-white/30 lg:block">The next save starts with the next step.</div></div></section>
    </>
  );
}
