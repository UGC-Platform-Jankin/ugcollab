import { motion } from "framer-motion";
import { Check, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "No monthly fees or subscriptions",
  "Only pay when campaigns are completed",
  "Full platform access from day one",
  "Secure escrow-style payments",
  "Transparent fee breakdown on every transaction",
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-32 relative">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Simple <span className="text-gradient">commission</span> model
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            No subscriptions. No upfront costs. We only earn when your campaign succeeds.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border bg-gradient-card p-10 md:p-14 text-center"
        >
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 mb-6">
            <Percent className="h-7 w-7 text-primary" />
          </div>

          <p className="text-6xl md:text-7xl font-heading font-bold text-gradient mb-2">15–25%</p>
          <p className="text-muted-foreground text-lg mb-10">commission per completed campaign</p>

          <div className="text-left max-w-sm mx-auto space-y-4 mb-10">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>

          <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity text-base px-10 h-12 shadow-glow">
            Get Started Free
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;
