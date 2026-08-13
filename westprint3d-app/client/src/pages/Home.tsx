import { Globe, ChevronRight, MessageCircle, Zap, Package, Cog, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import heroImg from "@/assets/hero.webp";
import plantersImg from "@/assets/planters.webp";
import workshopImg from "@/assets/workshop.webp";
import deskImg from "@/assets/desk.webp";

/**
 * WestPrint3D Landing Page
 * Design: Dark maker aesthetic with neon lime-green accents
 * 
 * Features:
 * - Dark background with electric lime accent color
 * - Split primary action (Shop / Custom Quote)
 * - Product showcase with asymmetric grid
 * - Premium micro-interactions and smooth scrolling
 * - Persistent WhatsApp button
 */

function SectionWithAnimation({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollAnimation() as React.RefObject<HTMLDivElement>;
  return (
    <div ref={ref} className={`opacity-0 ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-[#1A1A1A] shadow-lg">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[#CCFF00]">WestPrint3D</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-8 text-sm">
              <a href="#products" className="text-gray-400 hover:text-[#CCFF00] transition-colors duration-300 font-medium">
                Products
              </a>
              <a href="#how-it-works" className="text-gray-400 hover:text-[#CCFF00] transition-colors duration-300 font-medium">
                How It Works
              </a>
              <a href="#quote" className="text-gray-400 hover:text-[#CCFF00] transition-colors duration-300 font-medium">
                Custom Quote
              </a>
            </nav>

            <button className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] hover:bg-[#CCFF00] text-[#CCFF00] hover:text-black rounded-full transition-all duration-300 text-xs font-semibold tracking-wide group">
              <Globe className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>EN</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative h-screen md:h-[700px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImg}')`,
          }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

        <div className="relative h-full flex flex-col justify-center px-4 md:px-12 lg:px-20 animate-fadeIn">
          <div className="max-w-2xl">
            <p className="text-[#CCFF00] text-xs md:text-sm font-outfit mb-6 tracking-widest uppercase font-semibold">
              ⚡ 3D Printed Precision
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Lightboxes.
              <br />
              <span className="text-[#CCFF00]">Organisers.</span>
              <br />
              <span className="text-white">Custom Prints.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl font-outfit mb-10 max-w-xl leading-relaxed">
              3D printed lightboxes, household items and workshop organisers — ready to buy or made to order. Precision crafted for makers.
            </p>
            
            {/* Dual CTA */}
            <div className="flex flex-col md:flex-row gap-4">
              <button className="px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-3 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base md:text-lg bg-[#CCFF00] text-black hover:bg-white">
                Shop Ready-Made
                <ChevronRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-3 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base md:text-lg border-2 border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00] hover:text-black">
                Request a Quote
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-12 md:left-20 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#CCFF00] rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-[#CCFF00] rounded-full" />
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS SECTION ===== */}
      <section id="products" className="py-24 md:py-40 bg-[#0A0A0A] relative overflow-hidden scroll-mt-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CCFF00]/5 rounded-full blur-3xl -z-10" />

        <div className="container">
          <SectionWithAnimation className="mb-20">
            <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-3 font-outfit">
              ✦ Product Range
            </p>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Precision 3D Prints
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl font-outfit leading-relaxed">
              From luminous lightboxes to workshop organisation — each piece is designed for function and crafted for durability.
            </p>
          </SectionWithAnimation>

          {/* Product Grid - Asymmetric */}
          <div className="grid md:grid-cols-12 gap-8">
            {/* Lightboxes - Large */}
            <SectionWithAnimation className="md:col-span-7 stagger-1">
              <div className="group bg-[#1A1A1A] rounded-xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all duration-300 transform hover:-translate-y-3 border border-[#2A2A2A] hover:border-[#CCFF00]">
                <div
                  className="h-64 md:h-80 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${heroImg}')`,
                  }}
                />
                <div className="p-8">
                  <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-2 font-outfit">
                    Lightboxes
                  </p>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Neon Art Displays
                  </h3>
                  <p className="text-gray-400 leading-relaxed mb-6 font-outfit">
                    Custom-designed lightboxes with precision-cut acrylic panels. Perfect for gaming setups, home decor, or brand displays.
                  </p>
                  <div className="flex items-center text-[#CCFF00] text-sm font-semibold cursor-pointer hover:gap-2 transition-all font-outfit">
                    Explore <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </SectionWithAnimation>

            {/* Household - Medium */}
            <SectionWithAnimation className="md:col-span-5 stagger-2">
              <div className="group bg-[#1A1A1A] rounded-xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all duration-300 transform hover:-translate-y-3 border border-[#2A2A2A] hover:border-[#CCFF00]">
                <div
                  className="h-48 md:h-64 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${plantersImg}')`,
                  }}
                />
                <div className="p-6">
                  <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-2 font-outfit">
                    Household Items
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Planters & Decor
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 font-outfit">
                    Geometric planters and home accessories with modern design.
                  </p>
                  <div className="flex items-center text-[#CCFF00] text-sm font-semibold cursor-pointer hover:gap-2 transition-all font-outfit">
                    Browse <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </SectionWithAnimation>

            {/* Workshop - Medium */}
            <SectionWithAnimation className="md:col-span-5 stagger-3">
              <div className="group bg-[#1A1A1A] rounded-xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all duration-300 transform hover:-translate-y-3 border border-[#2A2A2A] hover:border-[#CCFF00]">
                <div
                  className="h-48 md:h-56 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${workshopImg}')`,
                  }}
                />
                <div className="p-6">
                  <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-2 font-outfit">
                    Workshop Organisers
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Tool Storage
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 font-outfit">
                    Modular organisers designed for precision tools and workshop efficiency.
                  </p>
                  <div className="flex items-center text-[#CCFF00] text-sm font-semibold cursor-pointer hover:gap-2 transition-all font-outfit">
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </SectionWithAnimation>

            {/* Desk Organisers - Large */}
            <SectionWithAnimation className="md:col-span-7 stagger-4">
              <div className="group bg-[#1A1A1A] rounded-xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] transition-all duration-300 transform hover:-translate-y-3 border border-[#2A2A2A] hover:border-[#CCFF00]">
                <div
                  className="h-48 md:h-64 bg-cover bg-center"
                  style={{
                    backgroundImage: `url('${deskImg}')`,
                  }}
                />
                <div className="p-6">
                  <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-2 font-outfit">
                    Desk Accessories
                  </p>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Cable & Device Management
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4 font-outfit">
                    Keep your workspace organised with custom desk organisers and cable management solutions.
                  </p>
                  <div className="flex items-center text-[#CCFF00] text-sm font-semibold cursor-pointer hover:gap-2 transition-all font-outfit">
                    Discover <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </SectionWithAnimation>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-24 md:py-40 bg-[#1A1A1A] relative overflow-hidden scroll-mt-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#CCFF00]/3 rounded-full blur-3xl -z-10" />

        <div className="container">
          <SectionWithAnimation className="mb-20">
            <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-3 font-outfit">
              ✦ Process
            </p>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Three Steps to Your Print
            </h2>
          </SectionWithAnimation>

          <div className="space-y-16 md:space-y-24">
            {/* Step 1 */}
            <SectionWithAnimation className="stagger-1">
              <div className="flex flex-col md:flex-row items-start gap-8 md:gap-16">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#CCFF00] to-[#99CC00] rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110">
                    <Package className="w-12 h-12 text-black" />
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Browse or Request
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-lg font-outfit">
                    Choose from our ready-made collection or describe your custom project. We handle everything from concept to delivery.
                  </p>
                </div>
              </div>
            </SectionWithAnimation>

            <div className="hidden md:block h-12 w-1 bg-gradient-to-b from-[#CCFF00] to-[#99CC00] ml-12" />

            {/* Step 2 */}
            <SectionWithAnimation className="stagger-2">
              <div className="flex flex-col md:flex-row-reverse items-start gap-8 md:gap-16">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#99CC00] to-[#66AA00] rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110">
                    <Zap className="w-12 h-12 text-black" />
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    We Print & Inspect
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-lg font-outfit">
                    High-precision 3D printing with rigorous quality control. Every piece is inspected before it ships.
                  </p>
                </div>
              </div>
            </SectionWithAnimation>

            <div className="hidden md:block h-12 w-1 bg-gradient-to-b from-[#99CC00] to-[#CCFF00] ml-12" />

            {/* Step 3 */}
            <SectionWithAnimation className="stagger-3">
              <div className="flex flex-col md:flex-row items-start gap-8 md:gap-16">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#CCFF00] to-[#99CC00] rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110">
                    <Cog className="w-12 h-12 text-black" />
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Ship & Enjoy
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-lg font-outfit">
                    Fast, reliable shipping. Your print arrives ready to use—no assembly required.
                  </p>
                </div>
              </div>
            </SectionWithAnimation>
          </div>
        </div>
      </section>

      {/* ===== QUOTE TEASER ===== */}
      <section id="quote" className="py-24 md:py-40 bg-[#0A0A0A] relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#CCFF00]/8 via-transparent to-[#99CC00]/8 -z-10" />

        <div className="container">
          <div className="max-w-4xl mx-auto">
            <SectionWithAnimation className="text-center">
              <p className="text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-4 font-outfit">
                ✦ Custom Orders Welcome
              </p>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Have an Idea?
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto font-outfit leading-relaxed mb-10">
                We specialise in custom 3D printed items. Describe what you need, share reference images or files, and we'll provide a quote within 24 hours.
              </p>

              <button className="px-8 py-4 rounded-lg font-semibold inline-flex items-center gap-3 hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base md:text-lg bg-[#CCFF00] text-black hover:bg-white">
                Request a Custom Quote
                <ChevronRight className="w-5 h-5" />
              </button>
            </SectionWithAnimation>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#000000] text-gray-400 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#CCFF00]/3 rounded-full blur-3xl -z-10" />

        <div className="container">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <h4 className="text-[#CCFF00] font-bold mb-6 text-lg">WestPrint3D</h4>
              <p className="text-sm leading-relaxed">
                Precision 3D printing for makers, builders, and creators. Ready-made items and custom orders.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Shop</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Lightboxes</a></li>
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Household Items</a></li>
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Workshop Organisers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">About Us</a></li>
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Contact</a></li>
                <li><a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Privacy Policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Connect</h4>
              <p className="text-sm mb-4">Questions? Reach out on WhatsApp</p>
              <button className="w-full px-4 py-2 bg-[#CCFF00] text-black font-semibold rounded-lg hover:bg-white transition-all duration-300">
                WhatsApp Us
              </button>
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-8 flex flex-col md:flex-row items-center justify-between text-sm">
            <p>&copy; 2026 WestPrint3D. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Instagram</a>
              <a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">Twitter</a>
              <a href="#" className="hover:text-[#CCFF00] transition-colors duration-300">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== SCROLL TO TOP ===== */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 bg-[#CCFF00] text-black p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 transform hover:scale-110 animate-fadeIn"
          title="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ===== PERSISTENT WHATSAPP BUTTON ===== */}
      <button
        className="fixed bottom-8 left-8 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20BA58] transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
