import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Instagram } from "lucide-react";
import creatorsImage from "@/assets/creators-collab.jpg";

interface SpotlightCreator {
  id: string;
  headline: string | null;
  creator_user_id: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null; bio: string | null };
  socials?: { platform: string; followers_count: number | null }[];
}

const formatCount = (n: number | null) => {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

const CreatorSpotlight = () => {
  const [creators, setCreators] = useState<SpotlightCreator[]>([]);

  useEffect(() => {
    const fetchSpotlights = async () => {
      const { data: spotlights } = await supabase
        .from("creator_spotlights" as any)
        .select("id, headline, creator_user_id")
        .eq("visible", true)
        .order("display_order", { ascending: true });

      if (!spotlights || spotlights.length === 0) return;

      const userIds = (spotlights as any[]).map((s) => s.creator_user_id);
      const [{ data: profiles }, { data: socials }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url, bio").in("user_id", userIds),
        supabase.from("social_connections").select("user_id, platform, followers_count").in("user_id", userIds),
      ]);

      const enriched: SpotlightCreator[] = (spotlights as any[]).map((s) => ({
        ...s,
        profile: profiles?.find((p: any) => p.user_id === s.creator_user_id),
        socials: socials?.filter((sc: any) => sc.user_id === s.creator_user_id) || [],
      }));

      setCreators(enriched);
    };
    fetchSpotlights();
  }, []);

  return (
    <section className="py-24 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Creator Spotlight</p>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Meet our <span className="text-gradient">top creators</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Talented creators delivering authentic content for brands on UGC Zone.
          </p>
        </motion.div>

        {creators.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {creators.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-gradient-card p-6 text-center"
              >
                <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-primary/20">
                  <AvatarImage src={c.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-xl font-heading">
                    {(c.profile?.display_name || c.profile?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-heading font-semibold text-foreground">
                  {c.profile?.display_name || c.profile?.username || "Creator"}
                </h3>
                {c.headline && <p className="text-sm text-primary mt-1">{c.headline}</p>}
                {c.profile?.bio && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.profile.bio}</p>
                )}
                {c.socials && c.socials.length > 0 && (
                  <div className="flex justify-center gap-4 mt-4">
                    {c.socials.map((s: any) => (
                      <div key={s.platform} className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{formatCount(s.followers_count)}</span>
                        <span className="ml-1">{s.platform}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border shadow-glow"
          >
            <img src={creatorsImage} alt="UGC creators collaborating" loading="lazy" width={1280} height={720} className="w-full h-auto" />
            <div className="p-6 text-center bg-gradient-card">
              <p className="text-muted-foreground">Creator spotlights coming soon — join now to be featured!</p>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default CreatorSpotlight;
