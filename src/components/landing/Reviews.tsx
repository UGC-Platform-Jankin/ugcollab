import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const reviews = [
  {
    name: "Sarah L.",
    role: "Brand Manager",
    company: "Glow Cosmetics",
    initials: "SL",
    quote: "UGC Zone completely transformed how we run our UGC campaigns. The approval workflow alone saves us hours every week.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    role: "Content Creator",
    company: "London",
    initials: "MT",
    quote: "Finally a platform that treats creators fairly. Clear briefs, structured feedback, and I actually get paid on time.",
    rating: 5,
  },
  {
    name: "Jenny C.",
    role: "Marketing Director",
    company: "FitLife HK",
    initials: "JC",
    quote: "We onboarded 15 creators in our first campaign and the content quality was incredible. The platform makes everything seamless.",
    rating: 5,
  },
  {
    name: "David W.",
    role: "Micro-Influencer",
    company: "Hong Kong",
    initials: "DW",
    quote: "The best part is the transparency. I always know where my submissions stand and when I'll be paid.",
    rating: 5,
  },
];

const Reviews = () => {
  return (
    <section id="reviews" className="py-32 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Reviews</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Trusted by <span className="text-gradient">brands & creators</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            See what our early users have to say about UGC Zone.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-gradient-card p-8"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-6">"{review.quote}"</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-secondary text-xs font-medium text-foreground">
                    {review.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.role} · {review.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
