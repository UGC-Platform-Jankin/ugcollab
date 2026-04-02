import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Search, Send, Loader2, Instagram, Facebook, Video, Filter, X, Eye, Globe, Briefcase, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIMatch } from "@/hooks/useAIMatch";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };
const platformColors: Record<string, string> = { instagram: "text-pink-400", facebook: "text-blue-400", tiktok: "text-cyan-400" };
const platformOptions = ["instagram", "tiktok", "facebook"];
const followerRanges = [
  { label: "Any", min: 0, max: Infinity },
  { label: "0 – 1K", min: 0, max: 1000 },
  { label: "1K – 10K", min: 1000, max: 10000 },
  { label: "10K – 50K", min: 10000, max: 50000 },
  { label: "50K – 100K", min: 50000, max: 100000 },
  { label: "100K+", min: 100000, max: Infinity },
];

interface Creator {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  socials: any[];
}

const formatCount = (n: number | null) => {
  if (!n) return "-";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const FindCreators = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filtered, setFiltered] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [followerFilter, setFollowerFilter] = useState<number>(0);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [inviteCreator, setInviteCreator] = useState<Creator | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [viewingCreator, setViewingCreator] = useState<Creator | null>(null);
  const [creatorCollabs, setCreatorCollabs] = useState<any[]>([]);
  const [creatorSocialDetails, setCreatorSocialDetails] = useState<any[]>([]);
  const [brandCampaignData, setBrandCampaignData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profilesRes, socialsRes, campaignsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, bio, avatar_url"),
        supabase.from("social_connections").select("user_id, platform, followers_count, average_views, platform_username"),
        supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id).eq("status", "active"),
      ]);

      const profiles = profilesRes.data || [];
      const socials = socialsRes.data || [];
      const socialMap: Record<string, any[]> = {};
      socials.forEach((s: any) => {
        if (!socialMap[s.user_id]) socialMap[s.user_id] = [];
        socialMap[s.user_id].push(s);
      });

      const creatorList: Creator[] = profiles.map((p: any) => ({
        ...p,
        socials: socialMap[p.user_id] || [],
      }));

      setCreators(creatorList);
      setFiltered(creatorList);
      const loadedCampaigns = (campaignsRes.data as any) || [];
      setCampaigns(loadedCampaigns);
      setBrandCampaignData(loadedCampaigns);
      setLoading(false);
    };
    load();
  }, [user]);

  const matchItems = creators.map(c => ({
    user_id: c.user_id, display_name: c.display_name, bio: c.bio,
    platforms: c.socials.map(s => s.platform),
    followers: c.socials.reduce((sum, s) => sum + (s.followers_count || 0), 0),
  }));

  const { matches: creatorMatches, loading: matchLoading } = useAIMatch(
    "campaign_to_creators",
    { campaigns: brandCampaignData },
    matchItems,
    !loading && creators.length > 0 && brandCampaignData.length > 0
  );

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    if (pct >= 60) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    if (pct >= 40) return "bg-orange-500/15 text-orange-600 border-orange-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  useEffect(() => {
    let result = creators;
    
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        c.socials.some((s) => (s.platform_username || "").toLowerCase().includes(q))
      );
    }

    if (platformFilter !== "all") {
      result = result.filter((c) => c.socials.some((s) => s.platform === platformFilter));
    }

    const range = followerRanges[followerFilter];
    if (range && range.min > 0) {
      result = result.filter((c) => {
        const total = c.socials.reduce((sum, s) => sum + (s.followers_count || 0), 0);
        return total >= range.min && total < range.max;
      });
    }

    result.sort((a, b) => (creatorMatches[b.user_id] || 0) - (creatorMatches[a.user_id] || 0));
    setFiltered(result);
  }, [search, creators, platformFilter, followerFilter, creatorMatches]);

  const handleInvite = async () => {
    if (!user || !inviteCreator || !selectedCampaignId) return;
    setSending(true);

    const { error } = await supabase.from("campaign_invites").insert({
      campaign_id: selectedCampaignId,
      brand_user_id: user.id,
      creator_user_id: inviteCreator.user_id,
      message: inviteMessage || null,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // Create private DM
    const { data: privateRoom } = await supabase.from("chat_rooms").insert({
      type: "private",
      campaign_id: selectedCampaignId,
      name: null,
    } as any).select("id").single();

    if (privateRoom) {
      await supabase.from("chat_participants").insert([
        { chat_room_id: privateRoom.id, user_id: user.id },
        { chat_room_id: privateRoom.id, user_id: inviteCreator.user_id },
      ] as any);

      const campaign = campaigns.find((c) => c.id === selectedCampaignId);
      const msgContent = `🎯 **Campaign Invite: ${campaign?.title || "Campaign"}**\n\n${inviteMessage || "You've been invited to apply to this campaign!"}\n\n[CAMPAIGN_INVITE:${selectedCampaignId}]`;
      await supabase.from("messages").insert({
        chat_room_id: privateRoom.id,
        sender_id: user.id,
        content: msgContent,
      } as any);
    }

    await supabase.from("notifications").insert({
      user_id: inviteCreator.user_id,
      type: "invite",
      title: "Campaign Invite",
      body: `You've been invited to apply to a campaign!`,
      link: "/dashboard/messages",
    } as any);

    toast({ title: "Invite sent!", description: `Invited ${inviteCreator.display_name || "creator"} to campaign.` });
    setInviteCreator(null);
    setSelectedCampaignId("");
    setInviteMessage("");
    setSending(false);
  };

  const totalFollowers = (c: Creator) => c.socials.reduce((sum, s) => sum + (s.followers_count || 0), 0);
  const hasActiveFilters = platformFilter !== "all" || followerFilter !== 0 || search.trim() !== "";

  const handleViewCreator = async (creator: Creator) => {
    setViewingCreator(creator);
    // Fetch full social details
    const { data: socials } = await supabase.from("social_connections").select("*").eq("user_id", creator.user_id);
    setCreatorSocialDetails(socials || []);
    // Fetch past collaborations
    const { data: collabs } = await supabase.from("past_collaborations" as any).select("*").eq("user_id", creator.user_id).order("created_at", { ascending: false });
    setCreatorCollabs(collabs || []);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Find Creators</h1>
        <p className="text-muted-foreground text-sm">Browse creators and invite them to your campaigns</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or social handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platformOptions.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(followerFilter)} onValueChange={(v) => setFollowerFilter(Number(v))}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Followers" />
            </SelectTrigger>
            <SelectContent>
              {followerRanges.map((r, i) => (
                <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setSearch(""); setPlatformFilter("all"); setFollowerFilter(0); }}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} creator{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No creators found</p>
            {hasActiveFilters && <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator) => {
            const matchPct = creatorMatches[creator.user_id] || 0;
            return (
            <Card key={creator.user_id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-lg">{(creator.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground truncate">{creator.display_name || "Creator"}</p>
                      {matchPct > 0 && (
                        <Badge className={`shrink-0 text-[11px] font-bold border ${getMatchColor(matchPct)}`}>
                          <Sparkles className="h-3 w-3 mr-0.5" />{matchPct}%
                        </Badge>
                      )}
                    </div>
                    {creator.username && <p className="text-xs text-muted-foreground">@{creator.username}</p>}
                    {creator.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{creator.bio}</p>}
                  </div>
                </div>

                {creator.socials.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {creator.socials.map((s, i) => {
                      const Icon = platformIcons[s.platform] || Users;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">@{s.platform_username || s.platform}</span>
                          <span className="ml-auto text-foreground font-medium">{(s.followers_count || 0).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No socials connected</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{totalFollowers(creator).toLocaleString()} total followers</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewCreator(creator)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => setInviteCreator(creator)}>
                      <Send className="h-3.5 w-3.5" /> Invite
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={!!inviteCreator} onOpenChange={(open) => { if (!open) { setInviteCreator(null); setSelectedCampaignId(""); setInviteMessage(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite {inviteCreator?.display_name || "Creator"}</DialogTitle>
            <DialogDescription>Select a campaign and send an optional message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Campaign *</label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaigns.length === 0 && (
                <p className="text-xs text-destructive mt-1">You need an active campaign first</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Message (optional)</label>
              <Textarea
                placeholder="Hi! We'd love to collaborate with you on our upcoming campaign..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={sending || !selectedCampaignId}
              className="w-full"
            >
              {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creator Full Profile Sheet */}
      <Sheet open={!!viewingCreator} onOpenChange={(open) => { if (!open) setViewingCreator(null); }}>
        <SheetContent className="w-96 sm:w-[28rem] bg-card border-border/50 p-0">
          <SheetHeader className="p-4 border-b border-border/30">
            <SheetTitle className="text-base font-heading">Creator Profile</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            {viewingCreator && (
              <div className="p-5 space-y-5">
                {/* Avatar + Name */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 ring-2 ring-border/30">
                    <AvatarImage src={viewingCreator.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-2xl font-semibold">
                      {(viewingCreator.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-heading font-bold text-foreground mt-3">
                    {viewingCreator.display_name || "Creator"}
                  </h3>
                  {viewingCreator.username && (
                    <p className="text-sm text-muted-foreground">@{viewingCreator.username}</p>
                  )}
                </div>

                {/* Bio */}
                {viewingCreator.bio && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">About</p>
                      <p className="text-sm text-foreground leading-relaxed">{viewingCreator.bio}</p>
                    </div>
                  </>
                )}

                {/* Social Platforms */}
                {creatorSocialDetails.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-3">Platforms</p>
                      <div className="space-y-3">
                        {creatorSocialDetails.map((s: any) => {
                          const Icon = platformIcons[s.platform] || Users;
                          const color = platformColors[s.platform] || "text-foreground";
                          return (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2.5">
                                <Icon className={`h-5 w-5 ${color}`} />
                                <div>
                                  <p className="text-sm font-medium capitalize text-foreground">{s.platform}</p>
                                  {s.platform_username && <p className="text-xs text-muted-foreground">@{s.platform_username}</p>}
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                <p className="text-foreground font-medium">{formatCount(s.followers_count)} followers</p>
                                {s.average_views != null && <p className="text-muted-foreground">{formatCount(s.average_views)} avg views</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {creatorSocialDetails.filter((s: any) => s.profile_url).length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {creatorSocialDetails.filter((s: any) => s.profile_url).map((s: any) => {
                            const Icon = platformIcons[s.platform] || Globe;
                            const color = platformColors[s.platform] || "text-primary";
                            return (
                              <a key={s.id} href={s.profile_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 text-xs ${color} hover:underline`}>
                                <Icon className="h-3 w-3" /> View {s.platform} profile →
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Past Collaborations */}
                {creatorCollabs.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Past Collaborations</p>
                      <div className="space-y-2">
                        {creatorCollabs.map((c: any) => (
                          <div key={c.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/30">
                            <Briefcase className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.brand_name}</p>
                              {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Invite button */}
                <Separator />
                <Button className="w-full gap-2" onClick={() => { setViewingCreator(null); setInviteCreator(viewingCreator); }}>
                  <Send className="h-4 w-4" /> Invite to Campaign
                </Button>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FindCreators;