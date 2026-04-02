import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase, Loader2, Sparkles, Gift, DollarSign, MapPin, Video,
  MessageCircle, ClipboardCheck, Play, ArrowRight, MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAIMatch } from "@/hooks/useAIMatch";

const CreatorOverview = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brandProfiles, setBrandProfiles] = useState<Record<string, any>>({});
  const [dataReady, setDataReady] = useState(false);

  // Dashboard stats
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [videoFeedbacks, setVideoFeedbacks] = useState<any[]>([]);
  const [appliedGigs, setAppliedGigs] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);

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

      // Load dashboard stats
      const [applicationsRes, videosRes] = await Promise.all([
        supabase.from("campaign_applications").select("id, status, campaign_id, created_at").eq("creator_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("video_submissions").select("id, title, status, feedback, campaign_id, updated_at").eq("creator_user_id", user.id).order("updated_at", { ascending: false }),
      ]);

      const apps = applicationsRes.data || [];
      setAppliedGigs(apps.filter((a: any) => a.status === "pending"));
      setActiveGigs(apps.filter((a: any) => a.status === "accepted"));

      // Videos with feedback (approved/rejected with feedback)
      const withFeedback = (videosRes.data || []).filter((v: any) => v.feedback && (v.status === "approved" || v.status === "rejected"));
      setVideoFeedbacks(withFeedback.slice(0, 5));

      // Unread messages count
      const { data: rooms } = await supabase.from("chat_participants").select("chat_room_id").eq("user_id", user.id);
      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map((r: any) => r.chat_room_id);
        const { data: msgs } = await supabase.from("messages").select("id").in("chat_room_id", roomIds).neq("sender_id", user.id);
        const allMsgIds = (msgs || []).map((m: any) => m.id);
        if (allMsgIds.length > 0) {
          const { data: reads } = await supabase.from("message_reads").select("message_id").eq("user_id", user.id).in("message_id", allMsgIds);
          const readIds = new Set((reads || []).map((r: any) => r.message_id));
          setUnreadMessages(allMsgIds.filter(id => !readIds.has(id)).length);
        }
      }

      setDataReady(true);
    };
    load();
  }, [user]);

  const matchItems = campaigns.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    platforms: c.platforms,
    target_regions: c.target_regions,
    requirements: c.requirements,
  }));

  const { matches, loading: matchLoading } = useAIMatch(
    "creator_to_campaigns",
    profile,
    matchItems,
    dataReady && !!profile && campaigns.length > 0
  );

  const sortedCampaigns = [...campaigns].sort((a, b) => (matches[b.id] || 0) - (matches[a.id] || 0));
  const topMatches = sortedCampaigns.filter(c => (matches[c.id] || 0) > 0).slice(0, 6);

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    if (pct >= 60) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    if (pct >= 40) return "bg-orange-500/15 text-orange-600 border-orange-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const statCards = [
    {
      label: "Unread Messages",
      value: unreadMessages,
      icon: MessageCircle,
      color: "from-blue-500 to-blue-600",
      link: "/dashboard/messages",
    },
    {
      label: "Video Feedback",
      value: videoFeedbacks.length,
      icon: MessageSquare,
      color: "from-purple-500 to-purple-600",
      link: "/dashboard/videos",
    },
    {
      label: "Applied Gigs",
      value: appliedGigs.length,
      icon: ClipboardCheck,
      color: "from-amber-500 to-orange-500",
      link: "/dashboard/gigs",
    },
    {
      label: "Active Gigs",
      value: activeGigs.length,
      icon: Play,
      color: "from-emerald-500 to-emerald-600",
      link: "/dashboard/gigs",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your creator account</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="border-border hover:border-primary/20 transition-all hover:shadow-md group cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Active & Applied Gigs */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Active Gigs */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <CardTitle className="text-sm font-heading">Active Gigs</CardTitle>
              </div>
              <Link to="/dashboard/gigs" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeGigs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No active gigs yet</p>
            ) : (
              <div className="space-y-2">
                {activeGigs.slice(0, 4).map((gig) => {
                  const campaign = campaigns.find(c => c.id === gig.campaign_id);
                  const brand = campaign ? brandProfiles[campaign.brand_user_id] : null;
                  return (
                    <Link key={gig.id} to="/dashboard/gigs" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage src={brand?.logo_url} className="object-cover" />
                        <AvatarFallback className="rounded-md bg-secondary text-xs">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{campaign?.title || "Campaign"}</p>
                        <p className="text-xs text-muted-foreground">{brand?.business_name || "Brand"}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Active</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applied Gigs (Pending) */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <CardTitle className="text-sm font-heading">Pending Applications</CardTitle>
              </div>
              <Link to="/dashboard/gigs" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {appliedGigs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending applications</p>
            ) : (
              <div className="space-y-2">
                {appliedGigs.slice(0, 4).map((gig) => {
                  const campaign = campaigns.find(c => c.id === gig.campaign_id);
                  const brand = campaign ? brandProfiles[campaign.brand_user_id] : null;
                  return (
                    <Link key={gig.id} to="/dashboard/gigs" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage src={brand?.logo_url} className="object-cover" />
                        <AvatarFallback className="rounded-md bg-secondary text-xs">{(brand?.business_name || "B").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{campaign?.title || "Campaign"}</p>
                        <p className="text-xs text-muted-foreground">{brand?.business_name || "Brand"}</p>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Pending</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Feedback */}
      {videoFeedbacks.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <CardTitle className="text-sm font-heading">Recent Video Feedback</CardTitle>
              </div>
              <Link to="/dashboard/videos" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {videoFeedbacks.map((v) => (
                <Link key={v.id} to="/dashboard/videos" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center ${v.status === "approved" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    <Video className={`h-3.5 w-3.5 ${v.status === "approved" ? "text-emerald-500" : "text-red-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.feedback}</p>
                  </div>
                  <Badge className={`text-[10px] ${v.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                    {v.status === "approved" ? "Approved" : "Revision"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Gigs */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-coral flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-heading">Recommended Gigs</CardTitle>
              <p className="text-xs text-muted-foreground">AI-matched based on your profile</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!dataReady || matchLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Finding your best matches...</span>
            </div>
          ) : topMatches.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matching gigs found right now</p>
              <Link to="/dashboard/gigs" className="text-xs text-primary hover:underline mt-1 inline-block">Browse all gigs →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {topMatches.map((campaign) => {
                const pct = matches[campaign.id] || 0;
                const brand = brandProfiles[campaign.brand_user_id];
                return (
                  <Link
                    key={campaign.id}
                    to="/dashboard/gigs"
                    className="block rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 group"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 rounded-lg shrink-0">
                        <AvatarImage src={brand?.logo_url || undefined} className="rounded-lg object-cover" />
                        <AvatarFallback className="rounded-lg bg-secondary text-sm font-bold">
                          {(brand?.business_name || "B").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-heading font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {campaign.title}
                          </h3>
                          <Badge className={`shrink-0 text-xs font-bold border ${getMatchColor(pct)}`}>
                            {pct}% match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{brand?.business_name || "Brand"}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                          {campaign.is_free_product ? (
                            <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> Free Product</span>
                          ) : campaign.price_per_video ? (
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> HK${campaign.price_per_video}/vid</span>
                          ) : null}
                          {campaign.target_regions?.length > 0 && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {campaign.target_regions.join(", ")}</span>
                          )}
                          {campaign.expected_video_count > 0 && (
                            <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {campaign.expected_video_count} video{campaign.expected_video_count > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-coral transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
              <Link to="/dashboard/gigs" className="block text-center text-xs text-primary hover:underline pt-2">
                View all gigs →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorOverview;
