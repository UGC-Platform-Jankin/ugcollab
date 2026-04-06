import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, ArrowLeft, Megaphone, MapPin, Video, DollarSign, Gift } from "lucide-react";

const BrandPublicProfile = () => {
  const { brandUserId } = useParams<{ brandUserId: string }>();
  const [brand, setBrand] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandUserId) return;
    const load = async () => {
      const [brandRes, campsRes] = await Promise.all([
        supabase.from("brand_profiles").select("*").eq("user_id", brandUserId).maybeSingle(),
        supabase.from("campaigns").select("*").eq("brand_user_id", brandUserId).eq("status", "active").order("created_at", { ascending: false }),
      ]);
      setBrand(brandRes.data);
      setCampaigns(campsRes.data || []);
      setLoading(false);
    };
    load();
  }, [brandUserId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!brand) return <div className="text-center py-20 text-muted-foreground">Brand not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/dashboard/gigs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Gigs
        </Link>

        {/* Brand Hero */}
        <div className="rounded-2xl border border-border bg-card p-8 mb-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 rounded-2xl ring-4 ring-border">
              <AvatarImage src={brand.logo_url} className="rounded-2xl object-cover" />
              <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">{brand.business_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{brand.business_name}</h1>
              <p className="text-sm text-muted-foreground capitalize">{brand.business_type}</p>
              {brand.country && <p className="text-xs text-muted-foreground mt-1">{brand.country}</p>}
              <div className="flex items-center gap-3 mt-2">
                {brand.website_url && (
                  <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
                {brand.instagram_url && (
                  <a href={brand.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Instagram</a>
                )}
                {brand.tiktok_url && (
                  <a href={brand.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">TikTok</a>
                )}
              </div>
            </div>
          </div>
          {brand.description && <p className="text-sm text-muted-foreground mt-5 leading-relaxed">{brand.description}</p>}
        </div>

        {/* Active Campaigns */}
        <h2 className="text-lg font-heading font-bold text-foreground mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-muted-foreground" /> Active Campaigns
        </h2>
        {campaigns.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground">No active campaigns right now.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <Link key={c.id} to="/dashboard/gigs">
                <Card className="border-border hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <h3 className="font-heading font-bold text-foreground">{c.title}</h3>
                    {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {c.is_free_product ? (
                        <Badge variant="secondary" className="text-xs gap-1"><Gift className="h-3 w-3" /> Free Product</Badge>
                      ) : c.price_per_video ? (
                        <Badge variant="secondary" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> HK${c.price_per_video}/vid</Badge>
                      ) : null}
                      <Badge variant="secondary" className="text-xs gap-1"><Video className="h-3 w-3" /> {c.expected_video_count} videos</Badge>
                      {c.target_regions?.map((r: string) => (
                        <Badge key={r} variant="outline" className="text-xs gap-1"><MapPin className="h-3 w-3" /> {r}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandPublicProfile;
