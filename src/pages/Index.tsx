import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Reviews from "@/components/landing/Reviews";
import About from "@/components/landing/About";
import Contact from "@/components/landing/Contact";
import CTA from "@/components/landing/CTA";
import BrandCTA from "@/components/landing/BrandCTA";
import Footer from "@/components/landing/Footer";
const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Reviews />
      <About />
      <Contact />
      <BrandCTA />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
