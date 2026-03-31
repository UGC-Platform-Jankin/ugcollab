import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Users, Check, X, Loader2, Clock, Eye, Instagram, Facebook, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };

const BrandCampaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [viewingCreator, setViewingCreator] = useState<any>(null);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorSocials, setCreatorSocials] = useState<any[]>([]);
  const [updatingApp, setUpdatingApp] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("campaigns").select("*").eq("brand_user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setCampaigns((data as any) || []);
      setLoading(false);
    });
  }, [user]);

  const loadApplications = async (campaignId: string) => {
    setLoadingApps(true);
    const { data } = await supabase.from("campaign_applications").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false });
    setApplications((data as any) || []);
    setLoadingApps(false);
  };

  const viewCreatorProfile = async (creatorUserId: string) => {
    const [profileRes, socialsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", creatorUserId).single(),
      supabase.from("social_connections").select("*").eq("user_id", creatorUserId),
    ]);
    setCreatorProfile(profileRes.data);
    setCreatorSocials(socialsRes.data || []);
    setViewingCreator(creatorUserId);
  };

  const handleApplicationAction = async (appId: string, status: "accepted" | "rejected", app: any) => {
    setUpdatingApp(appId);
    const { error } = await supabase.from("campaign_applications").update({ status } as any).eq("id", appId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUpdatingApp(null);
      return;
    }

    // If accepted, create group chat (if not exists) and private chat, add participants
    if (status === "accepted" && user && selectedCampaign) {
      // Find or create group chat for this campaign
      let { data: existingGroup } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("campaign_id", selectedCampaign.id)
        .eq("type", "group")
        .single();

      let groupId: string;
      if (!existingGroup) {
        const { data: newGroup } = await supabase.from("chat_rooms").insert({
          type: "group",
          campaign_id: selectedCampaign.id,
          name: selectedCampaign.title,
        } as any).select("id").single();
        groupId = newGroup!.id;
        // Add brand to group
        await supabase.from("chat_participants").insert({ chat_room_id: groupId, user_id: user.id } as any);
      } else {
        groupId = existingGroup.id;
      }

      // Add creator to group
      await supabase.from("chat_participants").insert({ chat_room_id: groupId, user_id: app.creator_user_id } as any);

      // Create private chat
      const { data: privateRoom } = await supabase.from("chat_rooms").insert({
        type: "private",
        campaign_id: selectedCampaign.id,
        name: null,
      } as any).select("id").single();

      if (privateRoom) {
        await supabase.from("chat_participants").insert([
          { chat_room_id: privateRoom.id, user_id: user.id },
          { chat_room_id: privateRoom.id, user_id: app.creator_user_id },
        ] as any);
      }
    }

    setApplications((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
    toast({ title: status === "accepted" ? "Creator accepted!" : "Application rejected" });
    setUpdatingApp(null);
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2].map((i) => <Card key={i} className="border-border/50 animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>)}</div>;
  }

  return (
    <div>
      {!selectedCampaign ? (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-heading font-bold text-foreground">Your Campaigns</h2>
            <p className="text-sm text-muted-foreground">View applications and manage your campaigns</p>
          </div>
          {campaigns.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No campaigns yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Card key={c.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setSelectedCampaign(c); loadApplications(c.id); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{c.title}</h3>
                      <div className="flex gap-2 mt-1 items-center">
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{c.status}</Badge>
                        {c.platforms?.map((p: string) => <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" /> View</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                <Badge variant={selectedCampaign.status === "active" ? "default" : "secondary"} className="capitalize">{selectedCampaign.status}</Badge>
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
                  <p className="text-xs text-muted-foreground">Videos Expected</p>
                  <p className="text-sm font-medium text-foreground">{selectedCampaign.expected_video_count}</p>
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
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={app.status === "pending" ? "outline" : app.status === "accepted" ? "default" : "destructive"} className="text-xs capitalize">{app.status}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">{app.cover_letter}</p>
                        <Button variant="link" size="sm" className="px-0 mt-1 h-auto" onClick={() => viewCreatorProfile(app.creator_user_id)}>
                          View Creator Profile →
                        </Button>
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="text-green-500 hover:text-green-400" disabled={updatingApp === app.id} onClick={() => handleApplicationAction(app.id, "accepted", app)}>
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
          )}
        </>
      )}

      {/* Creator Profile Dialog */}
      <Dialog open={!!viewingCreator} onOpenChange={(open) => !open && setViewingCreator(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creator Profile</DialogTitle>
          </DialogHeader>
          {creatorProfile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={creatorProfile.avatar_url} />
                  <AvatarFallback className="bg-secondary">{(creatorProfile.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{creatorProfile.display_name || creatorProfile.username || "Creator"}</p>
                  {creatorProfile.username && <p className="text-sm text-muted-foreground">@{creatorProfile.username}</p>}
                </div>
              </div>
              {creatorProfile.bio && <p className="text-sm text-muted-foreground">{creatorProfile.bio}</p>}
              {creatorSocials.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Socials</p>
                  {creatorSocials.map((s: any) => {
                    const Icon = platformIcons[s.platform] || Users;
                    return (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 text-sm">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize font-medium">{s.platform}</span>
                        <span className="text-muted-foreground ml-auto">{s.followers_count?.toLocaleString() || 0} followers</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandCampaigns;
