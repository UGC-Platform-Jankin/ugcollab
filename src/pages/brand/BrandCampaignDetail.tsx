import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Video, Link2, Calendar, Settings, Users, DollarSign, MessageCircle } from "lucide-react";
import VideoReviewForCampaign from "@/components/campaign/BrandVideoReview";
import BrandPostedForCampaign from "@/components/campaign/BrandPostedVideos";
import PostingSchedule from "@/components/campaign/PostingSchedule";
import CampaignSettings from "@/components/campaign/CampaignSettings";
import AllCreators from "@/components/campaign/AllCreators";
import CreatorPricingSpreadsheet from "@/components/campaign/CreatorPricingSpreadsheet";
import BrandVideos from "@/components/campaign/BrandVideos";
import CampaignChat from "@/components/campaign/CampaignChat";
import CampaignApplications from "@/components/campaign/CampaignApplications";

const BrandCampaignDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const specificCreatorId = searchParams.get("creator");

  const currentTab = location.pathname.endsWith("/posted") ? "posted"
    : location.pathname.endsWith("/schedule") ? "schedule"
    : location.pathname.endsWith("/videos") ? "videos"
    : location.pathname.endsWith("/creators") ? "creators"
    : location.pathname.endsWith("/applications") ? "applications"
    : location.pathname.endsWith("/pricing") ? "pricing"
    : location.pathname.endsWith("/messages") ? "messages"
    : location.pathname.endsWith("/private") ? "private"
    : "settings";

  const handleTabChange = (val: string) => {
    const base = `/brand/campaigns/${campaignId}`;
    const suffix = `/${val}`;
    navigate(base + suffix);
  };

  useEffect(() => {
    if (!user || !campaignId) return;
    supabase.from("campaigns").select("*").eq("id", campaignId).eq("brand_user_id", user.id).single().then(({ data, error }) => {
      if (error || !data) { navigate("/brand/campaigns"); return; }
      setCampaign(data);
      setLoading(false);
    });
  }, [user, campaignId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">{campaign.title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage videos, schedule, and settings for this campaign</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          {campaign.campaign_type === "prize_pool" ? (
            <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Videos</TabsTrigger>
          ) : (
            <TabsTrigger value="videos" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Video Review</TabsTrigger>
          )}
          <TabsTrigger value="posted" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Posted Videos</TabsTrigger>
          {campaign.posting_schedule_enabled && (
            <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Schedule</TabsTrigger>
          )}
          <TabsTrigger value="creators" className="gap-1.5"><Users className="h-3.5 w-3.5" /> All Creators</TabsTrigger>
          <TabsTrigger value="applications" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Applications</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Pricing</TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
          <TabsTrigger value="private" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Private</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          {campaign.campaign_type === "prize_pool" ? (
            <BrandVideos campaignId={campaignId!} />
          ) : (
            <VideoReviewForCampaign campaignId={campaignId!} />
          )}
        </TabsContent>
        <TabsContent value="posted">
          <BrandPostedForCampaign campaignId={campaignId!} />
        </TabsContent>
        {campaign.posting_schedule_enabled && (
          <TabsContent value="schedule">
            <PostingSchedule campaignId={campaignId!} />
          </TabsContent>
        )}
        <TabsContent value="creators">
          <AllCreators campaignId={campaignId!} />
        </TabsContent>
        <TabsContent value="applications">
          <CampaignApplications campaignId={campaignId!} />
        </TabsContent>
        <TabsContent value="pricing">
          <CreatorPricingSpreadsheet campaignId={campaignId!} />
        </TabsContent>
        <TabsContent value="messages">
          <div className="h-[580px]">
            <CampaignChat campaignId={campaignId!} roomType="group" isBrandView />
          </div>
        </TabsContent>
        <TabsContent value="private">
          <div className="h-[580px]">
            <CampaignChat campaignId={campaignId!} roomType="private" isBrandView specificCreatorId={specificCreatorId} />
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <CampaignSettings campaignId={campaignId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandCampaignDetail;
