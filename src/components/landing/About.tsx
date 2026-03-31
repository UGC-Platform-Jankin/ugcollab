import { motion } from "framer-motion";
import { Globe, Users, Zap } from "lucide-react";

const values = [
  {
    icon: Globe,
    title: "Two Markets, One Platform",
    description: "Built for the unique dynamics of Hong Kong and London, two cities where UGC demand is growing fast but no dominant platform exists.",
  },
  {
    icon: Users,
    title: "Creator-First Approach",
    description: "We believe great content starts with happy creators. Fair pay, clear briefs, and structured feedback are at the core of everything we build.",
  },
  {
    icon: Zap,
    title: "Built from Experience",
    description: "UGC Zone was born from running real UGC campaigns. We know the pain points because we've lived them — and we built the solution.",
  },
];

const About = () => {
  return (
    <section id="about" className="py-32 relative">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">About Us</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            The team behind <span className="text-gradient">UGC Zone</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            We're a small team with deep experience in UGC campaigns, influencer marketing, and product development. UGC Zone exists because we couldn't find a platform that truly served both brands and creators.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {values.map((value, i) => (
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
  );
};

export default About;
