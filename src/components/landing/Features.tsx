import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, MessageSquare, Upload, Shield, Search, Wallet,
  Layout, Star, Video, FileCheck, TrendingUp, Clock
} from "lucide-react";

const brandFeatures = [
  { icon: Layout, title: "Campaign Management", desc: "Create campaigns with budgets, creator limits, target regions and detailed briefs." },
  { icon: Search, title: "Find Creators", desc: "Browse creators with verified social stats, follower counts and past work." },
  { icon: MessageSquare, title: "Built-in Messaging", desc: "Private DMs and campaign group chats with file sharing, voice messages and read receipts." },
  { icon: Video, title: "Video Review", desc: "Review creator video submissions, approve or request revisions with feedback." },
  { icon: FileCheck, title: "Campaign Controls", desc: "End campaigns, remove creators, and manage your content pipeline." },
  { icon: BarChart3, title: "Brand Dashboard", desc: "Overview of active campaigns, creator count, and content pipeline." },
];

const creatorFeatures = [
  { icon: Star, title: "Creator Profile", desc: "Showcase your bio, connected socials, follower stats and past brand collaborations." },
  { icon: TrendingUp, title: "Gig Discovery", desc: "Browse active campaigns with brand info, budgets and requirements." },
  { icon: Upload, title: "Video Submissions", desc: "Submit videos for review, get feedback, and re-upload after amendments." },
  { icon: Clock, title: "Real-time Chat", desc: "Message brands directly with attachments, voice notes and link sharing." },
  { icon: Shield, title: "Social Connections", desc: "Link your Instagram, TikTok and other platforms to verify your reach." },
  { icon: Wallet, title: "Posted Videos", desc: "Submit your live video links across multiple platforms after approval." },
];

const Features = () => {
  const [activeTab, setActiveTab] = useState<"brands" | "creators">("brands");
  const features = activeTab === "brands" ? brandFeatures : creatorFeatures;

  return (
    <section id="features" className="py-32 relative overflow-hidden">
      {/* Background elements */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute -right-64 -top-64 w-[500px] h-[500px] rounded-full border border-primary/5"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute -left-32 -bottom-32 w-[300px] h-[300px] rounded-full border border-primary/5"
      />

      <div className="container relative z-10">
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
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-border bg-gradient-card p-8 hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              >
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  className="mb-5 inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"
                >
                  <feature.icon className="h-5 w-5 text-primary" />
                </motion.div>
                <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
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
