import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, Users, Mail, Video } from "lucide-react";

interface Props {
  campaignId: string;
}

export default function CampaignApplications({ campaignId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingApp, setRemovingApp] = useState<any>(null);
  const [removalMsg, setRemovalMsg] = useState("");
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: apps } = await supabase
      .from("campaign_applications")
      .select("*, _profile:profiles!creator_user_id(*), _socials:social_connections(*)")
      .eq("campaign_id", campaignId)
      .in("status", ["pending"])
      .order("created_at", { ascending: false });
    setApplications(apps || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [campaignId]);

  const handleAccept = async (appId: string) => {
    if (!user) return;
    setUpdatingId(appId);
    await supabase.from("campaign_applications").update({ status: "accepted" }).eq("id", appId);
    toast({ title: "Application accepted" });
    setUpdatingId(null);
    load();
  };

  const handleReject = async (appId: string) => {
    if (!user) return;
    setUpdatingId(appId);
    await supabase.from("campaign_applications").update({ status: "rejected" }).eq("id", appId);
    toast({ title: "Application rejected" });
    setUpdatingId(null);
    load();
  };

  const handleRemove = async () => {
    if (!removingApp || !removalMsg.trim()) return;
    setRemoving(true);
    await supabase.from("campaign_applications").update({ status: "removed" }).eq("id", removingApp.id);
    // notify creator
    await supabase.from("notifications").insert({
      user_id: removingApp.creator_user_id, type: "application_update",
      title: "Removed from Campaign",
      body: `You have been removed from this campaign. Reason: ${removalMsg.trim()}`,
      link: "/dashboard/messages",
    });
    toast({ title: "Creator removed" });
    setRemovingApp(null);
    setRemovalMsg("");
    setRemoving(false);
    load();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-bold">Pending Applications</h2>
        <Badge variant="secondary">{applications.length} pending</Badge>
      </div>

      {applications.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No pending applications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={app._profile?.avatar_url} />
                    <AvatarFallback className="bg-secondary text-xs">{(app._profile?.display_name || "U").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-sm">{app._profile?.display_name || app._profile?.username || "Creator"}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">Pending</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {app._profile?.username && <span>@{app._profile.username}</span>}
                      {app._profile?.country && <span>{app._profile.country}</span>}
                      {app._socials?.length > 0 && (
                        <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {app._socials.length} socials</span>
                      )}
                    </div>
                    {app.cover_letter && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{app.cover_letter}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-emerald-600" onClick={() => handleAccept(app.id)} disabled={updatingId === app.id}>
                      {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => { setRemovingApp(app); setRemovalMsg(""); }}>
                      <X className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remove Dialog */}
      <Dialog open={!!removingApp} onOpenChange={(o) => { if (!o) setRemovingApp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removingApp?._profile?.display_name || "creator"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This message will be sent to the creator.</p>
            <div>
              <Label>Reason (required)</Label>
              <Textarea value={removalMsg} onChange={(e) => setRemovalMsg(e.target.value)} className="min-h-[100px]" placeholder="Why are you removing this creator?" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRemovingApp(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRemove} disabled={removing || !removalMsg.trim()}>
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
