import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";
import {
  Loader2, Search, MessageSquare, Eye, Video, Link2, X, Mail,
  ChevronDown, ChevronUp, Users, ExternalLink, Filter
} from "lucide-react";

interface Props {
  campaignId: string;
}

const platformIcons: Record<string, any> = {
  tiktok: Video,
  instagram: Eye,
  youtube: Video,
};

const AllCreators = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "accepted" | "past">("all");
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<Record<string, "videos" | "links" | null>>({});
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [removingCreator, setRemovingCreator] = useState<any>(null);
  const [removalMessage, setRemovalMessage] = useState("");
  const [removingLoading, setRemovingLoading] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);

  // View profile state
  const [viewingCreator, setViewingCreator] = useState<string | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorSocials, setCreatorSocials] = useState<any[]>([]);

  const loadData = async () => {
    const [campRes, appsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("campaign_applications").select("*").eq("campaign_id", campaignId).in("status", ["accepted", "removed", "left"]),
    ]);
    setCampaign(campRes.data);
    const apps = appsRes.data || [];
    if (apps.length === 0) { setCreators([]); setLoading(false); return; }

    const creatorIds = [...new Set(apps.map((a: any) => a.creator_user_id))] as string[];
    const [profilesRes, socialsRes, subsRes, linksRes, emailsRes] = await Promise.all([
      supabase.from("profiles").select("*").in("user_id", creatorIds),
      supabase.from("social_connections").select("*").in("user_id", creatorIds),
      supabase.from("video_submissions").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      supabase.from("posted_video_links").select("*, video_submissions!inner(campaign_id, creator_user_id)").eq("video_submissions.campaign_id", campaignId),
      supabase.rpc("get_campaign_creator_emails", { _campaign_id: campaignId }),
    ]);

    const emailMap: Record<string, string> = {};
    ((emailsRes.data as any) || []).forEach((e: any) => { emailMap[e.user_id] = e.email; });
    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    const socialMap: Record<string, any[]> = {};
    (socialsRes.data || []).forEach((s: any) => {
      if (!socialMap[s.user_id]) socialMap[s.user_id] = [];
      socialMap[s.user_id].push(s);
    });
    const subMap: Record<string, any[]> = {};
    (subsRes.data || []).forEach((s: any) => {
      if (!subMap[s.creator_user_id]) subMap[s.creator_user_id] = [];
      subMap[s.creator_user_id].push(s);
    });
    const linkMap: Record<string, any[]> = {};
    ((linksRes.data as any) || []).forEach((l: any) => {
      const cuid = l.video_submissions?.creator_user_id;
      if (cuid) {
        if (!linkMap[cuid]) linkMap[cuid] = [];
        linkMap[cuid].push(l);
      }
    });

    const result = apps.map((a: any) => ({
      ...a,
      _profile: profileMap[a.creator_user_id] || {},
      _socials: socialMap[a.creator_user_id] || [],
      _submissions: subMap[a.creator_user_id] || [],
      _links: linkMap[a.creator_user_id] || [],
      _email: emailMap[a.creator_user_id] || null,
    }));

    setCreators(result);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [campaignId]);

  const handleMessageCreator = async (creatorUserId: string) => {
    if (!user) return;
    // Find or identify existing private chat for this campaign
    const { data: rooms } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private");
    if (rooms?.length) {
      for (const room of rooms) {
        const { data: participants } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id);
        const pIds = (participants || []).map((p: any) => p.user_id);
        if (pIds.includes(user.id) && pIds.includes(creatorUserId)) {
          navigate("/brand/messages");
          return;
        }
      }
    }
    // Create new private chat
    const { data: newRoom } = await supabase.from("chat_rooms").insert({ campaign_id: campaignId, type: "private" } as any).select("id").single();
    if (newRoom) {
      await supabase.from("chat_participants").insert([
        { chat_room_id: newRoom.id, user_id: user.id },
        { chat_room_id: newRoom.id, user_id: creatorUserId },
      ] as any);
    }
    navigate("/brand/messages");
  };

  const handleRemoveCreator = async () => {
    if (!removingCreator || !user || !campaign || !removalMessage.trim()) return;
    setRemovingLoading(true);
    const app = removingCreator;
    const msg = removalMessage.trim();
    await supabase.from("campaign_applications").update({ status: "removed" } as any).eq("id", app.id);

    // Send message via private chat
    const { data: privateRooms } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private");
    if (privateRooms?.length) {
      for (const room of privateRooms) {
        const { data: participants } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id);
        const pIds = (participants || []).map((p: any) => p.user_id);
        if (pIds.includes(user.id) && pIds.includes(app.creator_user_id)) {
          await supabase.from("messages").insert({
            chat_room_id: room.id, sender_id: user.id,
            content: `⚠️ You have been removed from the campaign "${campaign.title}".\n\nReason: ${msg}`,
          } as any);
          break;
        }
      }
    }
    await supabase.from("notifications").insert({
      user_id: app.creator_user_id, type: "application_update",
      title: "Removed from Campaign",
      body: `You have been removed from "${campaign.title}". Reason: ${msg}`,
      link: "/dashboard/messages",
    });
    toast({ title: "Creator removed" });
    setRemovingCreator(null);
    setRemovalMessage("");
    setRemovingLoading(false);
    loadData();
  };

  const viewFullProfile = async (userId: string) => {
    setViewingCreator(userId);
    setCreatorProfile(null);
    const [pRes, sRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("social_connections").select("*").eq("user_id", userId),
    ]);
    setCreatorProfile(pRes.data);
    setCreatorSocials(sRes.data || []);
  };

  const toggleSection = (creatorId: string, section: "videos" | "links") => {
    setExpandedSection(prev => ({
      ...prev,
      [creatorId]: prev[creatorId] === section ? null : section,
    }));
  };

  const filtered = creators.filter(c => {
    if (filterStatus === "accepted" && c.status !== "accepted") return false;
    if (filterStatus === "past" && c.status === "accepted") return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (c._profile?.display_name || "").toLowerCase();
      const uname = (c._profile?.username || "").toLowerCase();
      const email = (c._email || "").toLowerCase();
      if (!name.includes(q) && !uname.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "accepted", "past"] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant={filterStatus === s ? "default" : "outline"}
              className="text-xs capitalize"
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : s === "past" ? "Past" : s} {s === "all" ? `(${creators.length})` : s === "accepted" ? `(${creators.filter(c => c.status === "accepted").length})` : `(${creators.filter(c => c.status !== "accepted").length})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Creator List */}
      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No creators found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const profile = c._profile;
            const subs = c._submissions;
            const links = c._links;
            const pending = subs.filter((s: any) => s.status === "pending").length;
            const accepted = subs.filter((s: any) => s.status === "accepted").length;
            const isExpanded = expandedSection[c.creator_user_id];

            return (
              <Card key={c.id} className="border-border/50">
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-secondary text-xs">{(profile?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{profile?.display_name || profile?.username || "Creator"}</p>
                        <Badge variant={c.status === "accepted" ? "default" : "destructive"} className="text-[10px] capitalize">{c.status === "accepted" ? "Active" : "Past"}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {profile?.username && <span>@{profile.username}</span>}
                        {c._email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c._email}</span>}
                        <span>{accepted} accepted · {pending} pending · {subs.length} total videos</span>
                        <span>{links.length} link{links.length !== 1 ? "s" : ""} posted</span>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => viewFullProfile(c.creator_user_id)}>
                        <Eye className="h-3 w-3" /> Profile
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleMessageCreator(c.creator_user_id)}>
                        <MessageSquare className="h-3 w-3" /> Message
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => toggleSection(c.creator_user_id, "videos")}
                      >
                        <Video className="h-3 w-3" /> Videos ({subs.length})
                        {isExpanded === "videos" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        onClick={() => toggleSection(c.creator_user_id, "links")}
                      >
                        <Link2 className="h-3 w-3" /> Links ({links.length})
                        {isExpanded === "links" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      {c.status === "accepted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => { setRemovingCreator(c); setRemovalMessage(""); }}
                        >
                          <X className="h-3 w-3" /> Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded: Video Submissions */}
                  {isExpanded === "videos" && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      {subs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No video submissions yet</p>
                      ) : subs.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Badge variant={s.status === "accepted" ? "default" : s.status === "rejected" ? "destructive" : "outline"} className="text-[10px] capitalize">{s.status}</Badge>
                              <span>{new Date(s.created_at).toLocaleDateString()}</span>
                            </div>
                            {s.feedback && <p className="text-xs text-muted-foreground mt-1 italic">Feedback: {s.feedback}</p>}
                          </div>
                          <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-xs" onClick={() => setPlayingVideo({ url: s.video_url, title: s.title })}>
                            <Video className="h-3 w-3" /> Watch
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded: Link Submissions */}
                  {isExpanded === "links" && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                      {links.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">No links posted yet</p>
                      ) : links.map((l: any) => (
                        <div key={l.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] capitalize">{l.platform}</Badge>
                              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                                {l.url}
                              </a>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleDateString()}</p>
                          </div>
                          <a href={l.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-xs">
                              <ExternalLink className="h-3 w-3" /> Open
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Remove Dialog */}
      <Dialog open={!!removingCreator} onOpenChange={(o) => { if (!o) { setRemovingCreator(null); setRemovalMessage(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removingCreator?._profile?.display_name || "creator"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This message will be sent to the creator via private chat.</p>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Reason for removal <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Explain why you're removing this creator..."
                value={removalMessage}
                onChange={(e) => setRemovalMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRemovingCreator(null); setRemovalMessage(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleRemoveCreator} disabled={removingLoading || !removalMessage.trim()}>
                {removingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Profile Dialog */}
      <Dialog open={!!viewingCreator} onOpenChange={(o) => !o && setViewingCreator(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {creatorProfile ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creatorProfile.avatar_url} />
                    <AvatarFallback className="bg-secondary">{(creatorProfile.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading font-bold">{creatorProfile.display_name || creatorProfile.username || "Creator"}</p>
                    {creatorProfile.username && <p className="text-sm text-muted-foreground font-normal">@{creatorProfile.username}</p>}
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {creatorProfile.bio && <p className="text-sm text-muted-foreground">{creatorProfile.bio}</p>}
                <div className="flex gap-2 flex-wrap">
                  {creatorProfile.country && <Badge variant="secondary">{creatorProfile.country}</Badge>}
                  {creatorProfile.gender && <Badge variant="secondary" className="capitalize">{creatorProfile.gender}</Badge>}
                  {creatorProfile.content_types?.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
                {creatorSocials.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground">Socials</p>
                    {creatorSocials.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <p className="text-sm font-medium capitalize">{s.platform}</p>
                          {s.platform_username && <p className="text-xs text-muted-foreground">@{s.platform_username}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>{s.followers_count?.toLocaleString() || 0} followers</p>
                          <p>{s.average_views?.toLocaleString() || 0} avg views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
        </DialogContent>
      </Dialog>

      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default AllCreators;
