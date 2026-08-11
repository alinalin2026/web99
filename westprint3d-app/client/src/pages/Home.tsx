import FloatingContact from "@/components/FloatingContact";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import About from "@/components/sections/About";
import CustomOrder from "@/components/sections/CustomOrder";
import Gallery from "@/components/sections/Gallery";
import Hero from "@/components/sections/Hero";
import PopularPrints from "@/components/sections/PopularPrints";
import Process from "@/components/sections/Process";
import StatsBand from "@/components/sections/StatsBand";
import WhatWeMake from "@/components/sections/WhatWeMake";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        <Hero />
        <WhatWeMake />
        <PopularPrints />
        <StatsBand />
        <Process />
        <Gallery />
        <CustomOrder />
        <About />
      </main>
      <Footer />
      <FloatingContact />
    </div>
  );
}
