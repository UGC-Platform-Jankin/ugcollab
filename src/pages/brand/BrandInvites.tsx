import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Check, X, ArrowRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type InviteStatus = "pending" | "accepted" | "declined";

interface Invite {
  id: string;
  campaign_id: string;
  creator_user_id: string;
  status: InviteStatus;
  message: string | null;
  proposed_price_per_video: number | null;
  proposed_video_count: number | null;
  created_at: string;
  _campaign?: any;
  _creator?: any;
}

const statusConfig: Record<InviteStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const BrandInvites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadInvites();
  }, [user]);

  const loadInvites = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("campaign_invites")
      .select("*")
      .eq("brand_user_id", user!.id)
      .order("created_at", { ascending: false });

    const rawInvites = (data as any[]) || [];
    if (rawInvites.length === 0) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const campIds = [...new Set(rawInvites.map(i => i.campaign_id))];
    const creatorIds = [...new Set(rawInvites.map(i => i.creator_user_id))];

    const [campsRes, creatorsRes] = await Promise.all([
      supabase.from("campaigns").select("id, title, price_per_video, expected_video_count").in("id", campIds),
      supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds),
    ]);

    const campMap: Record<string, any> = {};
    (campsRes.data || []).forEach((c: any) => { campMap[c.id] = c; });
    const creatorMap: Record<string, any> = {};
    (creatorsRes.data || []).forEach((p: any) => { creatorMap[p.user_id] = p; });

    setInvites(rawInvites.map(i => ({
      ...i,
      _campaign: campMap[i.campaign_id] || {},
      _creator: creatorMap[i.creator_user_id] || {},
    })));
    setLoading(false);
  };

  const pendingInvites = invites.filter(i => i.status === "pending");
  const acceptedInvites = invites.filter(i => i.status === "accepted");
  const declinedInvites = invites.filter(i => i.status === "declined");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderInviteCard = (invite: Invite) => {
    const config = statusConfig[invite.status];
    const creator = invite._creator;
    const campaign = invite._campaign;
    const agreedPrice = invite.proposed_price_per_video ?? campaign.price_per_video;
    const agreedVideos = invite.proposed_video_count ?? campaign.expected_video_count ?? 1;

    return (
      <Card key={invite.id} className="border-border/50 hover:border-primary/20 transition-colors">
        <CardContent className="p-4 flex items-start gap-4">
          <Avatar className="h-12 w-12 rounded-xl shrink-0">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="rounded-xl bg-gradient-coral text-white font-bold">
              {(creator.display_name || "C").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-medium text-foreground">{creator.display_name || creator.username || "Creator"}</p>
                <p className="text-sm text-muted-foreground">@{creator.username || "unknown"}</p>
              </div>
              <Badge className={`text-xs border ${config.className}`}>{config.label}</Badge>
            </div>

            <p className="text-sm text-foreground font-medium mb-1">{campaign.title || "Campaign"}</p>

            {(agreedPrice || agreedVideos) && (
              <p className="text-xs text-muted-foreground mb-2">
                {agreedPrice ? `HK$${agreedPrice}/video` : "Free"} × {agreedVideos} video(s)
                {agreedPrice && <span className="ml-1">(HK${(Number(agreedPrice) * agreedVideos).toLocaleString()} total)</span>}
              </p>
            )}

            {invite.message && (
              <p className="text-xs text-muted-foreground italic mb-2 line-clamp-2">"{invite.message}"</p>
            )}

            <p className="text-[11px] text-muted-foreground/60">
              Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {invite.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/brand/messages?room=private_${invite.campaign_id}_${invite.creator_user_id}`)}
              >
                <MessageCircle className="h-3 w-3" /> Chat
              </Button>
            )}
            {invite.status === "accepted" && (
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => navigate(`/brand/campaigns/${invite.campaign_id}`)}
              >
                View Campaign <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <Card className="border-border/50 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Send className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Sent Invites</h1>
        <p className="text-muted-foreground text-sm">Track the status of invites you've sent to creators</p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-fit gap-1 p-1 h-auto bg-muted/50 rounded-xl">
          <TabsTrigger value="all" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card">
            All <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{invites.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card">
            Pending <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{pendingInvites.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="accepted" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card">
            Accepted <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{acceptedInvites.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="declined" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-card">
            Declined <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{declinedInvites.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {invites.length === 0 ? (
            <EmptyState title="No invites sent yet" subtitle="Invite creators from the Find Creators tab" />
          ) : (
            invites.map(renderInviteCard)
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {pendingInvites.length === 0 ? (
            <EmptyState title="No pending invites" subtitle="Creators haven't responded to your invites yet" />
          ) : (
            pendingInvites.map(renderInviteCard)
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-3">
          {acceptedInvites.length === 0 ? (
            <EmptyState title="No accepted invites yet" subtitle="Creators who accepted your invites will appear here" />
          ) : (
            acceptedInvites.map(renderInviteCard)
          )}
        </TabsContent>

        <TabsContent value="declined" className="space-y-3">
          {declinedInvites.length === 0 ? (
            <EmptyState title="No declined invites" subtitle="Creators who declined will appear here" />
          ) : (
            declinedInvites.map(renderInviteCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandInvites;
