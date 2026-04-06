import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle, Calendar, Loader2, XCircle, Copy, StopCircle, Users,
  Check, X, Instagram, Facebook, Video, ExternalLink, MessageSquare, Phone,
} from "lucide-react";
import CampaignResources from "@/components/brand/CampaignResources";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };

interface Props {
  campaignId: string;
}

const CampaignSettings = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [groupChatEnabled, setGroupChatEnabled] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);
  const [removingCreator, setRemovingCreator] = useState<any>(null);
  const [removingLoading, setRemovingLoading] = useState(false);
  const [removalMessage, setRemovalMessage] = useState("");
  const [campaignResources, setCampaignResources] = useState<any[]>([]);
  const [contactShares, setContactShares] = useState<any[]>([]);
  const [videoSubmissions, setVideoSubmissions] = useState<any[]>([]);

  // Creator profile dialog
  const [viewingCreator, setViewingCreator] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorSocials, setCreatorSocials] = useState<any[]>([]);
  const [creatorApps, setCreatorApps] = useState<any[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      const { data: campData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (campData) {
        setCampaign(campData);
        setGroupChatEnabled((campData as any).group_chat_enabled ?? true);
        setScheduleEnabled((campData as any).posting_schedule_enabled ?? true);
      }
      setLoading(false);
      await loadApplications();
    };
    loadAll();
  }, [campaignId]);

  const loadApplications = async () => {
    setLoadingApps(true);
    const [appsRes, resourcesRes, sharesRes, subsRes] = await Promise.all([
      supabase.from("campaign_applications").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }),
      supabase.from("campaign_resources" as any).select("*").eq("campaign_id", campaignId).order("display_order"),
      supabase.from("contact_shares" as any).select("*").eq("campaign_id", campaignId),
      supabase.from("video_submissions").select("*").eq("campaign_id", campaignId),
    ]);
    const apps = (appsRes.data as any) || [];
    setCampaignResources((resourcesRes.data as any) || []);
    setContactShares((sharesRes.data as any) || []);
    setVideoSubmissions((subsRes.data as any) || []);
    const creatorIds = [...new Set(apps.map((a: any) => a.creator_user_id))];
    if (creatorIds.length > 0) {
      const [profilesRes, socialsRes] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", creatorIds as string[]),
        supabase.from("social_connections").select("*").in("user_id", creatorIds as string[]),
      ]);
      const profilesMap: Record<string, any> = {};
      (profilesRes.data || []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      const socialsMap: Record<string, any[]> = {};
      (socialsRes.data || []).forEach((s: any) => {
        if (!socialsMap[s.user_id]) socialsMap[s.user_id] = [];
        socialsMap[s.user_id].push(s);
      });
      apps.forEach((a: any) => {
        a._profile = profilesMap[a.creator_user_id] || null;
        a._socials = socialsMap[a.creator_user_id] || [];
      });
    }
    setApplications(apps);
    setLoadingApps(false);
  };

  const handleToggle = async (field: string, value: boolean) => {
    setSaving(true);
    const update: any = {};
    update[field] = value;
    await supabase.from("campaigns").update(update).eq("id", campaignId);
    toast({ title: "Setting updated" });
    setSaving(false);
  };

  const handleEndCampaign = async () => {
    setEnding(true);
    await supabase.from("campaigns").update({ status: "ended" }).eq("id", campaignId);
    toast({ title: "Campaign ended", description: "This campaign has been marked as ended." });
    setEnding(false);
    navigate("/brand/campaigns");
  };

  const handleReuseCampaign = () => {
    if (!campaign) return;
    navigate("/brand/campaigns/new", {
      state: {
        reuse: {
          title: campaign.title,
          description: campaign.description,
          platforms: campaign.platforms,
          is_free_product: campaign.is_free_product,
          price_per_video: campaign.price_per_video,
          expected_video_count: campaign.expected_video_count,
          campaign_length_days: campaign.campaign_length_days,
          requirements: campaign.requirements,
          target_regions: campaign.target_regions,
          max_creators: campaign.max_creators,
          communication_type: campaign.communication_type,
          external_comm_link: campaign.external_comm_link,
          request_contact_types: campaign.request_contact_types,
          calendly_enabled: campaign.calendly_enabled,
          calendly_link: campaign.calendly_link,
        },
      },
    });
  };

  const handleApplicationAction = async (appId: string, status: "accepted" | "rejected", app: any) => {
    if (!user || !campaign) return;
    setUpdatingApp(appId);

    const { error } = await supabase.from("campaign_applications").update({ status } as any).eq("id", appId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUpdatingApp(null);
      return;
    }

    if (status === "accepted") {
      const maxCreators = campaign.max_creators || 10;
      let groupRoomId: string | null = null;

      if (maxCreators > 1) {
        let { data: existingGroup } = await supabase
          .from("chat_rooms").select("id")
          .eq("campaign_id", campaign.id).eq("type", "group").maybeSingle();

        if (!existingGroup) {
          const { data: newGroup, error: groupError } = await supabase.from("chat_rooms").insert({
            type: "group", campaign_id: campaign.id, name: campaign.title,
          } as any).select("id").single();
          if (!groupError && newGroup) {
            groupRoomId = newGroup.id;
            await supabase.from("chat_participants").insert({ chat_room_id: groupRoomId, user_id: user.id } as any);
            await supabase.from("messages").insert({
              chat_room_id: groupRoomId, sender_id: user.id, pinned: true,
              content: `Welcome to the ${campaign.title} campaign group chat. This space is for the brand and accepted creators to coordinate together.`,
            } as any);
          }
        } else {
          groupRoomId = existingGroup.id;
        }

        if (groupRoomId) {
          await supabase.from("chat_participants").upsert({ chat_room_id: groupRoomId, user_id: app.creator_user_id } as any, { onConflict: "chat_room_id,user_id" });
          await supabase.from("messages").insert({
            chat_room_id: groupRoomId, sender_id: user.id,
            content: `📥 ${app._profile?.display_name || app._profile?.username || "A creator"} joined the chat`,
          } as any);
        }
      }

      // Private chat
      const { data: existingPrivateParticipant } = await supabase
        .from("chat_participants").select("chat_room_id").eq("user_id", app.creator_user_id);
      let privateRoomId: string | null = null;
      if (existingPrivateParticipant?.length) {
        const existingRoomIds = existingPrivateParticipant.map((row: any) => row.chat_room_id);
        const { data: existingPrivateRooms } = await supabase
          .from("chat_rooms").select("id").eq("campaign_id", campaign.id).eq("type", "private").in("id", existingRoomIds);
        if (existingPrivateRooms?.length) {
          for (const room of existingPrivateRooms) {
            const { data: roomParticipants } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id);
            const participantIds = (roomParticipants || []).map((p: any) => p.user_id);
            if (participantIds.includes(user.id) && participantIds.includes(app.creator_user_id)) {
              privateRoomId = room.id;
              break;
            }
          }
        }
      }
      if (!privateRoomId) {
        const creatorName = app._profile?.display_name || app._profile?.username || "Creator";
        const { data: privateRoom, error: privateError } = await supabase.from("chat_rooms").insert({
          type: "private", campaign_id: campaign.id, name: creatorName,
        } as any).select("id").single();
        if (!privateError && privateRoom) {
          privateRoomId = privateRoom.id;
          const participantIds = [...new Set([user.id, app.creator_user_id])];
          await supabase.from("chat_participants").insert(
            participantIds.map((pid) => ({ chat_room_id: privateRoom.id, user_id: pid })) as any
          );
          await supabase.from("messages").insert({
            chat_room_id: privateRoom.id, sender_id: user.id,
            content: `Hi ${app._profile?.display_name || app._profile?.username || "there"}! Welcome to ${campaign.title}. This private chat is now open so we can discuss the campaign details one-on-one.`,
          } as any);
        }
      }

      const acceptedCount = applications.filter((a) => a.status === "accepted").length + 1;
      if (acceptedCount >= maxCreators) {
        await supabase.from("campaigns").update({ status: "ended" } as any).eq("id", campaign.id);
        setCampaign({ ...campaign, status: "ended" });
        toast({ title: "Campaign auto-closed", description: `All ${maxCreators} influencer spot${maxCreators > 1 ? "s" : ""} filled!` });
      }
    }

    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
    await supabase.from("notifications" as any).insert({
      user_id: app.creator_user_id,
      type: "application_update",
      title: status === "accepted" ? "Application Accepted!" : "Application Update",
      body: status === "accepted" ? `You've been accepted to "${campaign.title}"` : `Your application to "${campaign.title}" was not selected.`,
      link: status === "accepted" ? "/dashboard/messages" : "/dashboard",
    } as any);
    toast({ title: status === "accepted" ? "Creator accepted!" : "Application rejected" });
    setUpdatingApp(null);
  };

  const handleRemoveCreator = async () => {
    if (!removingCreator || !user || !campaign || !removalMessage.trim()) {
      toast({ title: "Please provide a reason for removal", variant: "destructive" });
      return;
    }
    setRemovingLoading(true);
    const app = removingCreator;
    const msg = removalMessage.trim();
    await supabase.from("campaign_applications").update({ status: "removed" } as any).eq("id", app.id);
    const { data: groupRoom } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaign.id).eq("type", "group").maybeSingle();
    if (groupRoom) {
      await supabase.from("messages").insert({
        chat_room_id: groupRoom.id, sender_id: user.id,
        content: `📤 ${app._profile?.display_name || app._profile?.username || "A creator"} left the chat`,
      } as any);
    }
    const { data: privateRooms } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaign.id).eq("type", "private");
    if (privateRooms?.length) {
      for (const room of privateRooms) {
        const { data: participants } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id);
        const pIds = (participants || []).map((p: any) => p.user_id);
        if (pIds.includes(user.id) && pIds.includes(app.creator_user_id)) {
          await supabase.from("messages").insert({
            chat_room_id: room.id, sender_id: user.id,
            content: `⚠️ You have been removed from the campaign "${campaign.title}".\n\nReason: ${msg}\n\nVideos delivered: ${app.videos_delivered || 0}`,
          } as any);
          break;
        }
      }
    }
    await supabase.from("notifications" as any).insert({
      user_id: app.creator_user_id, type: "application_update",
      title: "Removed from Campaign",
      body: `You have been removed from "${campaign.title}". Reason: ${msg}`,
      link: "/dashboard/messages",
    } as any);
    setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "removed" } : a));
    toast({ title: "Creator removed from campaign" });
    setRemovingCreator(null);
    setRemovalMessage("");
    setRemovingLoading(false);
  };

  const viewCreatorProfile = async (creatorUserId: string) => {
    setViewingCreator(creatorUserId);
    setCreatorProfile(null);
    setCreatorSocials([]);
    setCreatorApps([]);
    const [profileRes, socialsRes, appsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", creatorUserId).single(),
      supabase.from("social_connections").select("*").eq("user_id", creatorUserId),
      supabase.from("campaign_applications").select("id, campaign_id, status, created_at").eq("creator_user_id", creatorUserId),
    ]);
    setCreatorProfile(profileRes.data);
    setCreatorSocials(socialsRes.data || []);
    const apps = appsRes.data || [];
    if (apps.length > 0) {
      const campIds = [...new Set(apps.map((a: any) => a.campaign_id))] as string[];
      const { data: camps } = await supabase.from("campaigns").select("id, title").in("id", campIds);
      const campMap: Record<string, string> = {};
      (camps || []).forEach((c: any) => { campMap[c.id] = c.title; });
      setCreatorApps(apps.map((a: any) => ({ ...a, _title: campMap[a.campaign_id] || "Campaign" })));
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!campaign) return null;

  return (
    <div className="space-y-6">
      {/* Campaign Overview */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-heading">{campaign.title}</CardTitle>
            <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="capitalize">{campaign.status}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap mt-1">
            {campaign.platforms?.map((p: string) => <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Compensation</p>
              <p className="text-sm font-medium text-foreground">{campaign.is_free_product ? "Free Product" : `HK$${campaign.price_per_video}/video`}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Videos per Creator</p>
              <p className="text-sm font-medium text-foreground">{campaign.expected_video_count}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Influencer Spots</p>
              <p className="text-sm font-medium text-foreground">{applications.filter((a) => a.status === "accepted").length}/{campaign.max_creators || 10}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Target Regions</p>
              <p className="text-sm font-medium text-foreground">{campaign.target_regions?.join(", ") || "Worldwide"}</p>
            </div>
          </div>
          {campaign.requirements && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Requirements</p>
              <p className="text-sm text-foreground">{campaign.requirements}</p>
            </div>
          )}

          {/* Communication info */}
          <div className="grid grid-cols-2 gap-3">
            {campaign.communication_type && campaign.communication_type !== "in_app_chat" && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Communication</p>
                <p className="text-sm font-medium text-foreground capitalize flex items-center gap-1">
                  {campaign.communication_type === "external" ? (
                    <><ExternalLink className="h-3.5 w-3.5" /> External Link</>
                  ) : (
                    <><MessageSquare className="h-3.5 w-3.5" /> Request Contact</>
                  )}
                </p>
              </div>
            )}
            {campaign.calendly_enabled && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Call Scheduling</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Calendly Enabled
                </p>
              </div>
            )}
          </div>

          {/* Contact shares */}
          {campaign.communication_type === "request_contact" && contactShares.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Creator Contact Info</p>
              <div className="space-y-2">
                {contactShares.map((share: any) => {
                  const app = applications.find((a: any) => a.creator_user_id === share.creator_user_id);
                  const name = app?._profile?.display_name || app?._profile?.username || "Creator";
                  return (
                    <div key={share.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 text-sm">
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="text-muted-foreground capitalize">{share.contact_type.replace("_", " ")}:</span>
                      <span className="text-foreground">{share.contact_value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReuseCampaign}>
              <Copy className="h-3.5 w-3.5" /> Reuse Campaign
            </Button>
            {campaign.status === "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <StopCircle className="h-3.5 w-3.5" /> End Campaign
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently end the campaign. All creators will be notified and no new applications will be accepted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={ending}>
                      {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : "End Campaign"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Resources */}
      <CampaignResources
        campaignId={campaignId}
        resources={campaignResources}
        onUpdate={loadApplications}
      />

      {/* Toggle Settings */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Campaign Settings</h3>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground">Group Chat</Label>
                  <p className="text-xs text-muted-foreground">When off, only private messages between you and each creator</p>
                </div>
              </div>
              <Switch checked={groupChatEnabled} onCheckedChange={(v) => { setGroupChatEnabled(v); handleToggle("group_chat_enabled", v); }} disabled={saving} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground">Posting Schedule</Label>
                  <p className="text-xs text-muted-foreground">Show a posting schedule calendar to accepted creators</p>
                </div>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={(v) => { setScheduleEnabled(v); handleToggle("posting_schedule_enabled", v); }} disabled={saving} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Creators */}
      <div>
        <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Current Creators</h3>
        {loadingApps ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (() => {
          const current = applications.filter(a => a.status === "accepted");
          return current.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-sm">No active creators</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {current.map((app) => {
                const creatorSubs = videoSubmissions.filter(s => s.creator_user_id === app.creator_user_id);
                const accepted = creatorSubs.filter(s => s.status === "accepted").length;
                const pending = creatorSubs.filter(s => s.status === "pending").length;
                return (
                  <Card key={app.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={app._profile?.avatar_url} />
                              <AvatarFallback className="bg-secondary text-xs">{(app._profile?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm">{app._profile?.display_name || app._profile?.username || "Creator"}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                {app._profile?.username && <span>@{app._profile.username}</span>}
                                <span>Joined {new Date(app.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs flex-wrap">
                            <Badge variant="secondary">{accepted} accepted</Badge>
                            {pending > 0 && <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-500 dark:border-yellow-500/30">{pending} pending</Badge>}
                            <Badge variant="outline">{creatorSubs.length} total submitted</Badge>
                          </div>
                          {app._socials?.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {app._socials.map((s: any) => {
                                const Icon = platformIcons[s.platform] || Users;
                                return (
                                  <Badge key={s.id} variant="secondary" className="text-xs gap-1">
                                    <Icon className="h-3 w-3" /> {s.platform} · {s.followers_count?.toLocaleString() || 0}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <Button variant="link" size="sm" className="px-0 mt-1 h-auto" onClick={() => viewCreatorProfile(app.creator_user_id)}>
                            View Full Profile →
                          </Button>
                        </div>
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive shrink-0" onClick={() => { setRemovingCreator(app); setRemovalMessage(""); }}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Applications (Pending) */}
      {(() => {
        const pending = applications.filter(a => a.status === "pending");
        if (pending.length === 0) return null;
        return (
          <div>
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Pending Applications ({pending.length})</h3>
            <div className="space-y-3">
              {pending.map((app) => (
                <Card key={app.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={app._profile?.avatar_url} />
                            <AvatarFallback className="bg-secondary text-xs">{(app._profile?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{app._profile?.display_name || app._profile?.username || "Creator"}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                              {app._profile?.username && <span>@{app._profile.username}</span>}
                              <span>{new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {app._socials?.length > 0 && (
                          <div className="flex gap-1.5 mb-2 flex-wrap">
                            {app._socials.map((s: any) => {
                              const Icon = platformIcons[s.platform] || Users;
                              return (
                                <Badge key={s.id} variant="secondary" className="text-xs gap-1">
                                  <Icon className="h-3 w-3" /> {s.platform} · {s.followers_count?.toLocaleString() || 0}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-3">{app.cover_letter}</p>
                        <Button variant="link" size="sm" className="px-0 mt-1 h-auto" onClick={() => viewCreatorProfile(app.creator_user_id)}>
                          View Full Profile →
                        </Button>
                      </div>
                      {campaign.status === "active" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-500" disabled={updatingApp === app.id} onClick={() => handleApplicationAction(app.id, "accepted", app)}>
                            {updatingApp === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={updatingApp === app.id} onClick={() => handleApplicationAction(app.id, "rejected", app)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Past Creators */}
      {(() => {
        const past = applications.filter(a => ["removed", "rejected"].includes(a.status));
        if (past.length === 0) return null;
        return (
          <div>
            <h3 className="font-medium text-muted-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Past Creators ({past.length})</h3>
            <div className="space-y-2">
              {past.map((app) => {
                const creatorSubs = videoSubmissions.filter(s => s.creator_user_id === app.creator_user_id);
                const accepted = creatorSubs.filter(s => s.status === "accepted").length;
                return (
                  <Card key={app.id} className="border-border/50 opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={app._profile?.avatar_url} />
                            <AvatarFallback className="bg-secondary text-xs">{(app._profile?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">{app._profile?.display_name || app._profile?.username || "Creator"}</p>
                            <p className="text-xs text-muted-foreground">{accepted} video{accepted !== 1 ? "s" : ""} delivered · {creatorSubs.length} submitted</p>
                          </div>
                        </div>
                        <Badge variant="destructive" className="text-xs capitalize">{app.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Creator Profile Dialog */}
      <Dialog open={!!viewingCreator} onOpenChange={(open) => !open && setViewingCreator(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creator Profile</DialogTitle>
          </DialogHeader>
          {!creatorProfile ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={creatorProfile.avatar_url} />
                  <AvatarFallback className="bg-secondary text-xl">{(creatorProfile.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-heading font-bold text-foreground">{creatorProfile.display_name || creatorProfile.username || "Creator"}</p>
                  {creatorProfile.username && <p className="text-sm text-muted-foreground">@{creatorProfile.username}</p>}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    {creatorProfile.gender && <span>{creatorProfile.gender}</span>}
                    {creatorProfile.country && <span className="flex items-center gap-0.5">📍 {creatorProfile.country}</span>}
                    <span>Joined {new Date(creatorProfile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Bio</p>
                <p className="text-sm text-foreground">{creatorProfile.bio || "No bio provided"}</p>
              </div>
              {creatorProfile.content_types?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Content Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {creatorProfile.content_types.map((t: string) => (
                      <Badge key={t} className="bg-primary/10 text-primary border-0 text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Connected Platforms</p>
                {creatorSocials.length > 0 ? (
                  <div className="space-y-2">
                    {creatorSocials.map((s: any) => {
                      const Icon = platformIcons[s.platform] || Users;
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                          <Icon className="h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <span className="capitalize font-medium text-foreground">{s.platform}</span>
                            {s.platform_username && <span className="text-muted-foreground ml-2">@{s.platform_username}</span>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">{(s.followers_count || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">followers</p>
                          </div>
                          {s.profile_url && (
                            <a href={s.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 shrink-0">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No platforms connected yet</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Campaign History</p>
                {creatorApps.length > 0 ? (
                  <div className="space-y-1.5">
                    {creatorApps.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-sm">
                        <span className="text-foreground truncate flex-1 mr-2">{a._title}</span>
                        <Badge variant={a.status === "accepted" ? "default" : a.status === "pending" ? "outline" : "destructive"} className="text-xs capitalize shrink-0">{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No campaign applications yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Creator Dialog */}
      <Dialog open={!!removingCreator} onOpenChange={(open) => { if (!open) { setRemovingCreator(null); setRemovalMessage(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removingCreator?._profile?.display_name || "creator"} from campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
              <p className="text-muted-foreground">Videos delivered: <span className="font-medium text-foreground">{removingCreator?.videos_delivered || 0} / {campaign?.expected_video_count || 0}</span></p>
              <p className="text-xs text-muted-foreground">They will be removed from the group chat. The private message thread will remain.</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Reason for removal <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Explain to the creator why they are being removed..."
                value={removalMessage}
                onChange={(e) => setRemovalMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">This message will be sent to the creator via private chat.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setRemovingCreator(null); setRemovalMessage(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleRemoveCreator} disabled={removingLoading || !removalMessage.trim()}>
                {removingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Remove permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignSettings;
