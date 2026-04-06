import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase, Loader2, Sparkles, Gift, DollarSign, MapPin, Video,
  Play, TrendingUp, CheckCircle, Clock, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAIMatch } from "@/hooks/useAIMatch";

const CreatorOverview = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<Record<string, any>>({});
  const [dataReady, setDataReady] = useState(false);
  const [appliedGigs, setAppliedGigs] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [acceptedVideos, setAcceptedVideos] = useState(0);

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
        const { data: brands } = await supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", brandIds);
        const map: Record<string, any> = {};
        (brands || []).forEach((b: any) => { map[b.user_id] = b; });
        setBrandProfiles(map);
      }

      const [applicationsRes, videosRes] = await Promise.all([
        supabase.from("campaign_applications").select("id, status, campaign_id, created_at").eq("creator_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("video_submissions").select("id, status").eq("creator_user_id", user.id),
      ]);

      const apps = applicationsRes.data || [];
      setAppliedGigs(apps.filter((a: any) => a.status === "pending"));
      setActiveGigs(apps.filter((a: any) => a.status === "accepted"));
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Gigs", value: activeGigs.length, icon: Play, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Pending Apps", value: appliedGigs.length, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Videos Sent", value: totalVideos, icon: Video, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Accepted", value: acceptedVideos, icon: CheckCircle, color: "text-primary", bg: "bg-primary/5" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
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
          <div className="grid md:grid-cols-2 gap-3">
            {activeGigs.slice(0, 4).map((gig) => {
              const campaign = campaigns.find(c => c.id === gig.campaign_id);
              const brand = campaign ? brandProfiles[campaign.brand_user_id] : null;
              return (
                <Link key={gig.id} to={`/dashboard/gig/${gig.campaign_id}`}>
                  <Card className="border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 rounded-xl shrink-0">
                          <AvatarImage src={brand?.logo_url} className="rounded-xl object-cover" />
                          <AvatarFallback className="rounded-xl bg-secondary text-sm font-bold">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {campaign?.title || "Campaign"}
                          </p>
                          <p className="text-xs text-muted-foreground">{brand?.business_name || "Brand"}</p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px]">
                          Active
                        </Badge>
                      </div>
                      {campaign && (
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Video className="h-3 w-3" />
                          <span>{campaign.expected_video_count} video{campaign.expected_video_count !== 1 ? "s" : ""} expected</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topMatches.map((campaign) => {
              const pct = matches[campaign.id] || 0;
              const brand = brandProfiles[campaign.brand_user_id];
              return (
                <Link key={campaign.id} to="/dashboard/gigs">
                  <Card className="border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group h-full">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 rounded-xl shrink-0">
                          <AvatarImage src={brand?.logo_url} className="rounded-xl object-cover" />
                          <AvatarFallback className="rounded-xl bg-secondary text-sm font-bold">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {campaign.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{brand?.business_name || "Brand"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {campaign.is_free_product ? (
                          <Badge variant="secondary" className="text-[10px] gap-1"><Gift className="h-2.5 w-2.5" /> Free Product</Badge>
                        ) : campaign.price_per_video ? (
                          <Badge variant="secondary" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" /> HK${campaign.price_per_video}/vid</Badge>
                        ) : null}
                        {campaign.target_regions?.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] gap-1"><MapPin className="h-2.5 w-2.5" /> {campaign.target_regions[0]}</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] gap-1"><Video className="h-2.5 w-2.5" /> {campaign.expected_video_count} vid{campaign.expected_video_count !== 1 ? "s" : ""}</Badge>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-muted-foreground">Match</span>
                          <Badge className={`text-[10px] font-bold border ${getMatchColor(pct)}`}>{pct}%</Badge>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorOverview;
