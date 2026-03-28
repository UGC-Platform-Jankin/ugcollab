import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, MessageSquare, Upload, Shield, Search, Wallet,
  Layout, Star, Video, FileCheck, TrendingUp, Clock
} from "lucide-react";

const brandFeatures = [
  { icon: Layout, title: "Campaign Builder", desc: "Create campaigns with budgets, timelines and detailed briefs." },
  { icon: Search, title: "Creator Discovery", desc: "Browse, filter and compare creators by niche, reach and rates." },
  { icon: MessageSquare, title: "Direct Messaging", desc: "Communicate with creators directly inside the platform." },
  { icon: Video, title: "Content Dashboard", desc: "Review all submitted videos in one centralised dashboard." },
  { icon: FileCheck, title: "Approval Workflow", desc: "Approve, request revisions and track content versions." },
  { icon: BarChart3, title: "Performance Analytics", desc: "Track campaign ROI, engagement and content performance." },
];

const creatorFeatures = [
  { icon: Star, title: "Creator Profile", desc: "Showcase your work with integrated social media stats." },
  { icon: TrendingUp, title: "Campaign Feed", desc: "Discover paid opportunities matched to your niche." },
  { icon: Upload, title: "Easy Uploads", desc: "Submit content with a streamlined upload experience." },
  { icon: Clock, title: "Status Tracking", desc: "See real-time approval status and revision requests." },
  { icon: Shield, title: "Secure Payments", desc: "Get paid reliably when your content is approved." },
  { icon: Wallet, title: "Earnings Dashboard", desc: "Track your income, invoices and payment history." },
];

const Features = () => {
  const [activeTab, setActiveTab] = useState<"brands" | "creators">("brands");
  const features = activeTab === "brands" ? brandFeatures : creatorFeatures;

  return (
    <section id="features" className="py-32 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Features</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-8">
            Built for <span className="text-gradient">both sides</span>
          </h2>

          <div className="inline-flex rounded-full border border-border bg-secondary p-1">
            {(["brands", "creators"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-8 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full bg-gradient-coral"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group rounded-2xl border border-border bg-gradient-card p-8 hover:border-primary/30 transition-colors"
              >
                <div className="mb-5 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Features;
