import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Users, Check, X, Loader2, Clock, Eye, Instagram, Facebook, Video, Copy, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };

const BrandCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [viewingCreator, setViewingCreator] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorSocials, setCreatorSocials] = useState<any[]>([]);
  const [creatorApps, setCreatorApps] = useState<any[]>([]);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);
  const [endingCampaign, setEndingCampaign] = useState<string | null>(null);
  const [campaignTab, setCampaignTab] = useState("active");
  const [removingCreator, setRemovingCreator] = useState<any>(null);
  const [removingLoading, setRemovingLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("campaigns").select("*").eq("brand_user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      const allCampaigns = (data as any) || [];
      setCampaigns(allCampaigns);
      setLoading(false);
      const state = location.state as any;
      if (state?.openCampaignId) {
        const target = allCampaigns.find((c: any) => c.id === state.openCampaignId);
        if (target) {
          setSelectedCampaign(target);
          setCampaignTab(target.status === "active" ? "active" : "ended");
          loadApplications(target.id);
        }
        window.history.replaceState({}, "");
      }
    });
  }, [user]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const endedCampaigns = campaigns.filter((c) => c.status !== "active");

  const loadApplications = async (campaignId: string) => {
    setLoadingApps(true);
    const { data } = await supabase.from("campaign_applications").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false });
    const apps = (data as any) || [];
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

  const handleApplicationAction = async (appId: string, status: "accepted" | "rejected", app: any) => {
    if (!user || !selectedCampaign) return;
    setUpdatingApp(appId);

    const { error } = await supabase.from("campaign_applications").update({ status } as any).eq("id", appId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUpdatingApp(null);
      return;
    }

    if (status === "accepted") {
      const maxCreators = selectedCampaign.max_creators || 10;
      let groupRoomId: string | null = null;

      if (maxCreators > 1) {
        let { data: existingGroup } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("campaign_id", selectedCampaign.id)
          .eq("type", "group")
          .maybeSingle();

        if (!existingGroup) {
          const { data: newGroup, error: groupError } = await supabase.from("chat_rooms").insert({
            type: "group",
            campaign_id: selectedCampaign.id,
            name: selectedCampaign.title,
          } as any).select("id").single();

          if (groupError || !newGroup) {
            console.error("Failed to create group chat:", groupError);
          } else {
            groupRoomId = newGroup.id;
            await supabase.from("chat_participants").insert({ chat_room_id: groupRoomId, user_id: user.id } as any);
            await supabase.from("messages").insert({
              chat_room_id: groupRoomId,
              sender_id: user.id,
              content: `Welcome to the ${selectedCampaign.title} campaign group chat. This space is for the brand and accepted creators to coordinate together.`,
            } as any);
          }
        } else {
          groupRoomId = existingGroup.id;
        }

        if (groupRoomId) {
          await supabase.from("chat_participants").upsert({ chat_room_id: groupRoomId, user_id: app.creator_user_id } as any, { onConflict: "chat_room_id,user_id" });
          await supabase.from("messages").insert({
            chat_room_id: groupRoomId,
            sender_id: user.id,
            content: `${app._profile?.display_name || app._profile?.username || "A creator"} has joined the campaign group chat.`,
          } as any);
        }
      }

      const { data: existingPrivateParticipant } = await supabase
        .from("chat_participants")
        .select("chat_room_id")
        .eq("user_id", app.creator_user_id);

      let privateRoomId: string | null = null;

      if (existingPrivateParticipant?.length) {
        const existingRoomIds = existingPrivateParticipant.map((row: any) => row.chat_room_id);
        const { data: existingPrivateRooms } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("campaign_id", selectedCampaign.id)
          .eq("type", "private")
          .in("id", existingRoomIds);

        if (existingPrivateRooms?.length) {
          for (const room of existingPrivateRooms) {
            const { data: roomParticipants } = await supabase
              .from("chat_participants")
              .select("user_id")
              .eq("chat_room_id", room.id);
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
          type: "private",
          campaign_id: selectedCampaign.id,
          name: creatorName,
        } as any).select("id").single();

        if (privateError) {
          console.error("Failed to create private chat:", privateError);
        } else if (privateRoom) {
          privateRoomId = privateRoom.id;
          const participantIds = [...new Set([user.id, app.creator_user_id])];
          await supabase.from("chat_participants").insert(
            participantIds.map((participantId) => ({ chat_room_id: privateRoom.id, user_id: participantId })) as any
          );
          await supabase.from("messages").insert({
            chat_room_id: privateRoom.id,
            sender_id: user.id,
            content: `Hi ${app._profile?.display_name || app._profile?.username || "there"}! Welcome to ${selectedCampaign.title}. This private chat is now open so we can discuss the campaign details one-on-one.`,
          } as any);
        }
      }

      const acceptedCount = applications.filter((a) => a.status === "accepted").length + 1;
      if (acceptedCount >= maxCreators) {
        await supabase.from("campaigns").update({ status: "ended" } as any).eq("id", selectedCampaign.id);
        setSelectedCampaign({ ...selectedCampaign, status: "ended" });
        setCampaigns((prev) => prev.map((c) => c.id === selectedCampaign.id ? { ...c, status: "ended" } : c));
        toast({ title: "Campaign auto-closed", description: `All ${maxCreators} influencer spot${maxCreators > 1 ? "s" : ""} filled!` });
      }
    }

    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));

    await supabase.from("notifications" as any).insert({
      user_id: app.creator_user_id,
      type: "application_update",
      title: status === "accepted" ? "Application Accepted!" : "Application Update",
      body: status === "accepted" ? `You've been accepted to "${selectedCampaign.title}"` : `Your application to "${selectedCampaign.title}" was not selected.`,
      link: status === "accepted" ? "/dashboard/messages" : "/dashboard",
    } as any);
    toast({ title: status === "accepted" ? "Creator accepted!" : "Application rejected" });
    setUpdatingApp(null);
  };

  const handleRemoveCreator = async () => {
    if (!removingCreator || !user || !selectedCampaign) return;
    setRemovingLoading(true);
    const app = removingCreator;

    // Update application status to "removed"
    await supabase.from("campaign_applications").update({ status: "removed" } as any).eq("id", app.id);

    // Remove from group chat only (keep private chat)
    const { data: groupRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("campaign_id", selectedCampaign.id)
      .eq("type", "group")
      .maybeSingle();

    if (groupRoom) {
      // Find their participant row via the creator's own view
      const { data: participantRows } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("chat_room_id", groupRoom.id)
        .eq("user_id", app.creator_user_id);

      if (participantRows?.length) {
        // We can't delete via RLS, so use a message to note removal
        await supabase.from("messages").insert({
          chat_room_id: groupRoom.id,
          sender_id: user.id,
          content: `${app._profile?.display_name || app._profile?.username || "A creator"} has been removed from this campaign.`,
        } as any);
      }
    }

    // Notify creator
    await supabase.from("notifications" as any).insert({
      user_id: app.creator_user_id,
      type: "application_update",
      title: "Removed from Campaign",
      body: `You have been removed from "${selectedCampaign.title}". Videos delivered: ${app.videos_delivered || 0}`,
      link: "/dashboard",
    } as any);

    setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "removed" } : a));
    toast({ title: "Creator removed from campaign" });
    setRemovingCreator(null);
    setRemovingLoading(false);
  };

  const handleEndCampaign = async (campaignId: string) => {
    setEndingCampaign(campaignId);
    const { error } = await supabase.from("campaigns").update({ status: "ended" } as any).eq("id", campaignId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCampaigns((prev) => prev.map((c) => c.id === campaignId ? { ...c, status: "ended" } : c));
      if (selectedCampaign?.id === campaignId) {
        setSelectedCampaign({ ...selectedCampaign, status: "ended" });
      }
      toast({ title: "Campaign ended" });
    }
    setEndingCampaign(null);
  };

  const handleReuseCampaign = (campaign: any) => {
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
        },
      },
    });
  };

  const acceptedCount = (campaignId: string) => {
    if (selectedCampaign?.id === campaignId) {
      return applications.filter((a) => a.status === "accepted").length;
    }
    return 0;
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2].map((i) => <Card key={i} className="border-border/50 animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>;
  }

  const renderCampaignList = (list: any[]) => {
    if (list.length === 0) {
      return (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No campaigns here</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((c) => (
          <Card key={c.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelectedCampaign(c); loadApplications(c.id); }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">{c.title}</h3>
                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{c.status}</Badge>
                  {c.platforms?.map((p: string) => <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>)}
                  <span className="text-xs text-muted-foreground">Max {c.max_creators || 10} creators</span>
                </div>
              </div>
              <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" /> View</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      {!selectedCampaign ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-heading font-bold text-foreground">Your Campaigns</h2>
            <p className="text-sm text-muted-foreground">View applications and manage your campaigns</p>
          </div>
          <Tabs value={campaignTab} onValueChange={setCampaignTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
              <TabsTrigger value="ended">Ended ({endedCampaigns.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">{renderCampaignList(activeCampaigns)}</TabsContent>
            <TabsContent value="ended">{renderCampaignList(endedCampaigns)}</TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCampaign(null); setApplications([]); }} className="mb-4">
            ← Back to campaigns
          </Button>

          {/* Campaign Details */}
          <Card className="border-border/50 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-heading">{selectedCampaign.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedCampaign.status === "active" ? "default" : "secondary"} className="capitalize">{selectedCampaign.status}</Badge>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-1">
                {selectedCampaign.platforms?.map((p: string) => <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedCampaign.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Compensation</p>
                  <p className="text-sm font-medium text-foreground">{selectedCampaign.is_free_product ? "Free Product" : `HK$${selectedCampaign.price_per_video}/video`}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Videos per Creator</p>
                  <p className="text-sm font-medium text-foreground">{selectedCampaign.expected_video_count}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Influencer Spots</p>
                  <p className="text-sm font-medium text-foreground">{applications.filter((a) => a.status === "accepted").length}/{selectedCampaign.max_creators || 10}</p>
                </div>
                {selectedCampaign.campaign_length_days && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Campaign Length</p>
                    <p className="text-sm font-medium text-foreground">{selectedCampaign.campaign_length_days} days</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Target Regions</p>
                  <p className="text-sm font-medium text-foreground">{selectedCampaign.target_regions?.join(", ") || "Worldwide"}</p>
                </div>
              </div>
              {selectedCampaign.requirements && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Requirements</p>
                  <p className="text-sm text-foreground">{selectedCampaign.requirements}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleReuseCampaign(selectedCampaign)}>
                  <Copy className="h-3.5 w-3.5" /> Reuse Campaign
                </Button>
                {selectedCampaign.status === "active" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                        <StopCircle className="h-3.5 w-3.5" /> End Campaign
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End this campaign?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to end "{selectedCampaign.title}"? This will stop accepting new applications. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">Yes, end campaign</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Final confirmation</AlertDialogTitle>
                              <AlertDialogDescription>
                                This is your last chance. Are you absolutely sure you want to end this campaign permanently?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Go back</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleEndCampaign(selectedCampaign.id)}
                                disabled={endingCampaign === selectedCampaign.id}
                              >
                                {endingCampaign === selectedCampaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "End permanently"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Applications</h3>
          {loadingApps ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : applications.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-sm">No applications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className="border-border/50">
                   <CardContent className="p-4">
                     <div className="flex items-start justify-between gap-4">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3 mb-3">
                           <Avatar className="h-10 w-10">
                             <AvatarImage src={app._profile?.avatar_url} />
                             <AvatarFallback className="bg-secondary text-xs">{(app._profile?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                           </Avatar>
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <p className="font-medium text-foreground text-sm">{app._profile?.display_name || app._profile?.username || "Creator"}</p>
                               <Badge variant={app.status === "pending" ? "outline" : app.status === "accepted" ? "default" : "destructive"} className="text-xs capitalize">{app.status}</Badge>
                             </div>
                             <div className="flex items-center gap-2 mt-0.5">
                               {app._profile?.username && <span className="text-xs text-muted-foreground">@{app._profile.username}</span>}
                               <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
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
                      {app.status === "pending" && selectedCampaign.status === "active" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-green-500 hover:text-green-400" disabled={updatingApp === app.id} onClick={() => handleApplicationAction(app.id, "accepted", app)}>
                            {updatingApp === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={updatingApp === app.id} onClick={() => handleApplicationAction(app.id, "rejected", app)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {app.status === "accepted" && (
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive shrink-0" onClick={() => setRemovingCreator(app)}>
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

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
                  <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(creatorProfile.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Bio</p>
                <p className="text-sm text-foreground">{creatorProfile.bio || "No bio provided"}</p>
              </div>
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
                        </div>
                      );
                    })}
                    <div className="flex justify-between px-1 pt-1 text-xs text-muted-foreground">
                      <span>Total followers</span>
                      <span className="font-medium text-foreground">{creatorSocials.reduce((sum: number, s: any) => sum + (s.followers_count || 0), 0).toLocaleString()}</span>
                    </div>
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

      {/* Remove Creator Confirmation Dialog */}
      <AlertDialog open={!!removingCreator} onOpenChange={(open) => !open && setRemovingCreator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove creator from campaign?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to remove <strong>{removingCreator?._profile?.display_name || removingCreator?._profile?.username || "this creator"}</strong> from "{selectedCampaign?.title}".
              </span>
              <span className="block font-medium text-foreground">
                Videos delivered so far: {removingCreator?.videos_delivered || 0} / {selectedCampaign?.expected_video_count || 0}
              </span>
              <span className="block text-sm">
                They will be removed from the group chat but the private message thread will remain. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Yes, remove creator</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Final confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely sure? <strong>{removingCreator?._profile?.display_name || "This creator"}</strong> has delivered <strong>{removingCreator?.videos_delivered || 0}</strong> video{(removingCreator?.videos_delivered || 0) !== 1 ? "s" : ""} so far. This removal is permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleRemoveCreator}
                    disabled={removingLoading}
                  >
                    {removingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BrandCampaigns;
