import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Clock, DollarSign, MapPin, Send, Loader2, Check, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  platforms: string[] | null;
  campaign_length_days: number | null;
  status: string;
  price_per_video: number | null;
  is_free_product: boolean;
  target_regions: string[] | null;
  expected_video_count: number;
  requirements: string | null;
  brand_user_id: string;
}

const Gigs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedCampaigns, setAppliedCampaigns] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<Campaign | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [activeMemberships, setActiveMemberships] = useState<any[]>([]);
  const [leavingCampaign, setLeavingCampaign] = useState<any>(null);
  const [leavingLoading, setLeavingLoading] = useState(false);
  const [brandProfiles, setBrandProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [campaignsRes, applicationsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        user ? supabase.from("campaign_applications").select("*").eq("creator_user_id", user.id) : Promise.resolve({ data: [] }),
      ]);
      setCampaigns((campaignsRes.data as any) || []);
      
      // Fetch brand profiles for all campaigns
      const allCampaigns = (campaignsRes.data as any) || [];
      const brandUserIds = [...new Set(allCampaigns.map((c: any) => c.brand_user_id))] as string[];
      if (brandUserIds.length > 0) {
        const { data: brands } = await supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", brandUserIds);
        const brandMap: Record<string, any> = {};
        (brands || []).forEach((b: any) => { brandMap[b.user_id] = b; });
        setBrandProfiles(brandMap);
      }

      const allApps = (applicationsRes.data as any) || [];
      setAppliedCampaigns(new Set(allApps.map((a: any) => a.campaign_id)));

      // Load active memberships (accepted apps)
      const accepted = allApps.filter((a: any) => a.status === "accepted");
      if (accepted.length > 0) {
        const campIds = [...new Set(accepted.map((a: any) => a.campaign_id))] as string[];
        const { data: campData } = await supabase.from("campaigns").select("id, title, expected_video_count").in("id", campIds);
        const campMap: Record<string, any> = {};
        (campData || []).forEach((c: any) => { campMap[c.id] = c; });
        setActiveMemberships(accepted.map((a: any) => ({
          ...a,
          _campaign: campMap[a.campaign_id] || { title: "Campaign", expected_video_count: 0 },
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleApply = async () => {
    if (!user || !applyingTo) return;
    if (coverLetter.length < 300) {
      toast({ title: "Cover letter too short", description: `Minimum 300 characters (${coverLetter.length}/300)`, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("campaign_applications").insert({
      campaign_id: applyingTo.id,
      creator_user_id: user.id,
      cover_letter: coverLetter,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setAppliedCampaigns((prev) => new Set([...prev, applyingTo.id]));
    await supabase.from("notifications" as any).insert({
      user_id: applyingTo.brand_user_id,
      type: "application",
      title: "New Application",
      body: `A creator applied to "${applyingTo.title}"`,
      link: "/brand/campaigns",
    } as any);
    toast({ title: "Application sent!", description: "The brand will review your application." });
    setApplyingTo(null);
    setCoverLetter("");
    setSubmitting(false);
  };

  const handleLeaveCampaign = async () => {
    if (!leavingCampaign || !user) return;
    setLeavingLoading(true);

    // Update application status to "left"
    await supabase.from("campaign_applications").update({ status: "left" } as any).eq("id", leavingCampaign.id);

    // Post a message in group chat if exists
    const { data: groupRoom } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("campaign_id", leavingCampaign.campaign_id)
      .eq("type", "group")
      .maybeSingle();

    if (groupRoom) {
      await supabase.from("messages").insert({
        chat_room_id: groupRoom.id,
        sender_id: user.id,
        content: `I've left this campaign. Thanks for the opportunity!`,
      } as any);
    }

    // Notify brand
    await supabase.from("notifications" as any).insert({
      user_id: leavingCampaign._campaign?.brand_user_id || "",
      type: "application_update",
      title: "Creator Left Campaign",
      body: `A creator has left "${leavingCampaign._campaign?.title || "your campaign"}". Videos delivered: ${leavingCampaign.videos_delivered || 0}`,
      link: "/brand/campaigns",
    } as any);

    setActiveMemberships((prev) => prev.filter((m) => m.id !== leavingCampaign.id));
    toast({ title: "You've left the campaign" });
    setLeavingCampaign(null);
    setLeavingLoading(false);
  };

  return (
    <div>
      {/* Active Memberships */}
      {activeMemberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-heading font-bold text-foreground mb-1">Your Active Campaigns</h2>
          <p className="text-muted-foreground text-sm mb-4">Campaigns you've been accepted to</p>
          <div className="space-y-3">
            {activeMemberships.map((m) => (
              <Card key={m.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{m._campaign.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Videos: {m.videos_delivered || 0}/{m._campaign.expected_video_count}</span>
                      <Badge variant="default" className="text-xs">Active</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive gap-1"
                    onClick={() => setLeavingCampaign(m)}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Leave
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Available Gigs</h1>
        <p className="text-muted-foreground mt-1">Browse and apply to brand campaigns</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No gigs available yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              New campaigns from brands will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const hasApplied = appliedCampaigns.has(campaign.id);
            return (
              <Card key={campaign.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-border/30">
                      <AvatarImage src={brandProfiles[campaign.brand_user_id]?.logo_url || undefined} />
                      <AvatarFallback className="bg-secondary text-sm">
                        {(brandProfiles[campaign.brand_user_id]?.business_name || "B").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{campaign.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{brandProfiles[campaign.brand_user_id]?.business_name || "Brand"}</p>
                    </div>
                  </div>
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {campaign.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}
                  <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {campaign.is_free_product ? (
                      <Badge variant="outline" className="text-xs">Free Product</Badge>
                    ) : campaign.price_per_video ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>HK${campaign.price_per_video}/video</span>
                      </div>
                    ) : null}
                    {campaign.campaign_length_days && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{campaign.campaign_length_days}d</span>
                      </div>
                    )}
                    {campaign.target_regions && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">{campaign.target_regions.join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    {hasApplied ? (
                      <Button size="sm" variant="outline" disabled className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Applied
                      </Button>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setApplyingTo(campaign); }}>
                        <Send className="h-3.5 w-3.5" /> Apply
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCampaign.title}</DialogTitle>
                <div className="flex gap-1 flex-wrap mt-1">
                  {selectedCampaign.platforms?.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>
                  ))}
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCampaign.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Compensation</p>
                    <p className="font-medium text-foreground">{selectedCampaign.is_free_product ? "Free Product" : `HK$${selectedCampaign.price_per_video}/video`}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Videos Expected</p>
                    <p className="font-medium text-foreground">{selectedCampaign.expected_video_count}</p>
                  </div>
                  {selectedCampaign.campaign_length_days && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Campaign Length</p>
                      <p className="font-medium text-foreground">{selectedCampaign.campaign_length_days} days</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Regions</p>
                    <p className="font-medium text-foreground">{selectedCampaign.target_regions?.join(", ")}</p>
                  </div>
                </div>
                {selectedCampaign.requirements && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Requirements</p>
                    <p className="text-sm text-foreground">{selectedCampaign.requirements}</p>
                  </div>
                )}
                <div className="pt-2">
                  {appliedCampaigns.has(selectedCampaign.id) ? (
                    <Button disabled variant="outline" className="w-full gap-1"><Check className="h-4 w-4" /> Already Applied</Button>
                  ) : (
                    <Button className="w-full gap-1" onClick={() => { setApplyingTo(selectedCampaign); setSelectedCampaign(null); }}>
                      <Send className="h-4 w-4" /> Apply Now
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={(open) => { if (!open) { setApplyingTo(null); setCoverLetter(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to: {applyingTo?.title}</DialogTitle>
            <DialogDescription>Write a cover letter explaining why you're a great fit for this campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Textarea
                placeholder="Tell the brand why you're the perfect creator for this campaign — your experience, content style, audience match, etc."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[200px]"
              />
              <p className={`text-xs mt-1 ${coverLetter.length >= 300 ? "text-muted-foreground" : "text-destructive"}`}>
                {coverLetter.length}/300 characters minimum
              </p>
            </div>
            <Button onClick={handleApply} disabled={submitting || coverLetter.length < 300} className="w-full">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Campaign Confirmation */}
      <AlertDialog open={!!leavingCampaign} onOpenChange={(open) => !open && setLeavingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this campaign?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to leave <strong>"{leavingCampaign?._campaign?.title}"</strong>.
              </span>
              <span className="block font-medium text-foreground">
                Videos delivered so far: {leavingCampaign?.videos_delivered || 0} / {leavingCampaign?._campaign?.expected_video_count || 0}
              </span>
              <span className="block text-sm">
                You'll be removed from the group chat but can still message the brand privately. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Yes, leave campaign</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Final confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely sure you want to leave? You have delivered <strong>{leavingCampaign?.videos_delivered || 0}</strong> video{(leavingCampaign?.videos_delivered || 0) !== 1 ? "s" : ""} so far. This is permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleLeaveCampaign}
                    disabled={leavingLoading}
                  >
                    {leavingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave permanently"}
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

export default Gigs;
