import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, DollarSign, Video, Check, X, AlertCircle, Users, ArrowRightLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  campaignId: string;
}

interface CreatorRow {
  application: any;
  profile: any;
  editing: {
    agreed_price_per_video: boolean;
    agreed_video_count: boolean;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  accepted: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  removed: "bg-destructive/10 text-destructive border-destructive/20",
  left: "bg-muted text-muted-foreground",
};

const pricingStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  countered: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  agreed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending_brand_edit: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const CreatorPricingSpreadsheet = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ appId: string; field: "price" | "videos" } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [counteringCreator, setCounteringCreator] = useState<any>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterVideos, setCounterVideos] = useState("");
  const [countering, setCountering] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<any>(null);
  const [rejecting, setRejecting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [campRes, appsRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("campaign_applications")
        .select("*")
        .eq("campaign_id", campaignId)
        .in("status", ["accepted", "pending", "removed", "left"])
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
      editing: { agreed_price_per_video: false, agreed_video_count: false },
    })));

    // Compute remaining budget for prize pool
    if (campRes.data?.campaign_type === "prize_pool" && campRes.data?.total_budget) {
      const totalBudget = Number(campRes.data.total_budget);
      // Sum agreed fees from all accepted applications
      const totalAgreed = apps
        .filter((a: any) => a.status === "accepted")
        .reduce((sum: number, a: any) => {
          return sum + ((a.agreed_price_per_video || 0) * (a.agreed_video_count || 0));
        }, 0);
      setRemainingBudget(totalBudget - totalAgreed);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const saveEdit = async (appId: string, field: "agreed_price_per_video" | "agreed_video_count", value: string) => {
    setSaving(appId);
    const app = rows.find(r => r.application.id === appId)?.application;
    const numValue = field === "agreed_price_per_video" ? (value ? Number(value) : null) : (value ? Number(value) : null);
    const prevApp = app;
    await supabase.from("campaign_applications").update({
      [field]: numValue,
      pricing_status: "agreed",
    } as any).eq("id", appId);
    // Notify creator via private chat
    if (app) {
      const { data: room } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private").maybeSingle();
      if (room) {
        const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
        const fieldLabel = field === "agreed_price_per_video" ? "price per video" : "number of videos";
        const newVal = field === "agreed_price_per_video" ? `HK$${numValue}` : `${numValue} video(s)`;
        await supabase.from("messages").insert({
          chat_room_id: room.id,
          sender_id: user!.id,
          content: `📝 **Agreement Updated by ${brandProfile?.business_name || "the brand"}**\n\nYour ${fieldLabel} has been updated to ${newVal} for "${campaign?.title}".\n\n[CAMPAIGN_AGREED:${campaignId}]`,
        } as any);
      }
    }
    toast({ title: "Updated and notified creator" });
    setEditingCell(null);
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

  const handleCounterOffer = async () => {
    if (!counteringCreator) return;
    setCountering(true);
    const appId = counteringCreator.application.id;
    await supabase.from("campaign_applications").update({
      proposed_price_per_video: counterPrice ? Number(counterPrice) : null,
      proposed_video_count: counterVideos ? Number(counterVideos) : null,
      pricing_status: "countered",
    } as any).eq("id", appId);
    // Send message to creator's private chat
    const { data: room } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private").maybeSingle();
    if (room) {
      const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
      await supabase.from("messages").insert({
        chat_room_id: room.id,
        sender_id: user!.id,
        content: `💬 **Counter Offer from ${brandProfile?.business_name || "the brand"}**\n\nWe've proposed HK$${counterPrice || "—"}/video × ${counterVideos || "—"} video(s) for "${campaign?.title}".\n\n[CAMPAIGN_COUNTER:${campaignId}]`,
      } as any);
    }
    toast({ title: "Counter offer sent to creator!" });
    setCounteringCreator(null);
    setCounterPrice("");
    setCounterVideos("");
    setCountering(false);
    loadData();
  };

  const acceptCounterOffer = async (appId: string, proposedPrice: number, proposedVideos: number) => {
    setSaving(appId);
    const app = rows.find(r => r.application.id === appId)?.application;
    await supabase.from("campaign_applications").update({
      agreed_price_per_video: proposedPrice,
      agreed_video_count: proposedVideos,
      pricing_status: "agreed",
      status: "accepted",
    } as any).eq("id", appId);
    // Update corresponding invite to accepted if exists
    if (app) {
      await supabase.from("campaign_invites").update({ status: "accepted" }).eq("campaign_id", campaignId).eq("creator_user_id", app.creator_user_id);
    }
    // Send message to creator's private chat
    if (app) {
      const { data: room } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private").maybeSingle();
      if (room) {
        const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
        await supabase.from("messages").insert({
          chat_room_id: room.id,
          sender_id: user!.id,
          content: `✅ Your counter offer has been accepted by ${brandProfile?.business_name || "the brand"}!\n\nAgreed terms: HK$${proposedPrice}/video × ${proposedVideos} video(s)\n\n[CAMPAIGN_AGREED:${campaignId}]`,
        } as any);
      }
      // Add creator to group chat - create if not exists
      let { data: groupRoom } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "group").maybeSingle();
      if (!groupRoom) {
        const { data: camp } = await supabase.from("campaigns").select("title").eq("id", campaignId).maybeSingle();
        const { data: newRoom } = await supabase.from("chat_rooms").insert({ type: "group", campaign_id: campaignId, name: camp?.title || "Group Chat" } as any).select("id").single();
        groupRoom = newRoom;
      }
      if (groupRoom) {
        const { data: existingPart } = await supabase.from("chat_participants").select("id").eq("chat_room_id", groupRoom.id).eq("user_id", app.creator_user_id).maybeSingle();
        if (!existingPart) {
          await supabase.from("chat_participants").insert({ chat_room_id: groupRoom.id, user_id: app.creator_user_id });
          const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
          await supabase.from("messages").insert({
            chat_room_id: groupRoom.id,
            sender_id: user!.id,
            content: `${brandProfile?.business_name || "The brand"} accepted the counter offer — ${app.profile?.display_name || "Creator"} joined!`,
          } as any);
        }
      }

      // Create private chat if needed
      let privateRoomId: string | null = null;
      const { data: allPrivateRooms } = await supabase.from("chat_rooms").select("id, chat_participants(user_id)").eq("campaign_id", campaignId).eq("type", "private");
      if (allPrivateRooms && allPrivateRooms.length > 0) {
        for (const room of allPrivateRooms) {
          const pIds = ((room as any).chat_participants || []).map((p: any) => p.user_id);
          if (pIds.includes(app.creator_user_id)) { privateRoomId = room.id; break; }
        }
      }
      if (!privateRoomId && groupRoom) {
        const { data: newRoom } = await supabase.from("chat_rooms").insert({ type: "private", campaign_id: campaignId, name: null } as any).select("id").single();
        if (newRoom) {
          await supabase.from("chat_participants").insert([
            { chat_room_id: newRoom.id, user_id: app.creator_user_id },
            { chat_room_id: newRoom.id, user_id: user!.id },
          ]);
        }
      }
    }
    toast({ title: "Counter offer accepted" });
    setSaving(null);
    loadData();
  };

  const rejectCounterOffer = async (appId: string) => {
    if (!rejectingApp) return;
    setRejecting(true);
    const app = rows.find(r => r.application.id === appId)?.application;
    await supabase.from("campaign_applications").update({ status: "declined" } as any).eq("id", appId);
    // Notify creator
    if (app) {
      const { data: room } = await supabase.from("chat_rooms").select("id").eq("campaign_id", campaignId).eq("type", "private").maybeSingle();
      if (room) {
        const { data: brandProfile } = await supabase.from("brand_profiles").select("business_name").eq("user_id", user!.id).maybeSingle();
        await supabase.from("messages").insert({
          chat_room_id: room.id,
          sender_id: user!.id,
          content: `❌ ${brandProfile?.business_name || "The brand"} declined your counter offer for "${campaign?.title}".`,
        } as any);
      }
    }
    toast({ title: "Counter offer declined" });
    setRejectingApp(null);
    setRejecting(false);
    loadData();
  };

  const totalFee = (app: any) => {
    const price = app.agreed_price_per_video ?? 0;
    const videos = app.agreed_video_count ?? 0;
    return price * videos;
  };

  const grandTotal = rows.reduce((sum, r) => sum + (r.application.status === "accepted" ? totalFee(r.application) : 0), 0);

  const pricingMode = campaign?.pricing_mode;
  const videosMode = campaign?.videos_mode;
  const isFixedPrice = pricingMode === "fixed";
  const isFixedVideos = videosMode === "fixed";

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Creators</p>
              <p className="text-xl font-bold">{rows.filter(r => r.application.status === "accepted").length}</p>
            </div>
          </CardContent>
        </Card>
        {campaign?.campaign_type === "prize_pool" ? (
          <>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold">HK${grandTotal.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining Budget</p>
                  <p className="text-xl font-bold">HK${Math.max(0, remainingBudget).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Agreed Fees</p>
                  <p className="text-xl font-bold">HK${grandTotal.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Pricing</p>
                  <p className="text-xl font-bold">{rows.filter(r => r.application.status === "accepted" && r.application.pricing_status === "pending").length}</p>
                </div>
              </CardContent>
            </Card>
          </>
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
          <span className="px-2 py-1 rounded bg-secondary">Price: {isFixedPrice ? "Fixed" : "Flexible (per-creator)"}</span>
          <span className="px-2 py-1 rounded bg-secondary">Videos: {isFixedVideos ? "Fixed" : "Flexible (per-creator)"}</span>
        </div>
      )}

      {/* Spreadsheet */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Creator</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Pricing Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Proposed Price</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Proposed Videos</th>
                <th className="text-center p-3 font-medium text-muted-foreground">
                  Agreed Price {isFixedPrice && <span className="text-xs text-muted-foreground ml-1">(locked)</span>}
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground">
                  Agreed Videos {isFixedVideos && <span className="text-xs text-muted-foreground ml-1">(locked)</span>}
                </th>
                <th className="text-right p-3 font-medium text-muted-foreground">Total Fee</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">No creators in this campaign yet</td>
                </tr>
              ) : rows.map(({ application: app, profile }) => {
                const isEditing = editingCell?.appId === app.id;
                const isSavingThis = saving === app.id;
                const hasCountered = app.pricing_status === "countered";
                const isPending = app.status === "pending" && app.pricing_status === "countered";
                const isEditable = app.status === "accepted";

                return (
                  <tr key={app.id} className={`border-b border-border/30 ${hasCountered ? "bg-orange-500/5" : isPending ? "bg-yellow-500/5" : ""}`}>
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
                    {/* Status */}
                    <td className="p-3">
                      <Badge className={statusColors[app.status] || "bg-muted"}>{app.status}</Badge>
                    </td>
                    {/* Pricing Status */}
                    <td className="p-3">
                      <Badge className={pricingStatusColors[app.pricing_status] || "bg-muted"}>{app.pricing_status || "pending"}</Badge>
                      {hasCountered && (
                        <p className="text-xs text-orange-600 mt-1">HK${app.proposed_price_per_video}/video × {app.proposed_video_count}</p>
                      )}
                    </td>
                    {/* Proposed Price */}
                    <td className="p-3 text-center text-muted-foreground">
                      {app.proposed_price_per_video != null ? `HK$${app.proposed_price_per_video}` : "—"}
                    </td>
                    {/* Proposed Videos */}
                    <td className="p-3 text-center text-muted-foreground">
                      {app.proposed_video_count ?? "—"}
                    </td>
                    {/* Agreed Price */}
                    <td className="p-3 text-center">
                      {isEditing && editingCell.field === "price" ? (
                        <div className="flex items-center gap-1 justify-center">
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
                        <button
                          className={`text-sm ${isEditable && !isFixedPrice ? "cursor-pointer hover:text-primary" : "cursor-default text-muted-foreground"}`}
                          onClick={() => !isFixedPrice && isEditable && startEdit(app.id, "price", app.agreed_price_per_video)}
                          disabled={isFixedPrice || !isEditable}
                        >
                          {app.agreed_price_per_video != null ? `HK$${app.agreed_price_per_video}` : "—"}
                        </button>
                      )}
                    </td>
                    {/* Agreed Videos */}
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
                        <button
                          className={`text-sm ${isEditable && !isFixedVideos ? "cursor-pointer hover:text-primary" : "cursor-default text-muted-foreground"}`}
                          onClick={() => !isFixedVideos && isEditable && startEdit(app.id, "videos", app.agreed_video_count)}
                          disabled={isFixedVideos || !isEditable}
                        >
                          {app.agreed_video_count ?? "—"}
                        </button>
                      )}
                    </td>
                    {/* Total Fee */}
                    <td className="p-3 text-right font-medium text-foreground">
                      {app.status === "accepted" ? `HK$${totalFee(app).toLocaleString()}` : "—"}
                    </td>
                    {/* Actions */}
                    <td className="p-3 text-center">
                      {isPending ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => acceptCounterOffer(app.id, app.proposed_price_per_video, app.proposed_video_count)}
                            disabled={isSavingThis}
                          >
                            <Check className="h-3 w-3" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                              setCounteringCreator({ application: app, profile });
                              setCounterPrice(app.proposed_price_per_video?.toString() || "");
                              setCounterVideos(app.proposed_video_count?.toString() || "1");
                            }}
                          >
                            <ArrowRightLeft className="h-3 w-3" /> Counter
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setRejectingApp({ application: app, profile })}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : hasCountered && isEditable ? (
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => acceptCounterOffer(app.id, app.proposed_price_per_video, app.proposed_video_count)}
                            disabled={isSavingThis}
                          >
                            <Check className="h-3 w-3" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => startEdit(app.id, "price", app.agreed_price_per_video)}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              {rows.length > 0 && (
                <tr className="border-t-2 border-border bg-secondary/50 font-bold">
                  <td colSpan={7} className="p-3 text-right">Grand Total</td>
                  <td className="p-3 text-right">HK${grandTotal.toLocaleString()}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Counter Offer Dialog (brand-side — for counter offers sent to them) */}
      <Dialog open={!!counteringCreator} onOpenChange={(open) => { if (!open) setCounteringCreator(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Counter Offer from {counteringCreator?.profile?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This creator has proposed different terms. You can accept their counter offer or propose your own.
            </p>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-1">
              <p className="text-sm font-medium">Creator's Counter Offer:</p>
              <p className="text-sm">HK${counteringCreator?.application?.proposed_price_per_video}/video × {counteringCreator?.application?.proposed_video_count} video(s)</p>
              <p className="text-sm font-medium">Total: HK${((counteringCreator?.application?.proposed_price_per_video || 0) * (counteringCreator?.application?.proposed_video_count || 0)).toLocaleString()}</p>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Your Agreed Price per Video (HKD)</Label>
                <Input type="number" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} placeholder="e.g. 600" />
              </div>
              <div>
                <Label>Your Agreed Number of Videos</Label>
                <Input type="number" value={counterVideos} onChange={(e) => setCounterVideos(e.target.value)} placeholder="e.g. 2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCounterOffer}
                disabled={countering}
                className="flex-1"
              >
                {countering ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Counter Offer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => acceptCounterOffer(counteringCreator?.id, counteringCreator?.application?.proposed_price_per_video, counteringCreator?.application?.proposed_video_count)}
                disabled={countering}
                className="flex-1"
              >
                Accept Counter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Counter Offer Dialog */}
      <Dialog open={!!rejectingApp} onOpenChange={(open) => { if (!open) setRejectingApp(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Counter Offer?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to decline <strong>{rejectingApp?.profile?.display_name}</strong>'s counter offer for "{campaign?.title}"? They will be notified via chat.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectingApp(null)}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={rejecting}
                onClick={() => rejectCounterOffer(rejectingApp?.application?.id)}
              >
                {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline Offer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorPricingSpreadsheet;
