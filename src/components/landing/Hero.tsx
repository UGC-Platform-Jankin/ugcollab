import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import heroImage from "@/assets/hero-abstract.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero pt-16">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-gradient-coral animate-pulse" />
              Launching in Hong Kong & London
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight">
              Where brands meet{" "}
              <span className="text-gradient">creators</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              The all-in-one platform to launch UGC campaigns, manage creators, review content and handle payments — in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity gap-2 text-base px-8 h-12 shadow-glow">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base h-12 border-border text-foreground hover:bg-secondary">
                <Play className="h-4 w-4" /> Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-9 w-9 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">200+</span> creators already joined
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-glow">
              <img src={heroImage} alt="UGC campaign platform dashboard" className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            {/* Floating stats card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 rounded-xl border border-border bg-card p-4 shadow-glow"
            >
              <p className="text-xs text-muted-foreground">Campaign ROI</p>
              <p className="text-2xl font-heading font-bold text-gradient">+340%</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
