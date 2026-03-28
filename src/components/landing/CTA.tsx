import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-coral opacity-[0.06]" />
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center py-24 px-8">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 max-w-2xl">
              Ready to transform your <span className="text-gradient">UGC workflow</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mb-10">
              Join the brands and creators already using CreatorHub to streamline campaigns across Hong Kong and London.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity gap-2 text-base px-8 h-12 shadow-glow">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base h-12 border-border text-foreground hover:bg-secondary">
                Talk to Sales
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
