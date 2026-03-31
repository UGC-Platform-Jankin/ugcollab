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
import { Users, Search, Send, Loader2, Instagram, Facebook, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };

interface Creator {
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  socials: any[];
}

const FindCreators = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filtered, setFiltered] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [inviteCreator, setInviteCreator] = useState<Creator | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profilesRes, socialsRes, campaignsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, bio, avatar_url"),
        supabase.from("social_connections").select("user_id, platform, followers_count, average_views, platform_username"),
        supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id).eq("status", "active"),
      ]);

      const profiles = (profilesRes.data || []).filter((p: any) => p.user_id !== user.id);
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
      setCampaigns((campaignsRes.data as any) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(creators);
    } else {
      const q = search.toLowerCase();
      setFiltered(creators.filter((c) =>
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        c.socials.some((s) => (s.platform_username || "").toLowerCase().includes(q))
      ));
    }
  }, [search, creators]);

  const handleInvite = async () => {
    if (!user || !inviteCreator || !selectedCampaignId) return;
    setSending(true);

    // Insert invite
    const { error } = await supabase.from("campaign_invites" as any).insert({
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

      // Send invite message in the DM
      const campaign = campaigns.find((c) => c.id === selectedCampaignId);
      const msgContent = `🎯 **Campaign Invite: ${campaign?.title || "Campaign"}**\n\n${inviteMessage || "You've been invited to apply to this campaign!"}\n\n[CAMPAIGN_INVITE:${selectedCampaignId}]`;
      await supabase.from("messages").insert({
        chat_room_id: privateRoom.id,
        sender_id: user.id,
        content: msgContent,
      } as any);
    }

    // Create notification for creator
    await supabase.from("notifications" as any).insert({
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

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Find Creators</h1>
        <p className="text-muted-foreground text-sm">Browse creators and invite them to your campaigns</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or social handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No creators found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator) => (
            <Card key={creator.user_id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-lg">{(creator.display_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{creator.display_name || "Creator"}</p>
                    {creator.username && <p className="text-xs text-muted-foreground">@{creator.username}</p>}
                    {creator.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{creator.bio}</p>}
                  </div>
                </div>

                {creator.socials.length > 0 && (
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
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{totalFollowers(creator).toLocaleString()} total followers</span>
                  <Button size="sm" className="gap-1" onClick={() => setInviteCreator(creator)}>
                    <Send className="h-3.5 w-3.5" /> Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
};

export default FindCreators;
