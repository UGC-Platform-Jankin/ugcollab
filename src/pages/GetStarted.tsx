import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Camera, Building2, ArrowRight } from "lucide-react";

const GetStarted = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link to="/" className="text-lg font-heading font-bold text-foreground">UGC Zone</Link>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mt-6">
            How would you like to use UGC Zone?
          </h1>
          <p className="text-muted-foreground mt-2">Choose your role to get started</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/auth" className="block group">
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                    <Camera className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-heading font-bold text-foreground mb-2">I'm a Creator</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Showcase your content, connect with brands, and land paid UGC campaigns.
                  </p>
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    Get started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link to="/brand/auth" className="block group">
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-8 h-full transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_0_60px_-10px_hsl(220,100%,60%,0.2)]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                    <Building2 className="w-7 h-7 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-heading font-bold text-foreground mb-2">I'm a Brand</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    Find talented UGC creators, launch campaigns, and grow your business.
                  </p>
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    Get started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
