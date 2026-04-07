import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, DollarSign, Video, Check, X, Users, Pencil
} from "lucide-react";
import { findPrivateRoom } from "@/lib/chat";

interface Props {
  campaignId: string;
}

interface CreatorRow {
  application: any;
  profile: any;
}

const CreatorFinances = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ appId: string; field: "price" | "videos" } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const [campRes, appsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("campaign_applications")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]);

    setCampaign(campRes.data);
    const apps = appsRes.data || [];
    if (apps.length === 0) { setRows([]); setLoading(false); return; }

    const creatorIds = [...new Set(apps.map((a: any) => a.creator_user_id))];
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", creatorIds);
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    setRows(apps.map((app: any) => ({
      application: app,
      profile: profileMap[app.creator_user_id],
    })));

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const saveEdit = async (appId: string, field: "agreed_price_per_video" | "agreed_video_count", value: string) => {
    setSaving(appId);
    const app = rows.find(r => r.application.id === appId)?.application;
    const numValue = value ? Number(value) : 0;
    const oldPrice = app.agreed_price_per_video ?? 0;
    const oldVideos = app.agreed_video_count ?? 0;
    const oldTotal = oldPrice * oldVideos;
    const newPrice = field === "agreed_price_per_video" ? numValue : oldPrice;
    const newVideos = field === "agreed_video_count" ? numValue : oldVideos;
    const newTotal = newPrice * newVideos;

    await supabase.from("campaign_applications").update({
      [field]: numValue,
    } as any).eq("id", appId);

    // Notify creator via private chat
    if (app) {
      const roomId = await findPrivateRoom(campaignId, user!.id, app.creator_user_id);
      if (roomId) {
        const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
        const fieldLabel = field === "agreed_price_per_video" ? "price per video" : "number of videos";
        const newVal = field === "agreed_price_per_video" ? `HK$${numValue}` : `${numValue} video(s)`;
        const oldVal = field === "agreed_price_per_video" ? `HK$${oldPrice}` : `${oldVideos} video(s)`;
        await supabase.from("messages").insert({
          chat_room_id: roomId,
          sender_id: user!.id,
          content: `💰 **Finances Updated by ${brandProfile?.business_name || "the brand"}**

Your terms for "${campaign?.title}" have been updated:
• Price per video: HK$${newPrice} (was HK$${oldPrice})
• Number of videos: ${newVideos} (was ${oldVideos})
• New total: HK$${newTotal.toLocaleString()} (was HK$${oldTotal.toLocaleString()})

[CAMPAIGN_AGREED:${campaignId}]`,
        } as any);

        // Also send a notification
        await supabase.from("notifications").insert({
          user_id: app.creator_user_id,
          type: "finances_updated",
          title: "Campaign Finances Updated",
          body: `${brandProfile?.business_name || "The brand"} updated your terms for "${campaign?.title}". Total is now HK$${newTotal.toLocaleString()}.`,
          link: `/dashboard/gig/${campaignId}/finances`,
        } as any);
      }
    }
    toast({ title: "Updated and creator notified" });
    setEditingCell(null);
    setEditValue("");
    setSaving(null);
    loadData();
  };

  const startEdit = (appId: string, field: "price" | "videos", currentValue: any) => {
    setEditingCell({ appId, field });
    setEditValue(currentValue != null ? String(currentValue) : "");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const totalFee = (app: any) => {
    const price = app.agreed_price_per_video ?? 0;
    const videos = app.agreed_video_count ?? 0;
    return price * videos;
  };

  const grandTotal = rows.reduce((sum, r) => sum + totalFee(r.application), 0);
  const totalVideos = rows.reduce((sum, r) => sum + (r.application.agreed_video_count ?? 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Creators</p>
              <p className="text-xl font-bold">{rows.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Videos</p>
              <p className="text-xl font-bold">{totalVideos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payout</p>
              <p className="text-xl font-bold">HK${grandTotal.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        {campaign?.campaign_type === "prize_pool" && campaign?.total_budget && (
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prize Pool Budget</p>
                <p className="text-xl font-bold">HK${Number(campaign.total_budget).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mode info */}
      {campaign?.campaign_type === "prize_pool" ? (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600">Prize Pool Campaign</span>
          <span className="px-2 py-1 rounded bg-secondary">Total Budget: HK${Number(campaign?.total_budget || 0).toLocaleString()}</span>
        </div>
      ) : (
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-secondary">Campaign Budget: HK${campaign?.budget ? Number(campaign.budget).toLocaleString() : "—"}</span>
        </div>
      )}

      {/* Spreadsheet */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Creator</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Price / Video</th>
                <th className="text-center p-3 font-medium text-muted-foreground"># Videos</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Total Fee</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No accepted creators in this campaign yet</td>
                </tr>
              ) : rows.map(({ application: app, profile }) => {
                const isEditing = editingCell?.appId === app.id;
                const isSavingThis = saving === app.id;

                return (
                  <tr key={app.id} className="border-b border-border/30">
                    {/* Creator */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{(profile?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{profile?.display_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">@{profile?.username || "—"}</p>
                        </div>
                      </div>
                    </td>
                    {/* Price per Video */}
                    <td className="p-3 text-center">
                      {isEditing && editingCell.field === "price" ? (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-muted-foreground text-sm">HK$</span>
                          <Input
                            type="number"
                            className="w-20 h-7 text-center text-sm"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 px-2" onClick={() => saveEdit(app.id, "agreed_price_per_video", editValue)} disabled={isSavingThis}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-sm text-muted-foreground">HK$</span>
                          <span className="text-sm font-medium">{app.agreed_price_per_video ?? "—"}</span>
                          {campaign?.is_free_product ? (
                            <Badge variant="secondary" className="text-[10px] ml-1">Free</Badge>
                          ) : null}
                        </div>
                      )}
                    </td>
                    {/* Videos */}
                    <td className="p-3 text-center">
                      {isEditing && editingCell.field === "videos" ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            className="w-16 h-7 text-center text-sm"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 px-2" onClick={() => saveEdit(app.id, "agreed_video_count", editValue)} disabled={isSavingThis}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{app.agreed_video_count ?? "—"}</span>
                      )}
                    </td>
                    {/* Total Fee */}
                    <td className="p-3 text-right font-medium text-foreground">
                      {campaign?.is_free_product ? (
                        <Badge variant="secondary">Free Product</Badge>
                      ) : (
                        `HK$${totalFee(app).toLocaleString()}`
                      )}
                    </td>
                    {/* Edit */}
                    <td className="p-3 text-center">
                      {campaign?.is_free_product ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <Button size="sm" variant="ghost" className="h-7 w-7 px-0" onClick={() => startEdit(app.id, "price", app.agreed_price_per_video)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              {rows.length > 0 && (
                <tr className="border-t-2 border-border bg-secondary/50 font-bold">
                  <td colSpan={2} className="p-3 text-right">Grand Total</td>
                  <td className="p-3 text-center">{totalVideos}</td>
                  <td className="p-3 text-right">
                    {campaign?.is_free_product ? (
                      <Badge variant="secondary">Free Product</Badge>
                    ) : (
                      <>HK${grandTotal.toLocaleString()}</>
                    )}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CreatorFinances;
