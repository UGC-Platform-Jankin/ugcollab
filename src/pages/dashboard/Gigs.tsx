import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Clock, DollarSign, MapPin, Send, Loader2, Check, LogOut, Gift, Video, MoreHorizontal } from "lucide-react";
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

type TabFilter = "available" | "applied" | "active";

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
  const [activeTab, setActiveTab] = useState<TabFilter>("available");

  useEffect(() => {
    const fetchData = async () => {
      const [campaignsRes, applicationsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        user ? supabase.from("campaign_applications").select("*").eq("creator_user_id", user.id) : Promise.resolve({ data: [] }),
      ]);
      setCampaigns((campaignsRes.data as any) || []);

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
      campaign_id: applyingTo.id, creator_user_id: user.id, cover_letter: coverLetter,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    setAppliedCampaigns((prev) => new Set([...prev, applyingTo.id]));
    await supabase.from("notifications" as any).insert({
      user_id: applyingTo.brand_user_id, type: "application", title: "New Application",
      body: `A creator applied to "${applyingTo.title}"`, link: "/brand/campaigns",
    } as any);
    toast({ title: "Application sent!", description: "The brand will review your application." });
    setApplyingTo(null);
    setCoverLetter("");
    setSubmitting(false);
  };

  const handleLeaveCampaign = async () => {
    if (!leavingCampaign || !user) return;
    setLeavingLoading(true);
    await supabase.from("campaign_applications").update({ status: "left" } as any).eq("id", leavingCampaign.id);
    const { data: groupRoom } = await supabase.from("chat_rooms").select("id").eq("campaign_id", leavingCampaign.campaign_id).eq("type", "group").maybeSingle();
    if (groupRoom) {
      await supabase.from("messages").insert({ chat_room_id: groupRoom.id, sender_id: user.id, content: `I've left this campaign. Thanks for the opportunity!` } as any);
    }
    await supabase.from("notifications" as any).insert({
      user_id: leavingCampaign._campaign?.brand_user_id || "", type: "application_update", title: "Creator Left Campaign",
      body: `A creator has left "${leavingCampaign._campaign?.title || "your campaign"}". Videos delivered: ${leavingCampaign.videos_delivered || 0}`, link: "/brand/campaigns",
    } as any);
    setActiveMemberships((prev) => prev.filter((m) => m.id !== leavingCampaign.id));
    toast({ title: "You've left the campaign" });
    setLeavingCampaign(null);
    setLeavingLoading(false);
  };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "available", label: "Available", count: campaigns.filter(c => !appliedCampaigns.has(c.id)).length },
    { key: "applied", label: "Applied", count: appliedCampaigns.size },
    { key: "active", label: "Active", count: activeMemberships.length },
  ];

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === "available") return !appliedCampaigns.has(c.id);
    if (activeTab === "applied") return appliedCampaigns.has(c.id) && !activeMemberships.some(m => m.campaign_id === c.id);
    return false;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Gigs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Browse campaigns and find your next collaboration</p>
      </div>

      {/* Tab Bar */}
      <div className="inline-flex items-center bg-secondary rounded-full p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? "opacity-80" : "opacity-60"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === "active" ? (
        activeMemberships.length === 0 ? (
          <EmptyState icon={Check} title="No active campaigns" subtitle="Campaigns you've been accepted to will appear here" />
        ) : (
          <div className="space-y-3">
            {activeMemberships.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-coral flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{m._campaign.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {m.videos_delivered || 0}/{m._campaign.expected_video_count} videos
                        </span>
                        <Badge className="bg-primary/10 text-primary border-0 text-[11px] font-bold uppercase tracking-wide">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 rounded-full"
                    onClick={() => setLeavingCampaign(m)}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Leave
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={activeTab === "available" ? "No gigs available" : "No applications yet"}
          subtitle={activeTab === "available" ? "New campaigns from brands will appear here" : "Apply to campaigns to see them here"}
        />
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const hasApplied = appliedCampaigns.has(campaign.id);
            const brand = brandProfiles[campaign.brand_user_id];
            return (
              <div
                key={campaign.id}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 rounded-xl shrink-0 ring-2 ring-border">
                    <AvatarImage src={brand?.logo_url || undefined} className="rounded-xl object-cover" />
                    <AvatarFallback className="rounded-xl bg-secondary text-base font-bold">
                      {(brand?.business_name || "B").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-foreground text-base leading-tight truncate">
                          {campaign.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{brand?.business_name || "Brand"}</p>
                      </div>
                      {hasApplied && (
                        <Badge className="bg-accent/10 text-accent-foreground border-0 text-[11px] font-bold uppercase tracking-wide shrink-0">
                          Applied
                        </Badge>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                      {campaign.target_regions && campaign.target_regions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {campaign.target_regions.join(", ")}
                        </span>
                      )}
                      {campaign.campaign_length_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {campaign.campaign_length_days} days
                        </span>
                      )}
                      {campaign.expected_video_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Video className="h-3.5 w-3.5" />
                          {campaign.expected_video_count} video{campaign.expected_video_count > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Platforms */}
                    {campaign.platforms && campaign.platforms.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-3">
                        {campaign.platforms.map((p) => (
                          <span key={p} className="px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {campaign.is_free_product ? (
                      <><Gift className="h-4 w-4 text-primary" /> Free Product</>
                    ) : campaign.price_per_video ? (
                      <><DollarSign className="h-4 w-4 text-primary" /> HK${campaign.price_per_video}/video</>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasApplied ? (
                      <Button size="sm" variant="outline" disabled className="rounded-full gap-1.5 text-xs">
                        <Check className="h-3.5 w-3.5" /> Applied
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full gap-1.5 text-xs font-bold uppercase tracking-wide"
                        onClick={(e) => { e.stopPropagation(); setApplyingTo(campaign); }}
                      >
                        Apply
                      </Button>
                    )}
                    <button
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                      onClick={(e) => { e.stopPropagation(); setSelectedCampaign(campaign); }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={brandProfiles[selectedCampaign.brand_user_id]?.logo_url || undefined} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-secondary font-bold">
                      {(brandProfiles[selectedCampaign.brand_user_id]?.business_name || "B").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-lg font-heading font-bold">{selectedCampaign.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{brandProfiles[selectedCampaign.brand_user_id]?.business_name}</p>
                  </div>
                </div>
                {selectedCampaign.platforms && selectedCampaign.platforms.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {selectedCampaign.platforms.map((p) => (
                      <span key={p} className="px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-foreground capitalize">{p}</span>
                    ))}
                  </div>
                )}
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedCampaign.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Compensation", value: selectedCampaign.is_free_product ? "Free Product" : `HK$${selectedCampaign.price_per_video}/video` },
                    { label: "Videos Expected", value: String(selectedCampaign.expected_video_count) },
                    ...(selectedCampaign.campaign_length_days ? [{ label: "Duration", value: `${selectedCampaign.campaign_length_days} days` }] : []),
                    ...(selectedCampaign.target_regions ? [{ label: "Regions", value: selectedCampaign.target_regions.join(", ") }] : []),
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{item.label}</p>
                      <p className="font-semibold text-foreground text-sm mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                {selectedCampaign.requirements && (
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Requirements</p>
                    <p className="text-sm text-foreground leading-relaxed">{selectedCampaign.requirements}</p>
                  </div>
                )}
                <div className="pt-2">
                  {appliedCampaigns.has(selectedCampaign.id) ? (
                    <Button disabled variant="outline" className="w-full gap-1.5 rounded-full"><Check className="h-4 w-4" /> Already Applied</Button>
                  ) : (
                    <Button className="w-full gap-1.5 rounded-full font-bold" onClick={() => { setApplyingTo(selectedCampaign); setSelectedCampaign(null); }}>
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
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Apply to: {applyingTo?.title}</DialogTitle>
            <DialogDescription>Write a cover letter explaining why you're a great fit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Textarea
                placeholder="Tell the brand why you're the perfect creator for this campaign. Share your experience, content style, audience match, etc."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[200px] rounded-xl"
              />
              <p className={`text-xs mt-1.5 ${coverLetter.length >= 300 ? "text-muted-foreground" : "text-destructive"}`}>
                {coverLetter.length}/300 characters minimum
              </p>
            </div>
            <Button onClick={handleApply} disabled={submitting || coverLetter.length < 300} className="w-full rounded-full font-bold">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Campaign Confirmation */}
      <AlertDialog open={!!leavingCampaign} onOpenChange={(open) => !open && setLeavingCampaign(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-bold">Leave this campaign?</AlertDialogTitle>
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
            <AlertDialogCancel className="rounded-full">Stay</AlertDialogCancel>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="rounded-full">Yes, leave campaign</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading font-bold">Final confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you absolutely sure you want to leave? You have delivered <strong>{leavingCampaign?.videos_delivered || 0}</strong> video{(leavingCampaign?.videos_delivered || 0) !== 1 ? "s" : ""} so far. This is permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Go back</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
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

const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20">
    <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-base font-heading font-bold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground text-sm text-center max-w-xs">{subtitle}</p>
  </div>
);

export default Gigs;
