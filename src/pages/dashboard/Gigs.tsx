import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, DollarSign, MapPin, Send, Loader2, Check, LogOut, Gift, Video, MoreHorizontal, Sparkles, Filter, X, ChevronDown, Globe, Tag, Users, ExternalLink, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { computeCreatorCampaignMatches } from "@/hooks/useSimpleMatch";
import ActiveGigHub from "@/components/dashboard/ActiveGigHub";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  platforms: string[] | null;
  campaign_length_days: number | null;
  status: string;
  price_per_video: number | null;
  is_free_product: boolean;
  target_regions: string[] | null;
  expected_video_count: number;
  requirements: string | null;
  brand_user_id: string;
  max_creators: number;
  calendly_enabled: boolean;
  calendly_link: string | null;
  communication_type: string;
  external_comm_link: string | null;
  request_contact_types: string[] | null;
}

type TabFilter = "available" | "applied" | "active";

const REGION_OPTIONS = ["Hong Kong", "United Kingdom", "United States", "Worldwide", "Australia", "Canada", "Singapore", "Malaysia", "Japan", "South Korea"];
const CATEGORY_PLATFORMS = ["instagram", "tiktok", "facebook", "youtube"];

const Gigs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedCampaigns, setAppliedCampaigns] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<Campaign | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [activeMemberships, setActiveMemberships] = useState<any[]>([]);
  const [leavingCampaign, setLeavingCampaign] = useState<any>(null);
  const [leavingLoading, setLeavingLoading] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [brandProfiles, setBrandProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<TabFilter>("available");
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [dataReady, setDataReady] = useState(false);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [acceptedCounts, setAcceptedCounts] = useState<Record<string, number>>({});
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, string>>({});
  const [activeGigDetail, setActiveGigDetail] = useState<any>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterPay, setFilterPay] = useState<"all" | "paid" | "free">("all");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterMinVideos, setFilterMinVideos] = useState("");
  const [filterMaxVideos, setFilterMaxVideos] = useState("");

  const hasActiveFilters = filterPay !== "all" || filterRegion || filterPlatform || filterMinVideos || filterMaxVideos;

  const clearFilters = () => {
    setFilterPay("all");
    setFilterRegion("");
    setFilterPlatform("");
    setFilterMinVideos("");
    setFilterMaxVideos("");
  };

  useEffect(() => {
    const fetchData = async () => {
      const [campaignsRes, applicationsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        user ? supabase.from("campaign_applications").select("*").eq("creator_user_id", user.id) : Promise.resolve({ data: [] }),
      ]);
      const allCampaignsRaw = (campaignsRes.data as Campaign[]) || [];

      const allApps = (applicationsRes.data as any) || [];
      setAppliedCampaigns(new Set(allApps.map((a: any) => a.campaign_id)));
      const statusMap: Record<string, string> = {};
      allApps.forEach((a: any) => { statusMap[a.campaign_id] = a.status; });
      setApplicationStatuses(statusMap);

      // Also fetch campaigns the user applied to (may be ended/not in active list)
      const appliedCampIds = allApps.map((a: any) => a.campaign_id).filter((id: string) => !allCampaignsRaw.some(c => c.id === id));
      let appliedCampaignsData: Campaign[] = [];
      if (appliedCampIds.length > 0) {
        const { data: extraCamps } = await supabase.from("campaigns").select("*").in("id", appliedCampIds);
        appliedCampaignsData = (extraCamps as Campaign[]) || [];
      }

      const combinedCampaigns = [...allCampaignsRaw, ...appliedCampaignsData];

      // Fetch brand profiles
      const brandUserIds = [...new Set(combinedCampaigns.map(c => c.brand_user_id))] as string[];
      let brandMap: Record<string, any> = {};
      if (brandUserIds.length > 0) {
        const { data: brands } = await supabase.from("brand_profiles").select("user_id, business_name, logo_url, website_url, instagram_url, tiktok_url").in("user_id", brandUserIds);
        (brands || []).forEach((b: any) => { brandMap[b.user_id] = b; });
      }
      setBrandProfiles(brandMap);

      // Only show campaigns where the brand profile still exists
      const allCampaigns = combinedCampaigns.filter(c => brandMap[c.brand_user_id]);
      setCampaigns(allCampaigns);

      // Get application counts per campaign
      const campIds = allCampaigns.map(c => c.id);
      if (campIds.length > 0) {
        const { data: countApps } = await supabase.from("campaign_applications").select("campaign_id, status").in("campaign_id", campIds);
        const appCounts: Record<string, number> = {};
        const accCounts: Record<string, number> = {};
        (countApps || []).forEach((a: any) => {
          appCounts[a.campaign_id] = (appCounts[a.campaign_id] || 0) + 1;
          if (a.status === "accepted") accCounts[a.campaign_id] = (accCounts[a.campaign_id] || 0) + 1;
        });
        setApplicationCounts(appCounts);
        setAcceptedCounts(accCounts);
      }

      const accepted = allApps.filter((a: any) => a.status === "accepted");
      if (accepted.length > 0) {
        const ids = [...new Set(accepted.map((a: any) => a.campaign_id))] as string[];
        const { data: campData } = await supabase.from("campaigns").select("*").in("id", ids);
        const campMap: Record<string, any> = {};
        (campData || []).forEach((c: any) => { campMap[c.id] = c; });
        // Also fetch brand profiles for active campaigns that might not be in allCampaigns
        const activeBrandIds = [...new Set((campData || []).map((c: any) => c.brand_user_id))] as string[];
        const newBrandIds = activeBrandIds.filter(id => !brandMap[id]);
        if (newBrandIds.length > 0) {
          const { data: moreBrands } = await supabase.from("brand_profiles").select("user_id, business_name, logo_url, website_url, instagram_url, tiktok_url").in("user_id", newBrandIds);
          (moreBrands || []).forEach((b: any) => { brandMap[b.user_id] = b; });
          setBrandProfiles({ ...brandMap });
        }
        setActiveMemberships(accepted.map((a: any) => ({
          ...a, _campaign: campMap[a.campaign_id] || { title: "Campaign", expected_video_count: 0 },
        })));
      }

      if (user) {
        const [profRes, socRes, collabRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("social_connections").select("platform, followers_count").eq("user_id", user.id),
          supabase.from("past_collaborations").select("brand_name").eq("user_id", user.id),
        ]);
        const socials = socRes.data || [];
        setCreatorProfile({
          ...profRes.data,
          platforms: [...new Set(socials.map((s: any) => s.platform))],
          followers: socials.reduce((sum: number, s: any) => sum + (s.followers_count || 0), 0),
          past_collabs: collabRes.data || [],
        });
      }
      setDataReady(true);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleApply = async () => {
    if (!user || !applyingTo) return;
    if (coverLetter.length < 300) {
      toast({ title: "Cover letter too short", description: `Minimum 300 characters (${coverLetter.length}/300)`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("campaign_applications").insert({
      campaign_id: applyingTo.id, creator_user_id: user.id, cover_letter: coverLetter,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    setAppliedCampaigns((prev) => new Set([...prev, applyingTo.id]));
    if (applyingTo.brand_user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: applyingTo.brand_user_id, type: "application", title: "New Application",
        body: `A creator applied to "${applyingTo.title}"`, link: "/brand/campaigns",
      });
    }
    toast({ title: "Application sent!", description: "The brand will review your application." });
    setApplyingTo(null);
    setCoverLetter("");
    setSubmitting(false);
  };

  const handleLeaveCampaign = async () => {
    if (!leavingCampaign || !user || !leaveReason.trim()) {
      toast({ title: "Please provide a reason for leaving", variant: "destructive" });
      return;
    }
    setLeavingLoading(true);
    const reason = leaveReason.trim();
    await supabase.from("campaign_applications").update({ status: "left" } as any).eq("id", leavingCampaign.id);
    const { data: groupRoom } = await supabase.from("chat_rooms").select("id").eq("campaign_id", leavingCampaign.campaign_id).eq("type", "group").maybeSingle();
    if (groupRoom) {
      const { data: profile } = await supabase.from("profiles").select("display_name, username").eq("user_id", user.id).maybeSingle();
      const name = profile?.display_name || profile?.username || "A creator";
      await supabase.from("messages").insert({ chat_room_id: groupRoom.id, sender_id: user.id, content: `📤 ${name} left the chat` } as any);
    }
    const brandUserId = leavingCampaign._campaign?.brand_user_id;
    if (brandUserId) {
      const { data: privateRooms } = await supabase.from("chat_rooms").select("id").eq("campaign_id", leavingCampaign.campaign_id).eq("type", "private");
      if (privateRooms?.length) {
        for (const room of privateRooms) {
          const { data: participants } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id);
          const pIds = (participants || []).map((p: any) => p.user_id);
          if (pIds.includes(user.id) && pIds.includes(brandUserId)) {
            await supabase.from("messages").insert({
              chat_room_id: room.id, sender_id: user.id,
              content: `I've left the campaign "${leavingCampaign._campaign?.title}".\n\nReason: ${reason}\n\nVideos delivered: ${leavingCampaign.videos_delivered || 0}`,
            } as any);
            break;
          }
        }
      }
    }
    await supabase.from("notifications").insert({
      user_id: leavingCampaign._campaign?.brand_user_id || "", type: "application_update", title: "Creator Left Campaign",
      body: `A creator has left "${leavingCampaign._campaign?.title || "your campaign"}". Reason: ${reason}. Videos delivered: ${leavingCampaign.videos_delivered || 0}`, link: "/brand/campaigns",
    });
    setActiveMemberships((prev) => prev.filter((m) => m.id !== leavingCampaign.id));
    toast({ title: "You've left the campaign" });
    setLeavingCampaign(null);
    setLeaveReason("");
    setLeavingLoading(false);
  };

  const aiMatches = useMemo(() => computeCreatorCampaignMatches(creatorProfile, campaigns), [creatorProfile, campaigns]);

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    if (pct >= 60) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    if (pct >= 50) return "bg-orange-500/15 text-orange-600 border-orange-500/30";
    return "";
  };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "available", label: "Available", count: campaigns.filter(c => c.status === "active" && !appliedCampaigns.has(c.id)).length },
    { key: "applied", label: "Applied", count: campaigns.filter(c => appliedCampaigns.has(c.id)).length },
    { key: "active", label: "Active", count: activeMemberships.length },
  ];

  const applyFilters = (list: Campaign[]) => {
    return list.filter(c => {
      if (filterPay === "paid" && (c.is_free_product || !c.price_per_video)) return false;
      if (filterPay === "free" && !c.is_free_product) return false;
      if (filterRegion && !(c.target_regions || []).some(r => r.toLowerCase().includes(filterRegion.toLowerCase()))) return false;
      if (filterPlatform && !(c.platforms || []).some(p => p.toLowerCase() === filterPlatform.toLowerCase())) return false;
      if (filterMinVideos && c.expected_video_count < parseInt(filterMinVideos)) return false;
      if (filterMaxVideos && c.expected_video_count > parseInt(filterMaxVideos)) return false;
      return true;
    });
  };

  const filteredCampaigns = applyFilters(
    campaigns.filter((c) => {
      if (activeTab === "available") return c.status === "active" && !appliedCampaigns.has(c.id);
      if (activeTab === "applied") return appliedCampaigns.has(c.id);
      return false;
    })
  ).sort((a, b) => (aiMatches[b.id] || 0) - (aiMatches[a.id] || 0));

  const selectedBrand = selectedCampaign ? brandProfiles[selectedCampaign.brand_user_id] : null;
  const selectedMatchPct = selectedCampaign ? (aiMatches[selectedCampaign.id] || 0) : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Gigs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Browse campaigns and find your next collaboration</p>
      </div>

      {/* Tab Bar + Filter Toggle */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="inline-flex items-center bg-secondary rounded-full p-1">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab.label}
              {tab.count > 0 && <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "opacity-80" : "opacity-60"}`}>{tab.count}</span>}
            </button>
          ))}
        </div>
        {activeTab !== "active" && (
          <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" className="gap-1.5 rounded-full" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3.5 w-3.5" /> Filters
            {hasActiveFilters && <span className="ml-1 h-4 w-4 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center">!</span>}
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && activeTab !== "active" && (
        <Card className="border-border/50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Filter Campaigns</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-muted-foreground" onClick={clearFilters}>
                  <X className="h-3 w-3" /> Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Pay */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Pay
                </label>
                <select value={filterPay} onChange={e => setFilterPay(e.target.value as any)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="all">All</option>
                  <option value="paid">Paid</option>
                  <option value="free">Free Product</option>
                </select>
              </div>
              {/* Region */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Region
                </label>
                <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Any</option>
                  {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {/* Platform */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Platform
                </label>
                <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">Any</option>
                  {CATEGORY_PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              {/* Min Videos */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Video className="h-3 w-3" /> Min Videos
                </label>
                <Input type="number" value={filterMinVideos} onChange={e => setFilterMinVideos(e.target.value)} placeholder="0" className="h-9" />
              </div>
              {/* Max Videos */}
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Video className="h-3 w-3" /> Max Videos
                </label>
                <Input type="number" value={filterMaxVideos} onChange={e => setFilterMaxVideos(e.target.value)} placeholder="∞" className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "active" ? (
        activeMemberships.length === 0 ? (
          <EmptyState icon={Check} title="No active campaigns" subtitle="Campaigns you've been accepted to will appear here" />
        ) : (
          <div className="space-y-4">
            <ActiveGigHub />
            <div className="space-y-3">
              {activeMemberships.map(m => {
                const brand = brandProfiles[m._campaign.brand_user_id];
                return (
                <div key={m.id} className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                  onClick={() => {
                    // Find the full campaign data to show details
                    const fullCampaign = campaigns.find(c => c.id === m.campaign_id);
                    if (fullCampaign) {
                      setActiveGigDetail({ ...m, _fullCampaign: fullCampaign });
                    } else {
                      // If campaign not in active list (could be non-active status), fetch it
                      setActiveGigDetail(m);
                    }
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 rounded-xl ring-2 ring-border shrink-0">
                        <AvatarImage src={brand?.logo_url || undefined} className="rounded-xl object-cover" />
                        <AvatarFallback className="rounded-xl bg-secondary text-base font-bold">
                          {(brand?.business_name || m._campaign.title || "B").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-heading font-bold text-foreground">{m._campaign.title}</h3>
                        {brand && <p className="text-xs text-muted-foreground">{brand.business_name}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{m.videos_delivered || 0}/{m._campaign.expected_video_count} videos</span>
                          <Badge className="bg-primary/10 text-primary border-0 text-[11px] font-bold uppercase tracking-wide">Active</Badge>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setLeavingCampaign(m); }}>
                      <LogOut className="h-3.5 w-3.5" /> Leave
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={activeTab === "available" ? "No gigs available" : "No applications yet"}
          subtitle={hasActiveFilters ? "Try adjusting your filters" : activeTab === "available" ? "New campaigns from brands will appear here" : "Apply to campaigns to see them here"}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map(campaign => {
            const hasApplied = appliedCampaigns.has(campaign.id);
            const brand = brandProfiles[campaign.brand_user_id];
            const matchPct = aiMatches[campaign.id] || 0;
            return (
              <Card key={campaign.id}
                className="border-border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group h-full overflow-hidden"
                onClick={() => setSelectedCampaign(campaign)}>
                {/* Hero area */}
                <div className="h-36 bg-gradient-to-br from-secondary via-secondary/60 to-muted flex flex-col items-center justify-end pb-4 relative">
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {matchPct >= 50 && (
                      <Badge className={`text-[10px] font-bold border ${getMatchColor(matchPct)}`}>
                        <Sparkles className="h-3 w-3 mr-0.5" />{matchPct}%
                      </Badge>
                    )}
                    {hasApplied && (
                      <Badge className={`text-[10px] font-bold border-0 ${
                        applicationStatuses[campaign.id] === "accepted" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : applicationStatuses[campaign.id] === "rejected" ? "bg-red-50 text-red-700 dark:bg-destructive/15 dark:text-destructive"
                        : "bg-secondary text-foreground"
                      }`}>
                        {applicationStatuses[campaign.id] === "accepted" ? "Accepted" : applicationStatuses[campaign.id] === "rejected" ? "Rejected" : "Applied"}
                      </Badge>
                    )}
                  </div>
                  <Avatar className="h-16 w-16 rounded-2xl ring-4 ring-card shadow-lg">
                    <AvatarImage src={brand?.logo_url || undefined} className="rounded-2xl object-cover" />
                    <AvatarFallback className="rounded-2xl bg-card text-xl font-bold text-foreground">
                      {(brand?.business_name || "B").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <CardContent className="p-5 flex flex-col">
                  <h3 className="font-heading font-bold text-base text-foreground text-center group-hover:text-primary transition-colors mb-1">{campaign.title}</h3>
                  <p className="text-sm text-muted-foreground text-center mb-3">{brand?.business_name || "Brand"}</p>

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
                    {hasApplied ? (
                      <div className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        <Check className="h-3.5 w-3.5 inline mr-1" /> Applied
                      </div>
                    ) : (
                      <div className="text-center text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                        View Gig
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Dialog - Redesigned */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-0">
          {selectedCampaign && (
            <div>
              {/* Match Banner */}
              {selectedMatchPct >= 50 && (
                <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between pr-12">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                      You are a {selectedMatchPct}% fit
                    </span>
                  </div>
                  {!appliedCampaigns.has(selectedCampaign.id) && (
                    <Button size="sm" className="rounded-full font-bold" onClick={() => { setApplyingTo(selectedCampaign); setSelectedCampaign(null); }}>
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
                    <AvatarFallback className="rounded-xl bg-secondary text-lg font-bold">
                      {(selectedBrand?.business_name || "B").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-xl font-heading font-bold text-foreground">{selectedCampaign.title}</h2>
                    <p className="text-sm text-muted-foreground">{selectedBrand?.business_name}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {selectedBrand?.website_url && (
                        <a href={selectedBrand.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      )}
                      {selectedBrand?.instagram_url && (
                        <a href={selectedBrand.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          Instagram
                        </a>
                      )}
                      {selectedBrand?.tiktok_url && (
                        <a href={selectedBrand.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          TikTok
                        </a>
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
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold text-foreground">Free Product</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-lg font-bold text-foreground">HK${selectedCampaign.price_per_video}</span>
                    <span className="text-sm text-muted-foreground ml-1">per video</span>
                  </div>
                )}
              </div>

              {/* Deliverables */}
              <div className="p-6 border-b border-border/50">
                <h3 className="font-heading font-bold text-foreground mb-2">Deliverables</h3>
                <p className="text-foreground"><span className="text-lg font-bold">{selectedCampaign.expected_video_count}</span> <span className="text-sm text-muted-foreground">video{selectedCampaign.expected_video_count > 1 ? "s" : ""}</span></p>
                {selectedCampaign.campaign_length_days && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedCampaign.campaign_length_days} day campaign</p>
                )}
                {selectedCampaign.platforms && selectedCampaign.platforms.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Platforms</p>
                    <div className="flex gap-2">
                      {selectedCampaign.platforms.map(p => (
                        <Badge key={p} variant="secondary" className="capitalize">{p}</Badge>
                      ))}
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

              {/* Looking for N creators */}
              <div className="p-6 border-b border-border/50">
                <h3 className="font-heading font-bold text-foreground mb-2">Looking for {selectedCampaign.max_creators} creator{selectedCampaign.max_creators > 1 ? "s" : ""}</h3>
                {selectedCampaign.target_regions && selectedCampaign.target_regions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Location</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCampaign.target_regions.map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                    </div>
                  </div>
                )}
                {selectedCampaign.calendly_enabled && selectedCampaign.calendly_link && (
                  <div className="mt-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Scheduling call available via Calendly</span>
                  </div>
                )}
              </div>

              {/* Apply CTA */}
              <div className="p-6">
                {appliedCampaigns.has(selectedCampaign.id) ? (
                  <Button disabled variant="outline" className="w-full gap-1.5 rounded-full"><Check className="h-4 w-4" /> Already Applied</Button>
                ) : (
                  <Button className="w-full gap-1.5 rounded-full font-bold" onClick={() => { setApplyingTo(selectedCampaign); setSelectedCampaign(null); }}>
                    <Send className="h-4 w-4" /> Apply Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={(open) => { if (!open) { setApplyingTo(null); setCoverLetter(""); } }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Apply to: {applyingTo?.title}</DialogTitle>
            <DialogDescription>Write a cover letter explaining why you're a great fit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Textarea
                placeholder="Tell the brand why you're the perfect creator for this campaign. Share your experience, content style, audience match, etc."
                value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="min-h-[200px] rounded-xl"
              />
              <p className={`text-xs mt-1.5 ${coverLetter.length >= 300 ? "text-muted-foreground" : "text-destructive"}`}>
                {coverLetter.length}/300 characters minimum
              </p>
            </div>
            <Button onClick={handleApply} disabled={submitting || coverLetter.length < 300} className="w-full rounded-full font-bold">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Campaign Confirmation */}
      <Dialog open={!!leavingCampaign} onOpenChange={(open) => { if (!open) { setLeavingCampaign(null); setLeaveReason(""); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Leave "{leavingCampaign?._campaign?.title}"</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">Videos delivered: {leavingCampaign?.videos_delivered || 0} / {leavingCampaign?._campaign?.expected_video_count || 0}</span>
              <span className="block text-sm">You'll be removed from the group chat but can still message the brand privately. This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reason for leaving <span className="text-destructive">*</span></label>
              <Textarea
                placeholder="Let the brand know why you're leaving..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">This will be sent to the brand via private chat.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" className="rounded-full" onClick={() => { setLeavingCampaign(null); setLeaveReason(""); }}>Stay</Button>
              <Button variant="destructive" className="rounded-full" onClick={handleLeaveCampaign} disabled={leavingLoading || !leaveReason.trim()}>
                {leavingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Leave permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Gig Detail Dialog */}
      <Dialog open={!!activeGigDetail} onOpenChange={(open) => !open && setActiveGigDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-0">
          {activeGigDetail && (() => {
            const campaign = activeGigDetail._fullCampaign || activeGigDetail._campaign;
            const brand = brandProfiles[campaign?.brand_user_id];
            return (
              <div>
                {/* Brand Header */}
                <div className="p-6 border-b border-border/50">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 rounded-xl ring-2 ring-border">
                      <AvatarImage src={brand?.logo_url || undefined} className="rounded-xl" />
                      <AvatarFallback className="rounded-xl bg-secondary text-lg font-bold">
                        {(brand?.business_name || "B").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-xl font-heading font-bold text-foreground">{campaign.title}</h2>
                      {brand && (
                        <p className="text-sm text-primary font-medium mt-0.5">{brand.business_name}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {brand?.website_url && (
                          <a href={brand.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <Globe className="h-3 w-3" /> Website <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {brand?.instagram_url && (
                          <a href={brand.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            Instagram <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {brand?.tiktok_url && (
                          <a href={brand.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            TikTok <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0 text-[11px] font-bold uppercase tracking-wide shrink-0">Active</Badge>
                  </div>
                </div>

                {/* Progress */}
                <div className="p-6 border-b border-border/50">
                  <h3 className="font-heading font-bold text-foreground mb-2">Your Progress</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, ((activeGigDetail.videos_delivered || 0) / (campaign.expected_video_count || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-foreground">{activeGigDetail.videos_delivered || 0}/{campaign.expected_video_count} videos</span>
                  </div>
                </div>

                {/* About */}
                {campaign.description && (
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-heading font-bold text-foreground mb-2">About this campaign</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{campaign.description}</p>
                  </div>
                )}

                {/* Budget */}
                <div className="p-6 border-b border-border/50">
                  <h3 className="font-heading font-bold text-foreground mb-2">Budget</h3>
                  {campaign.is_free_product ? (
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <span className="text-lg font-bold text-foreground">Free Product</span>
                    </div>
                  ) : campaign.price_per_video ? (
                    <div>
                      <span className="text-lg font-bold text-foreground">HK${campaign.price_per_video}</span>
                      <span className="text-sm text-muted-foreground ml-1">per video</span>
                    </div>
                  ) : null}
                </div>

                {/* Deliverables */}
                <div className="p-6 border-b border-border/50">
                  <h3 className="font-heading font-bold text-foreground mb-2">Deliverables</h3>
                  <p className="text-foreground"><span className="text-lg font-bold">{campaign.expected_video_count}</span> <span className="text-sm text-muted-foreground">video{campaign.expected_video_count > 1 ? "s" : ""}</span></p>
                  {campaign.campaign_length_days && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {campaign.campaign_length_days} day campaign</p>
                  )}
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Platforms</p>
                      <div className="flex gap-2">
                        {campaign.platforms.map((p: string) => (
                          <Badge key={p} variant="secondary" className="capitalize">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {campaign.requirements && (
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-heading font-bold text-foreground mb-2">Requirements</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{campaign.requirements}</p>
                  </div>
                )}

                {/* Calendly */}
                {campaign.calendly_enabled && campaign.calendly_link && (
                  <div className="p-6 border-b border-border/50">
                    <h3 className="font-heading font-bold text-foreground mb-2">Schedule a Call</h3>
                    <a href={campaign.calendly_link} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2 rounded-full">
                        <Calendar className="h-4 w-4" /> Book via Calendly <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="p-6">
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-full"
                    onClick={() => { setLeavingCampaign(activeGigDetail); setActiveGigDetail(null); }}>
                    <LogOut className="h-4 w-4" /> Leave Campaign
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20">
    <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-base font-heading font-bold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground text-sm text-center max-w-xs">{subtitle}</p>
  </div>
);

export default Gigs;
