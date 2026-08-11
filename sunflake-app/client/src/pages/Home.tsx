import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import QuizSection from "@/components/sections/QuizSection";
import TravelStories from "@/components/sections/TravelStories";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <QuizSection />
        <TravelStories />
      </main>
      <Footer />
    </div>
  );
}
