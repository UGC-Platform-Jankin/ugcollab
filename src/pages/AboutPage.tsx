import { motion } from "framer-motion";
import { Instagram, ExternalLink, Globe, Users, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import founderImage from "@/assets/founder-jankin.jpg";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">About UGCollab</p>
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
              Built by a creator, <span className="text-gradient">for creators</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              UGCollab was founded to solve the problems creators and brands face every day when working together on content campaigns.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="pb-24">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-2xl overflow-hidden border border-border shadow-glow">
                <img src={founderImage} alt="Jankin Chan, Founder of UGCollab" loading="lazy" width={800} height={800} className="w-full h-auto" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div>
                <p className="text-sm font-medium text-primary mb-2 tracking-wider uppercase">Founder</p>
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-2">Jankin Chan</h2>
                <p className="text-muted-foreground">Influencer · Entrepreneur · Head of UGC Marketing</p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Jankin Chan is an influencer and entrepreneur with hands-on experience in UGC content creation and influencer marketing. As the Head of UGC Marketing, he has worked with brands across Hong Kong and London, running campaigns from brief to delivery.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                UGCollab was born from the frustration of managing campaigns across spreadsheets, scattered DMs, and manual invoicing. Jankin built this platform to give both creators and brands a single place to discover, collaborate, and get paid.
              </p>

              <div className="flex items-center gap-4 pt-2">
                <a
                  href="https://www.instagram.com/jankinchan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  @jankinchan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        <div className="container max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Our Mission</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Why we built <span className="text-gradient">UGCollab</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "Two Markets, One Platform",
                description: "Built for Hong Kong and London, two cities where UGC demand is growing fast but no dominant platform exists.",
              },
              {
                icon: Users,
                title: "Creator-First Approach",
                description: "Fair pay, clear briefs, and structured messaging. Great content starts with happy creators.",
              },
              {
                icon: Zap,
                title: "Built from Experience",
                description: "UGCollab was born from running real UGC campaigns. We know the pain points because we've lived them.",
              },
            ].map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-gradient-card p-8 text-center"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-5">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-semibold mb-3 text-foreground">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32">
        <div className="container max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-heading font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join UGCollab today as a creator or brand.
            </p>
            <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity gap-2 text-base px-8 h-12 shadow-glow" asChild>
              <Link to="/get-started">Get Started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
