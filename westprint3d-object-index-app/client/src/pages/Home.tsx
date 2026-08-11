/**
 * OBJECT INDEX DESIGN NOTE: This page acts like a bright catalogue in motion.
 * Warm paper, Index Blue, clipped-corner panels, index dots, and strict editorial rules guide the layout.
 */
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Menu, MoveRight, Plus, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import collectionImg from "@/assets/object-index-collection.webp";
import heroImg from "@/assets/object-index-hero.webp";
import studioImg from "@/assets/object-index-studio.webp";
import detailImg from "@/assets/object-index-detail.webp";

const collections = [
  { id: "A01", title: "For the landing zone", tone: "coral", image: collectionImg, alt: "Bright 3D printed entryway organization system" },
  { id: "B02", title: "For a working desk", tone: "blue", image: heroImg, alt: "Colorful 3D printed desktop objects" },
  { id: "C03", title: "For tools in reach", tone: "yellow", image: studioImg, alt: "Colorful 3D printed workshop organizers" },
];

const specs = [
  ["01", "Find the friction", "A drawer that fights back, a cable that wanders, a corner that collects everything."],
  ["02", "Fit the object", "We refine the dimension, detail, color, and feel until it belongs there."],
  ["03", "Make it real", "Layer by layer, an everyday idea becomes an object you can use."],
];

function IndexDots({ className = "" }: { className?: string }) {
  return <span className={`index-dots ${className}`} aria-hidden="true"><i /><i /><i /></span>;
}

export default function Home() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <main className="index-site" id="top">
      <header className="index-header">
        <a href="#top" aria-label="WestPrint3D home"><BrandMark /></a>
        <nav className="index-nav" aria-label="Main navigation">
          <a href="#collections">Objects</a><a href="#method">The process</a><a href="#note">Our note</a>
        </nav>
        <a className="header-link" href="#contact">Make an enquiry <ArrowUpRight size={15} /></a>
        <button type="button" className="index-menu-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        {open && <div className="index-mobile-menu"><a href="#collections" onClick={closeMenu}>Objects</a><a href="#method" onClick={closeMenu}>The process</a><a href="#note" onClick={closeMenu}>Our note</a><a href="#contact" onClick={closeMenu}>Make an enquiry <ArrowUpRight size={17} /></a></div>}
      </header>

      <section className="index-hero">
        <div className="hero-ledger"><span>VOL. 01</span><span>OBJECT INDEX</span><span>2026</span></div>
        <div className="hero-title reveal-index">
          <p className="micro-label"><IndexDots /> USEFUL, BY DESIGN</p>
          <h1>The small<br />things, <em>sorted.</em></h1>
          <p className="hero-lead">WestPrint3D makes the helpful objects that give your everyday things a better place to be.</p>
          <a href="#collections" className="index-button">Browse the collection <ArrowDown size={16} /></a>
        </div>
        <div className="hero-visual reveal-index delay-1">
          <div className="object-number">01</div>
          <div className="cut-frame hero-frame"><img src={heroImg} alt="A colorful arrangement of 3D printed desktop organizing objects" /></div>
          <p className="image-caption">INDEX 01 / A BETTER PLACE FOR THE BITS OF YOUR DAY</p>
          <IndexDots className="hero-dots" />
        </div>
        <a className="hero-scroll" href="#note"><span>KEEP TURNING</span><MoveRight size={15} /></a>
      </section>

      <section className="note-section" id="note">
        <div className="folio">001</div>
        <div className="note-main reveal-index">
          <p className="micro-label">A SHORT NOTE ON USEFULNESS</p>
          <h2>We think an object earns its place when it makes the rest of the room feel <em>easier.</em></h2>
        </div>
        <div className="note-aside reveal-index delay-1"><IndexDots /><p>Printed with clear intent, good proportions, and just enough color to make you smile when you reach for it.</p></div>
      </section>

      <section className="collections-section" id="collections">
        <div className="section-topline"><span>002 / COLLECTIONS</span><span>AN EDITABLE LIBRARY OF EVERYDAY OBJECTS</span></div>
        <div className="collections-heading"><h2>Pick a corner.<br /><em>We’ll start there.</em></h2><p>Organizers, stations, trays, signs, storage—and the things we haven’t thought of yet.</p></div>
        <div className="collection-row">
          {collections.map((item, index) => (
            <article className={`collection-card ${item.tone} reveal-index`} key={item.id}>
              <div className="collection-meta"><span>{item.id}</span><span>WESTPRINT3D</span></div>
              <div className="collection-image cut-frame"><img src={item.image} alt={item.alt} loading="lazy" /></div>
              <div className="collection-info"><h3>{item.title}</h3><a href="#contact" aria-label={`Enquire about ${item.title}`}><Plus size={23} /></a></div>
              <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-title"><div className="folio">003</div><p className="micro-label"><IndexDots /> FROM IDEA TO OBJECT</p><h2>Useful is a<br /><em>good place</em> to start.</h2></div>
        <div className="method-image reveal-index"><div className="cut-frame"><img src={detailImg} alt="Macro view of a translucent lilac 3D printed object" loading="lazy" /></div><span>DETAIL STUDY / 04</span></div>
        <div className="method-steps">
          {specs.map(([number, title, description]) => <div className="method-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={18} /></div>)}
        </div>
      </section>

      <section className="manifesto-section">
        <div className="manifesto-art reveal-index"><img src={studioImg} alt="Colorful 3D printed modular tool organizers in a bright studio" loading="lazy" /><span className="art-label">WORKTABLE SERIES / 05</span></div>
        <div className="manifesto-copy"><p className="micro-label">WHAT WE’RE HERE FOR</p><h2>Less searching.<br />More <em>using.</em></h2><p className="manifesto-text">A small system can make a surprising difference. WestPrint3D exists to shape those systems into thoughtful objects you’ll want to keep around.</p><a href="#contact" className="dotted-link">Talk through an idea <ArrowUpRight size={16} /></a></div>
      </section>

      <section className="contact-section-index" id="contact">
        <div className="contact-folio">004 / YOUR OBJECT</div>
        <div className="contact-main reveal-index"><IndexDots /><h2>What needs<br />a <em>better place?</em></h2><p>Show us the space, the stuff, or the sketch. We’ll bring the object into focus.</p><a className="index-button button-coral" href="mailto:hello@westprint3d.com">Start an enquiry <ArrowUpRight size={17} /></a></div>
        <div className="contact-tab"><span>WESTPRINT</span><strong>3D</strong><div className="tab-cube"><i /><i /><i /></div></div>
      </section>

      <footer className="index-footer"><BrandMark /><span>© 2026 WESTPRINT3D</span><a href="#top">BACK TO INDEX <ArrowUpRight size={14} /></a></footer>
    </main>
  );
}
