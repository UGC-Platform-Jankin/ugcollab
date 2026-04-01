import { motion, useInView } from "framer-motion";
import { Megaphone, Users, CheckCircle, CreditCard } from "lucide-react";
import { useRef } from "react";

const steps = [
  {
    icon: Megaphone,
    title: "Launch Campaign",
    description: "Set your brief, budget and deliverables. Your campaign goes live in minutes.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: Users,
    title: "Match Creators",
    description: "Discover and invite creators that align with your brand and audience.",
    color: "from-accent/20 to-accent/5",
  },
  {
    icon: CheckCircle,
    title: "Review & Approve",
    description: "Review submissions, leave feedback and approve content with revision tracking.",
    color: "from-primary/20 to-primary/5",
  },
  {
    icon: CreditCard,
    title: "Pay & Publish",
    description: "Approved content triggers secure payment. Ready to post, tracked end-to-end.",
    color: "from-accent/20 to-accent/5",
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

      <div className="container relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">How It Works</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold">
            From brief to <span className="text-gradient">content</span> in four steps
          </h2>
        </motion.div>

        {/* Connection line */}
        <div className="hidden lg:block absolute top-[55%] left-[15%] right-[15%] h-px">
          <motion.div
            className="h-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.5 }}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="group relative rounded-2xl border border-border bg-gradient-card p-8 hover:border-primary/30 transition-all duration-300 hover:shadow-glow"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.08), transparent 70%)' }} />

              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className="mb-6 inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-coral shadow-glow"
                >
                  <step.icon className="h-6 w-6 text-primary-foreground" />
                </motion.div>

                <motion.div
                  className="text-xs font-bold text-primary mb-2 flex items-center gap-2"
                >
                  <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                    {index + 1}
                  </span>
                  Step {index + 1}
                </motion.div>

                <h3 className="text-xl font-heading font-semibold mb-3 group-hover:text-primary transition-colors">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
