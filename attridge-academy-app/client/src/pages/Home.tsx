import { useEffect, useState } from "react";

/**
 * Attridge Academy of Irish Dance — One-Page Website
 * Design: "The Reliquary" — a sacred Irish artefact holding 68 years of dance heritage
 *
 * Two registers:
 * 1. The Artefact (hero, annals, ethos) — slow, ceremonial, mystical
 * 2. The Desk (classes, timetable, book) — plain, fast, boring on purpose
 *
 * Founded 1958 by Nancy Murphy-Attridge. Non-competitive. Cultural preservation.
 */

export default function Home() {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".scroll-reveal").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visibleElements.has(id);

  return (
    <div className="min-h-screen bg-[#0A1F17] text-[#EDE6D6] overflow-x-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Hero background with subtle overlay */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(/manus-storage/attridge-hero-background_08240650.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1F17]/30 via-[#0A1F17]/60 to-[#0A1F17]" />

        {/* Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Logo/Seal - Enhanced */}
          <div className="mb-16 animate-fade-in">
            <img
              src="/manus-storage/attridge-logo-enhanced_c2e1a7f8.png"
              alt="Attridge Academy Seal"
              className="w-56 h-56 mx-auto drop-shadow-2xl"
            />
          </div>

          {/* Headline */}
          <h1
            className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
            style={{ fontFamily: "Cormorant Garamond, serif", letterSpacing: "-0.02em" }}
          >
            Some hear it at seven.
            <br />
            Some at fifty-seven.
          </h1>

          {/* Subheading */}
          <p
            className="text-xl md:text-2xl mb-12 text-[#EDE6D6]/95 leading-relaxed"
            style={{ fontFamily: "Source Serif 4, serif" }}
          >
            Irish dance in Cork since 1958. Not for medals — for the love of it.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary px-8 py-3 text-lg">
              See class times
            </button>
            <button className="btn-secondary px-8 py-3 text-lg">
              Our story since 1958
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-[#C9A227]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      {/* ===== MISSION SECTION ===== */}
      <section className="py-32 px-4 bg-[#143A2A] border-t-4 border-[#C9A227]">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl md:text-5xl mb-8"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              letterSpacing: "-0.02em",
            }}
          >
            A Calling, Not a Competition
          </h2>
          <p
            id="ethos"
            className={`text-xl md:text-2xl leading-relaxed scroll-reveal ${
              isVisible("ethos") ? "visible" : ""
            }`}
            style={{ fontFamily: "Source Serif 4, serif" }}
          >
            We teach the dance as it was handed to us, and the reason to keep it. 
            This is about preserving something precious — Irish culture, tradition, 
            the spiritual connection that makes dance real. We're not chasing trophies 
            or rankings. We're keeping the flame alive for those who feel drawn to it.
          </p>
          <p
            className="text-lg md:text-xl mt-8 text-[#C9A227] italic"
            style={{ fontFamily: "Source Serif 4, serif" }}
          >
            "Proud of our past. Promoting our future."
          </p>
        </div>
      </section>

      {/* ===== ABOUT NIAMHMARIE SECTION ===== */}
      <section className="py-32 px-4 bg-[#0A1F17]">
        <div className="max-w-4xl mx-auto">
          <div
            id="about-niamhmarie"
            className={`scroll-reveal border-2 border-[#3A1B57] p-12 bg-[#143A2A]/50 ${
              isVisible("about-niamhmarie") ? "visible" : ""
            }`}
          >
            <h2
              className="text-4xl md:text-5xl mb-8"
              style={{
                fontFamily: "Cormorant Garamond, serif",
                letterSpacing: "-0.02em",
              }}
            >
              Niamhmarie Murphy
            </h2>
            <p
              className="text-lg leading-relaxed mb-6"
              style={{ fontFamily: "Source Serif 4, serif" }}
            >
              <span className="text-[#C9A227] font-semibold">T.C.R.G. • T.T.C.T.</span>
            </p>
            <p
              className="text-lg leading-relaxed mb-6"
              style={{ fontFamily: "Source Serif 4, serif" }}
            >
              Niamhmarie now directs the Academy, carrying forward the vision her 
              mother Nancy established in 1958. She teaches across Cork city — in 10 
              primary schools and in private classes ranging from beginner to advanced, 
              plus adult-only sessions for those who want to reconnect with the dance.
            </p>
            <p
              className="text-lg leading-relaxed mb-6 italic text-[#EDE6D6]/90"
              style={{ fontFamily: "Source Serif 4, serif" }}
            >
              "What we offer is not something people buy. It's more like a calling — 
              they feel pulled to it. Our job is simply to be visible, like a beacon, 
              for those who hear that call."
            </p>
            <p
              className="text-lg leading-relaxed"
              style={{ fontFamily: "Source Serif 4, serif" }}
            >
              The Academy remains non-competitive, focused on cultural preservation 
              and the joy of dance itself. Performances at festivals, cruise liners, 
              and international events keep the tradition alive and traveling.
            </p>
            <div className="mt-8 pt-8 border-t border-[#3A1B57]">
              <p
                className="text-base text-[#EDE6D6]/80"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <span className="font-semibold">Contact:</span> 086 355 7288
              </p>
              <p
                className="text-base text-[#EDE6D6]/80"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <span className="font-semibold">Email:</span> info@attridgeacademy.ie
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THREE DOORS SECTION ===== */}
      <section className="py-32 px-4 bg-[#143A2A] border-t-4 border-[#C9A227]">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-5xl md:text-6xl text-center mb-20"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              letterSpacing: "-0.02em",
            }}
          >
            Where to Begin
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Children */}
            <div
              id="door-children"
              className={`scroll-reveal border-2 border-[#3A1B57] p-8 bg-[#0A1F17]/40 hover:bg-[#0A1F17]/70 transition-all duration-300 ${
                isVisible("door-children") ? "visible" : ""
              }`}
            >
              <div className="relative h-48 mb-6 overflow-hidden rounded">
                <img
                  src="/manus-storage/attridge-dancers-group_9b96f08f.png"
                  alt="Children's classes"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3
                className="text-3xl mb-4"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  letterSpacing: "-0.02em",
                }}
              >
                Children
              </h3>
              <p className="text-base mb-6 leading-relaxed text-[#EDE6D6]/90">
                After-school classes across Cork city. Beginner to advanced levels. 
                Classes at Scoil Niocláis Hall, Eglantine School Hall, and P.A.C.E. 
                Centre in Passage West.
              </p>
              <button className="link-gold text-sm font-semibold">
                Learn more →
              </button>
            </div>

            {/* Adults */}
            <div
              id="door-adults"
              className={`scroll-reveal border-2 border-[#3A1B57] p-8 bg-[#0A1F17]/40 hover:bg-[#0A1F17]/70 transition-all duration-300 ${
                isVisible("door-adults") ? "visible" : ""
              }`}
            >
              <div className="relative h-48 mb-6 overflow-hidden rounded">
                <img
                  src="/manus-storage/attridge-cultural-moment_cf7b426f.png"
                  alt="Adults' classes"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3
                className="text-3xl mb-4"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  letterSpacing: "-0.02em",
                }}
              >
                Adults
              </h3>
              <p className="text-base mb-6 leading-relaxed text-[#EDE6D6]/90">
                Adults-only classes for those who want to reconnect with the dance. 
                No judgment, no pressure. Many in the room started just last term. 
                It's never too late to answer the call.
              </p>
              <button className="link-gold text-sm font-semibold">
                Learn more →
              </button>
            </div>

            {/* Schools */}
            <div
              id="door-schools"
              className={`scroll-reveal border-2 border-[#3A1B57] p-8 bg-[#0A1F17]/40 hover:bg-[#0A1F17]/70 transition-all duration-300 ${
                isVisible("door-schools") ? "visible" : ""
              }`}
            >
              <div className="relative h-48 mb-6 overflow-hidden rounded">
                <img
                  src="/manus-storage/attridge-tradition-detail_6edde1fd.png"
                  alt="School programmes"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3
                className="text-3xl mb-4"
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  letterSpacing: "-0.02em",
                }}
              >
                Schools
              </h3>
              <p className="text-base mb-6 leading-relaxed text-[#EDE6D6]/90">
                Teaching Irish dance in 10 Cork primary schools. Curriculum-linked 
                programmes bringing cultural heritage and tradition to the next generation.
              </p>
              <button className="link-gold text-sm font-semibold">
                Learn more →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ANNALS SECTION ===== */}
      <section className="py-32 px-4 bg-[#0A1F17]">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-5xl md:text-6xl text-center mb-20"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              letterSpacing: "-0.02em",
            }}
          >
            The Annals
          </h2>

          <div className="space-y-16">
            {/* Timeline entry: 1958 */}
            <div
              id="annals-1958"
              className={`scroll-reveal flex gap-8 items-start ${
                isVisible("annals-1958") ? "visible" : ""
              }`}
            >
              <div className="w-32 flex-shrink-0">
                <div
                  className="text-[#C9A227] text-4xl font-bold"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  1958
                </div>
              </div>
              <div className="flex-1 border-l-4 border-[#5B2A86] pl-8 pb-8">
                <p
                  className="text-xl leading-relaxed"
                  style={{ fontFamily: "Source Serif 4, serif" }}
                >
                  Nancy Murphy-Attridge founds the Academy in Cork. The longest 
                  established Irish dance school in Cork City begins its mission to 
                  preserve and promote Irish culture through dance.
                </p>
              </div>
            </div>

            {/* Timeline entry: Decades of Growth */}
            <div
              id="annals-growth"
              className={`scroll-reveal flex gap-8 items-start ${
                isVisible("annals-growth") ? "visible" : ""
              }`}
            >
              <div className="w-32 flex-shrink-0">
                <div
                  className="text-[#C9A227] text-4xl font-bold"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Decades
                </div>
              </div>
              <div className="flex-1 border-l-4 border-[#5B2A86] pl-8 pb-8">
                <p
                  className="text-xl leading-relaxed"
                  style={{ fontFamily: "Source Serif 4, serif" }}
                >
                  The Academy grows across Cork, teaching students of all ages. 
                  Performances at festivals, events, and cruise liners. The tradition 
                  is carried forward with each generation.
                </p>
              </div>
            </div>

            {/* Timeline entry: International */}
            <div
              id="annals-international"
              className={`scroll-reveal flex gap-8 items-start ${
                isVisible("annals-international") ? "visible" : ""
              }`}
            >
              <div className="w-32 flex-shrink-0">
                <div
                  className="text-[#C9A227] text-4xl font-bold"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Abroad
                </div>
              </div>
              <div className="flex-1 border-l-4 border-[#5B2A86] pl-8 pb-8">
                <p
                  className="text-xl leading-relaxed"
                  style={{ fontFamily: "Source Serif 4, serif" }}
                >
                  The Academy travels the world, sharing Irish culture and heritage 
                  at international festivals. Malta becomes a beloved destination, 
                  visited three times and counting.
                </p>
              </div>
            </div>

            {/* Timeline entry: Today */}
            <div
              id="annals-today"
              className={`scroll-reveal flex gap-8 items-start ${
                isVisible("annals-today") ? "visible" : ""
              }`}
            >
              <div className="w-32 flex-shrink-0">
                <div
                  className="text-[#C9A227] text-4xl font-bold"
                  style={{ fontFamily: "Cormorant Garamond, serif" }}
                >
                  Today
                </div>
              </div>
              <div className="flex-1 border-l-4 border-[#5B2A86] pl-8 pb-8">
                <p
                  className="text-xl leading-relaxed"
                  style={{ fontFamily: "Source Serif 4, serif" }}
                >
                  Niamhmarie directs the Academy, teaching in 10 Cork primary schools 
                  and private classes. Nancy, now 94, remains part of the story. 
                  The dance continues, unchanged in its essence, a beacon for those 
                  who hear the call.
                </p>
              </div>
            </div>

            {/* CTA to full annals */}
            <div className="text-center pt-8">
              <button className="btn-primary px-8 py-3 text-lg">
                Always an Attridge
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MALTA SECTION ===== */}
      <section className="py-32 px-4 bg-[#143A2A] border-t-4 border-[#C9A227]">
        <div className="max-w-5xl mx-auto">
          <div
            id="malta"
            className={`scroll-reveal relative rounded overflow-hidden ${
              isVisible("malta") ? "visible" : ""
            }`}
          >
            <img
              src="/manus-storage/attridge-hero-background_08240650.png"
              alt="Malta performance"
              className="w-full h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1F17] via-[#0A1F17]/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-12">
              <p
                className="text-3xl md:text-4xl leading-relaxed"
                style={{ fontFamily: "Source Serif 4, serif" }}
              >
                We've carried it to Malta three times. We're going back in October 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CALL TO ACTION SECTION ===== */}
      <section className="py-32 px-4 bg-[#0A1F17]">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-5xl md:text-6xl mb-8"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              letterSpacing: "-0.02em",
            }}
          >
            Always an Attridge
          </h2>
          <p
            className="text-xl md:text-2xl mb-12 leading-relaxed text-[#EDE6D6]/90"
            style={{ fontFamily: "Source Serif 4, serif" }}
          >
            Whether you danced with us years ago or you're hearing the call for the 
            first time, there's a place for you here. This is not something people 
            plan for. It's something they feel drawn to.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary px-8 py-3 text-lg">
              Book a class now
            </button>
            <button className="btn-secondary px-8 py-3 text-lg">
              Get in touch
            </button>
          </div>
        </div>
      </section>

      {/* ===== PRACTICAL BAND ===== */}
      <section
        className="sticky bottom-0 bg-[#143A2A] border-t-4 border-[#C9A227] py-6 px-4 z-50 shadow-2xl"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-sm">
            <p className="text-[#C9A227] font-bold text-base">
              Ready to dance?
            </p>
            <p className="text-[#EDE6D6]">Classes available now</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary text-sm px-6 py-2">
              See class times
            </button>
            <button className="btn-secondary text-sm px-6 py-2">
              Book a place
            </button>
          </div>
          <div className="text-right text-sm">
            <p className="text-[#EDE6D6] text-xs">Questions?</p>
            <a
              href="tel:+353863557288"
              className="text-[#C9A227] hover:text-[#EDE6D6] transition-colors font-semibold"
            >
              086 355 7288
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        className="bg-[#0A1F17] border-t-4 border-[#3A1B57] py-20 px-4"
        style={{ fontFamily: "Source Serif 4, serif" }}
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h4
              className="text-2xl font-bold mb-4"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Attridge Academy
            </h4>
            <p className="text-[#EDE6D6]/80">Cork, Ireland</p>
            <p className="text-[#EDE6D6]/80">Est. 1958</p>
            <p className="mt-6 text-[#C9A227] font-semibold text-lg">
              Always an Attridge
            </p>
          </div>
          <div>
            <h4
              className="text-xl font-bold mb-4"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="tel:+353863557288"
                  className="link-gold text-sm"
                >
                  086 355 7288
                </a>
              </li>
              <li>
                <a href="mailto:info@attridgeacademy.ie" className="link-gold text-sm">
                  info@attridgeacademy.ie
                </a>
              </li>
              <li>
                <a href="#" className="link-gold text-sm">
                  Facebook
                </a>
              </li>
              <li>
                <a href="#" className="link-gold text-sm">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className="text-xl font-bold mb-4"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Class Locations
            </h4>
            <ul className="space-y-3 text-sm text-[#EDE6D6]/80">
              <li>Scoil Niocláis Hall</li>
              <li>Eglantine School Hall</li>
              <li>P.A.C.E. Centre, Passage West</li>
              <li>10 Cork Primary Schools</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-12 border-t border-[#3A1B57] text-center text-xs text-[#EDE6D6]/50">
          <p>
            &copy; 2026 Attridge Academy of Irish Dance. All rights reserved.
          </p>
          <p className="mt-2">Proud of our past. Promoting our future.</p>
        </div>
      </footer>
    </div>
  );
}
