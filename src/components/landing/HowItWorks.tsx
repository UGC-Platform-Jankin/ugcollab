import { motion } from "framer-motion";
import { Megaphone, Users, CheckCircle, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Megaphone,
    title: "Launch Campaign",
    description: "Set your brief, budget and deliverables. Your campaign goes live in minutes.",
  },
  {
    icon: Users,
    title: "Match Creators",
    description: "Discover and invite creators that align with your brand and audience.",
  },
  {
    icon: CheckCircle,
    title: "Review & Approve",
    description: "Review submissions, leave feedback and approve content with revision tracking.",
  },
  {
    icon: CreditCard,
    title: "Pay & Publish",
    description: "Approved content triggers secure payment. Ready to post, tracked end-to-end.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-32 relative">
      <div className="container">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-2xl border border-border bg-gradient-card p-8 hover:border-primary/30 transition-colors"
            >
              <div className="mb-6 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-coral">
                <step.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Step {index + 1}</p>
              <h3 className="text-xl font-heading font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
