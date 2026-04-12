import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-32">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-border overflow-hidden"
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 bg-gradient-coral opacity-[0.06]"
            animate={{ opacity: [0.04, 0.08, 0.04] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            animate={{ x: ["-20%", "20%"], y: ["-10%", "10%"] }}
            transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          />
          <motion.div
            animate={{ x: ["20%", "-20%"], y: ["10%", "-10%"] }}
            transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl"
          />

          {/* Floating sparkles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ left: `${20 + i * 20}%`, top: `${15 + (i % 2) * 50}%` }}
              animate={{ y: [0, -15, 0], rotate: [0, 180, 360], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
            >
              <Sparkles className="h-4 w-4 text-primary/30" />
            </motion.div>
          ))}

          <div className="relative z-10 flex flex-col items-center text-center py-24 px-8">
            <motion.h2
              className="text-4xl md:text-5xl font-heading font-bold mb-6 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Ready to transform your <span className="text-gradient">UGC workflow</span>?
            </motion.h2>
            <p className="text-lg text-muted-foreground max-w-lg mb-10">
              Join the brands and creators already using UGCollab to streamline campaigns across Hong Kong and London.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity gap-2 text-base px-8 h-12 shadow-glow" asChild>
                  <Link to="/get-started">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" variant="outline" className="text-base h-12 border-border text-foreground hover:bg-secondary" asChild>
                  <a href="/#contact">Talk to Us</a>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
