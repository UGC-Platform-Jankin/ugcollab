import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  content: string;
  rating: number;
  reviewer_type: string;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null };
  brand?: { business_name: string | null; logo_url: string | null };
}

const ReviewsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews" as any)
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (!data) { setLoading(false); return; }

      const userIds = (data as any[]).map((r) => r.user_id);
      const [{ data: profiles }, { data: brands }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds),
        supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", userIds),
      ]);

      const enriched: Review[] = (data as any[]).map((r) => ({
        ...r,
        profile: profiles?.find((p: any) => p.user_id === r.user_id),
        brand: brands?.find((b: any) => b.user_id === r.user_id),
      }));

      setReviews(enriched);
      setLoading(false);
    };
    fetchReviews();
  }, []);

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("reviews" as any).insert({
      user_id: user.id,
      content: content.trim(),
      rating,
      reviewer_type: "creator",
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    } else {
      toast({ title: "Review submitted", description: "Your review will be visible after approval." });
      setContent("");
      setRating(5);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              What people say about <span className="text-gradient">UGC Zone</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Real reviews from brands and creators on the platform.
            </p>
          </motion.div>

          {/* Submit review */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-border bg-gradient-card p-6 mb-10"
            >
              <h3 className="font-heading font-semibold text-foreground mb-4">Leave a Review</h3>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star className={`h-5 w-5 ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your experience with UGC Zone..."
                className="bg-secondary border-border mb-4"
                rows={3}
              />
              <Button onClick={handleSubmit} disabled={submitting || !content.trim()} className="bg-gradient-coral text-primary-foreground gap-2">
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit Review"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Reviews are published after approval.</p>
            </motion.div>
          )}

          {/* Reviews list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No reviews yet. Be the first!</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {reviews.map((review, i) => {
                const name = review.brand?.business_name || review.profile?.display_name || review.profile?.username || "User";
                const avatar = review.brand?.logo_url || review.profile?.avatar_url;
                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-gradient-card p-6"
                  >
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-4">"{review.content}"</p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={avatar || undefined} />
                        <AvatarFallback className="bg-secondary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{review.reviewer_type}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ReviewsPage;
