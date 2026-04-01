import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Building2, ArrowRight, Users, Zap, Shield } from "lucide-react";

const benefits = [
  { icon: Users, title: "Vetted Creators", desc: "Access a pool of UGC creators with verified social stats" },
  { icon: Zap, title: "Fast Turnaround", desc: "Get authentic content delivered within your timeline" },
  { icon: Shield, title: "Managed Process", desc: "Briefs, reviews and payments handled in one place" },
];

const BrandCTA = () => {
  return (
    <section id="brands" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />

      {/* Decorative ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -right-40 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/5"
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-6">
            <Building2 className="h-4 w-4" />
            For Businesses
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            Looking for <span className="text-gradient">UGC creators</span>?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Join as a brand and get matched with talented content creators who produce authentic, engaging content for your business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="rounded-xl border border-border/50 bg-card/50 p-6 text-center hover:border-primary/30 hover:shadow-glow transition-all duration-300"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <b.icon className="h-6 w-6 text-primary" />
              </motion.div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity gap-2 text-base px-8 h-12 shadow-glow" asChild>
              <Link to="/brand/auth">
                Join as a Brand <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
          <p className="text-sm text-muted-foreground mt-3">Free to get started</p>
        </motion.div>
      </div>
    </section>
  );
};

export default BrandCTA;
