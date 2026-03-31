import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";


const Navbar = () => {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#reviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</a>
          <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#brands" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Brands</a>
          <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
            <Link to="/auth">Creator Login</Link>
          </Button>
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" asChild>
            <Link to="/brand/auth">Brand Login</Link>
          </Button>
          <Button size="sm" className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity" asChild>
            <Link to="/get-started">Get Started</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
