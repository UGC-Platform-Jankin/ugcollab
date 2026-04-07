import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Video, Link2, Calendar, BookOpen, ArrowRightLeft } from "lucide-react";
import CreatorVideosForGig from "@/components/campaign/CreatorVideos";
import CreatorPostedForGig from "@/components/campaign/CreatorPostedVideos";
import PostingSchedule from "@/components/campaign/PostingSchedule";
import CreatorResources from "@/components/campaign/CreatorResources";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const CreatorGigDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaign, setCampaign] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterVideos, setCounterVideos] = useState("");
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const { toast } = useToast();

  const currentTab = location.pathname.endsWith("/posted") ? "posted"
    : location.pathname.endsWith("/schedule") ? "schedule"
    : location.pathname.endsWith("/resources") ? "resources"
    : "videos";

  const handleTabChange = (val: string) => {
    const base = `/dashboard/gig/${campaignId}`;
    const suffix = val === "videos" ? "" : `/${val}`;
    navigate(base + suffix);
  };

  useEffect(() => {
    if (!user || !campaignId) return;
    const load = async () => {
      const { data: app } = await supabase
        .from("campaign_applications")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("creator_user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (!app) { navigate("/dashboard/gigs"); return; }
      setApplication(app);

      const { data: camp } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
      if (!camp) { navigate("/dashboard/gigs"); return; }
      setCampaign(camp);
      setLoading(false);
    };
    load();
  }, [user, campaignId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const showSchedule = (campaign as any).posting_schedule_enabled;

  const handleSubmitCounterOffer = async () => {
    if (!application) return;
    setSubmittingCounter(true);
    await supabase.from("campaign_applications").update({
      proposed_price_per_video: counterPrice ? Number(counterPrice) : null,
      proposed_video_count: counterVideos ? Number(counterVideos) : null,
      pricing_status: "countered",
    } as any).eq("id", application.id);
    // Notify brand
    const { data: camp } = await supabase.from("campaigns").select("brand_user_id, title").eq("id", campaignId).single();
    if (camp) {
      await supabase.from("notifications").insert({
        user_id: camp.brand_user_id,
        type: "counter_offer",
        title: "Counter Offer Received",
        body: `A creator has sent a counter offer for "${camp.title}"`,
        link: `/brand/campaigns/${campaignId}/pricing`,
      });
    }
    toast({ title: "Counter offer sent to brand!" });
    setCounterOfferOpen(false);
    setCounterPrice("");
    setCounterVideos("");
    setSubmittingCounter(false);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">{campaign.title}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage your videos and schedule for this gig</p>
          </div>
          {application && (
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3 border border-border/50">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Your Agreement</p>
                <p className="text-sm font-bold">
                  HK${application.agreed_price_per_video ?? campaign.price_per_video ?? 0}/video × {application.agreed_video_count ?? campaign.expected_video_count ?? 1} video(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  Total: HK${((application.agreed_price_per_video ?? campaign.price_per_video ?? 0) * (application.agreed_video_count ?? campaign.expected_video_count ?? 1)).toLocaleString()}
                </p>
              </div>
              {application.pricing_status !== "countered" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setCounterPrice(application.agreed_price_per_video?.toString() || campaign.price_per_video?.toString() || "");
                    setCounterVideos(application.agreed_video_count?.toString() || campaign.expected_video_count?.toString() || "1");
                    setCounterOfferOpen(true);
                  }}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Counter Offer
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Videos</TabsTrigger>
          <TabsTrigger value="posted" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Posted Videos</TabsTrigger>
          {showSchedule && (
            <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
          )}
          <TabsTrigger value="resources" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <CreatorVideosForGig campaignId={campaignId!} campaignTitle={campaign.title} />
        </TabsContent>
        <TabsContent value="posted">
          <CreatorPostedForGig campaignId={campaignId!} campaignTitle={campaign.title} />
        </TabsContent>
        {showSchedule && (
          <TabsContent value="schedule">
            <PostingSchedule campaignId={campaignId!} readOnly />
          </TabsContent>
        )}
        <TabsContent value="resources">
          <CreatorResources campaignId={campaignId!} />
        </TabsContent>
      </Tabs>

      {/* Counter Offer Dialog */}
      <Dialog open={counterOfferOpen} onOpenChange={setCounterOfferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Counter Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Propose different terms to the brand. You can adjust the price per video and/or number of videos.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Your Proposed Price per Video (HKD)</Label>
                <Input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="e.g. 600"
                />
              </div>
              <div>
                <Label>Your Proposed Number of Videos</Label>
                <Input
                  type="number"
                  value={counterVideos}
                  onChange={(e) => setCounterVideos(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>
            </div>
            {counterPrice && counterVideos && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium">Total: HK${(Number(counterPrice) * Number(counterVideos)).toLocaleString()}</p>
              </div>
            )}
            <Button
              onClick={handleSubmitCounterOffer}
              disabled={submittingCounter || !counterPrice || !counterVideos}
              className="w-full"
            >
              {submittingCounter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Counter Offer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorGigDetail;
