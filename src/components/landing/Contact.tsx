import { motion } from "framer-motion";
import { Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({ title: "Message sent", description: "We'll get back to you shortly." });
      (e.target as HTMLFormElement).reset();
    }, 800);
  };

  return (
    <section id="contact" className="py-32 relative">
      <div className="container max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Contact</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Get in <span className="text-gradient">touch</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Whether you're a brand or creator, we'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-3 rounded-2xl border border-border bg-gradient-card p-8 md:p-10"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Your name" required className="bg-secondary border-border" />
                <Input type="email" placeholder="Email address" required className="bg-secondary border-border" />
              </div>
              <Input placeholder="Subject" required className="bg-secondary border-border" />
              <Textarea placeholder="Your message..." required rows={5} className="bg-secondary border-border resize-none" />
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="bg-gradient-coral text-primary-foreground hover:opacity-90 transition-opacity w-full h-12 shadow-glow"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 space-y-6"
          >
            <div className="rounded-2xl border border-border bg-gradient-card p-8">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Email</h3>
              </div>
              <p className="text-sm text-muted-foreground">hello@ugczone.io</p>
            </div>

            <div className="rounded-2xl border border-border bg-gradient-card p-8">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Locations</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Hong Kong</p>
                <p className="text-sm text-muted-foreground">London, United Kingdom</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
