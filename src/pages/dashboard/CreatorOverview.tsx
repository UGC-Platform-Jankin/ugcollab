import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Briefcase, Loader2, Sparkles, Gift, DollarSign, MapPin, Video,
  Play, TrendingUp, CheckCircle, Clock, ArrowRight, Globe, Users, Calendar, Send, Check
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAIMatch } from "@/hooks/useAIMatch";

const CreatorOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<Record<string, any>>({});
  const [dataReady, setDataReady] = useState(false);
  const [appliedGigs, setAppliedGigs] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [acceptedVideos, setAcceptedVideos] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<Set<string>>(new Set());
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [acceptedCounts, setAcceptedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, socialsRes, campaignsRes, collabsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("social_connections").select("platform, followers_count").eq("user_id", user.id),
        supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("past_collaborations").select("brand_name").eq("user_id", user.id),
      ]);

      const p = profileRes.data;
      const socials = socialsRes.data || [];
      const platforms = [...new Set(socials.map((s: any) => s.platform))];
      const followers = socials.reduce((sum: number, s: any) => sum + (s.followers_count || 0), 0);
      setProfile({ ...p, platforms, followers, past_collabs: collabsRes.data || [] });
      setCampaigns((campaignsRes.data as any) || []);

      const allCampaigns = (campaignsRes.data as any) || [];
      const brandIds = [...new Set(allCampaigns.map((c: any) => c.brand_user_id))] as string[];
      if (brandIds.length > 0) {
        const { data: brands } = await supabase.from("brand_profiles").select("user_id, business_name, logo_url, website_url, instagram_url, tiktok_url").in("user_id", brandIds);
        const map: Record<string, any> = {};
        (brands || []).forEach((b: any) => { map[b.user_id] = b; });
        setBrandProfiles(map);
      }

      // Get application counts per campaign
      if (allCampaigns.length > 0) {
        const campIds = allCampaigns.map((c: any) => c.id);
        const { data: allApps } = await supabase.from("campaign_applications").select("campaign_id, status").in("campaign_id", campIds);
        const counts: Record<string, number> = {};
        const accepted: Record<string, number> = {};
        (allApps || []).forEach((a: any) => {
          counts[a.campaign_id] = (counts[a.campaign_id] || 0) + 1;
          if (a.status === "accepted") accepted[a.campaign_id] = (accepted[a.campaign_id] || 0) + 1;
        });
        setApplicationCounts(counts);
        setAcceptedCounts(accepted);
      }

      const [applicationsRes, videosRes] = await Promise.all([
        supabase.from("campaign_applications").select("id, status, campaign_id, created_at").eq("creator_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("video_submissions").select("id, status").eq("creator_user_id", user.id),
      ]);

      const apps = applicationsRes.data || [];
      setAppliedGigs(apps.filter((a: any) => a.status === "pending"));
      setActiveGigs(apps.filter((a: any) => a.status === "accepted"));
      setAppliedCampaignIds(new Set(apps.map((a: any) => a.campaign_id)));
      const vids = videosRes.data || [];
      setTotalVideos(vids.length);
      setAcceptedVideos(vids.filter((v: any) => v.status === "accepted").length);
      setDataReady(true);
    };
    load();
  }, [user]);

  const matchItems = campaigns.map(c => ({
    id: c.id, title: c.title, description: c.description,
    platforms: c.platforms, target_regions: c.target_regions, requirements: c.requirements,
  }));

  const { matches, loading: matchLoading } = useAIMatch("creator_to_campaigns", profile, matchItems, dataReady && !!profile && campaigns.length > 0);
  const sortedCampaigns = [...campaigns].sort((a, b) => (matches[b.id] || 0) - (matches[a.id] || 0));
  const topMatches = sortedCampaigns.filter(c => (matches[c.id] || 0) > 0).slice(0, 6);

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30";
    if (pct >= 60) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30";
    return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30";
  };

  const selectedBrand = selectedCampaign ? brandProfiles[selectedCampaign.brand_user_id] : null;
  const selectedMatchPct = selectedCampaign ? (matches[selectedCampaign.id] || 0) : 0;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-border p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {(profile?.display_name || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""} 👋
            </h1>
            <p className="text-muted-foreground mt-0.5">Here's your creator dashboard overview</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Gigs", value: activeGigs.length, icon: Briefcase, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Pending Apps", value: appliedGigs.length, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Accepted", value: acceptedVideos, icon: CheckCircle, color: "text-primary", bg: "bg-primary/5" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className={`h-7 w-7 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              </div>
              <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommended Gigs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-coral flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">Recommended For You</h2>
              <p className="text-xs text-muted-foreground">AI-matched based on your profile</p>
            </div>
          </div>
          <Link to="/dashboard/gigs" className="text-sm text-primary hover:underline flex items-center gap-1">
            Browse all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!dataReady || matchLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Finding your best matches...</span>
          </div>
        ) : topMatches.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No matching gigs found right now</p>
              <Link to="/dashboard/gigs" className="text-sm text-primary hover:underline mt-2 inline-block">Browse all gigs →</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMatches.map((campaign) => {
              const pct = matches[campaign.id] || 0;
              const brand = brandProfiles[campaign.brand_user_id];
              return (
                <div key={campaign.id} onClick={() => setSelectedCampaign(campaign)} className="cursor-pointer">
                  <Card className="border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all group h-full overflow-hidden">
                    <div className="h-36 bg-gradient-to-br from-secondary via-secondary/60 to-muted flex flex-col items-center justify-end pb-4 relative">
                      <Badge className={`absolute top-3 right-3 text-[10px] font-bold border ${getMatchColor(pct)}`}>{pct}% match</Badge>
                      <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-card shadow-lg">
                        <AvatarImage src={brand?.logo_url} className="rounded-2xl object-cover" />
                        <AvatarFallback className="rounded-2xl bg-card text-xl font-bold text-foreground">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <CardContent className="p-5 flex flex-col">
                      <h3 className="font-heading font-bold text-base text-foreground text-center group-hover:text-primary transition-colors mb-1">{campaign.title}</h3>
                      <p className="text-sm text-muted-foreground text-center mb-4">{brand?.business_name || "Brand"}</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                        {campaign.is_free_product ? (
                          <Badge variant="secondary" className="text-xs gap-1 px-3 py-1"><Gift className="h-3 w-3" /> Free Product</Badge>
                        ) : campaign.price_per_video ? (
                          <Badge variant="secondary" className="text-xs gap-1 px-3 py-1 text-primary font-semibold"><DollarSign className="h-3 w-3" /> HK${campaign.price_per_video}/vid</Badge>
                        ) : null}
                        {campaign.target_regions?.length > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1 px-3 py-1"><MapPin className="h-3 w-3" /> {campaign.target_regions.join(", ")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                        <Badge variant="secondary" className="text-xs gap-1 px-3 py-1"><Video className="h-3 w-3" /> {campaign.expected_video_count} vid{campaign.expected_video_count !== 1 ? "s" : ""}</Badge>
                        {campaign.platforms?.length > 0 && campaign.platforms.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-xs capitalize px-3 py-1">{p}</Badge>
                        ))}
                      </div>
                      <div className="border-t border-border pt-3 mt-auto">
                        <div className="text-center text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                          View Gig
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Gigs */}
      {activeGigs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-foreground">Your Active Gigs</h2>
            <Link to="/dashboard/gigs" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGigs.slice(0, 6).map((gig) => {
              const campaign = campaigns.find(c => c.id === gig.campaign_id);
              const brand = campaign ? brandProfiles[campaign.brand_user_id] : null;
              return (
                <Link key={gig.id} to={`/dashboard/gig/${gig.campaign_id}`}>
                  <Card className="border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group h-full overflow-hidden">
                    <div className="h-28 bg-gradient-to-br from-emerald-50 via-secondary/60 to-muted dark:from-emerald-500/10 dark:via-secondary/30 dark:to-muted flex items-center justify-center">
                      <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-card shadow-lg">
                        <AvatarImage src={brand?.logo_url} className="rounded-2xl object-cover" />
                        <AvatarFallback className="rounded-2xl bg-card text-xl font-bold text-foreground">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <CardContent className="p-5 text-center">
                      <h3 className="font-heading font-bold text-base text-foreground group-hover:text-primary transition-colors mb-1">{campaign?.title || "Campaign"}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{brand?.business_name || "Brand"}</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-xs px-3 py-1">Active</Badge>
                        {campaign && (
                          <Badge variant="secondary" className="text-xs gap-1 px-3 py-1"><Video className="h-3 w-3" /> {campaign.expected_video_count} vid{campaign.expected_video_count !== 1 ? "s" : ""}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Gig Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-0">
          {selectedCampaign && (
            <div>
              {/* Match Banner */}
              {selectedMatchPct >= 50 && (
                <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                      You are a {selectedMatchPct}% fit
                    </span>
                  </div>
                  {!appliedCampaignIds.has(selectedCampaign.id) && (
                    <Button size="sm" className="rounded-full font-bold" onClick={() => { setSelectedCampaign(null); navigate("/dashboard/gigs"); }}>
                      Apply Now
                    </Button>
                  )}
                </div>
              )}

              {/* Brand Header */}
              <div className="p-6 border-b border-border/50">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14 rounded-xl ring-2 ring-border">
                    <AvatarImage src={selectedBrand?.logo_url || undefined} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-secondary text-lg font-bold">{(selectedBrand?.business_name || "B").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-heading font-bold text-foreground">{selectedCampaign.title}</h2>
                    <Link
                      to={`/brand/public/${selectedCampaign.brand_user_id}`}
                      className="text-sm text-primary hover:underline font-medium"
                      onClick={() => setSelectedCampaign(null)}
                    >
                      {selectedBrand?.business_name || "Brand"} →
                    </Link>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {selectedBrand?.website_url && (
                        <a href={selectedBrand.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {selectedBrand?.instagram_url && (
                        <a href={selectedBrand.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">Instagram</a>
                      )}
                      {selectedBrand?.tiktok_url && (
                        <a href={selectedBrand.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">TikTok</a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {applicationCounts[selectedCampaign.id] || 0} creators applied</span>
                  {(acceptedCounts[selectedCampaign.id] || 0) > 0 && (
                    <span className="text-primary font-medium">💚 Brand connected with {acceptedCounts[selectedCampaign.id]} creators</span>
                  )}
                </div>
              </div>

              {/* About */}
              {selectedCampaign.description && (
                <div className="p-6 border-b border-border/50">
                  <h3 className="font-heading font-bold text-foreground mb-2">About this campaign</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedCampaign.description}</p>
                </div>
              )}

              {/* Budget */}
              <div className="p-6 border-b border-border/50">
                <h3 className="font-heading font-bold text-foreground mb-2">Budget</h3>
                {selectedCampaign.is_free_product ? (
                  <div className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /><span className="text-lg font-bold text-foreground">Free Product</span></div>
                ) : (
                  <div><span className="text-lg font-bold text-foreground">HK${selectedCampaign.price_per_video}</span><span className="text-sm text-muted-foreground ml-1">per video</span></div>
                )}
              </div>

              {/* Deliverables */}
              <div className="p-6 border-b border-border/50">
                <h3 className="font-heading font-bold text-foreground mb-2">Deliverables</h3>
                <p className="text-foreground"><span className="text-lg font-bold">{selectedCampaign.expected_video_count}</span> <span className="text-sm text-muted-foreground">video{selectedCampaign.expected_video_count > 1 ? "s" : ""}</span></p>
                {selectedCampaign.campaign_length_days && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedCampaign.campaign_length_days} day campaign</p>
                )}
                {selectedCampaign.platforms?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Platforms</p>
                    <div className="flex gap-2">
                      {selectedCampaign.platforms.map((p: string) => <Badge key={p} variant="secondary" className="capitalize">{p}</Badge>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Requirements */}
              {selectedCampaign.requirements && (
                <div className="p-6 border-b border-border/50">
                  <h3 className="font-heading font-bold text-foreground mb-2">Requirements</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedCampaign.requirements}</p>
                </div>
              )}

              {/* CTA */}
              <div className="p-6">
                {appliedCampaignIds.has(selectedCampaign.id) ? (
                  <Button disabled variant="outline" className="w-full gap-1.5 rounded-full"><Check className="h-4 w-4" /> Already Applied</Button>
                ) : (
                  <Button className="w-full gap-1.5 rounded-full font-bold" onClick={() => { setSelectedCampaign(null); navigate("/dashboard/gigs"); }}>
                    <Send className="h-4 w-4" /> Apply Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorOverview;
