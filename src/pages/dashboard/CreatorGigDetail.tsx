import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Video, Link2, Calendar, BookOpen } from "lucide-react";
import CreatorVideosForGig from "@/components/campaign/CreatorVideos";
import CreatorPostedForGig from "@/components/campaign/CreatorPostedVideos";
import PostingSchedule from "@/components/campaign/PostingSchedule";
import CreatorResources from "@/components/campaign/CreatorResources";

const CreatorGigDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("creator_user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      
      if (!app) { navigate("/dashboard/gigs"); return; }

      const { data: camp } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
      if (!camp) { navigate("/dashboard/gigs"); return; }
      setCampaign(camp);
      setLoading(false);
    };
    load();
  }, [user, campaignId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const showSchedule = (campaign as any).posting_schedule_enabled;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">{campaign.title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your videos and schedule for this gig</p>
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
    </div>
  );
};

export default CreatorGigDetail;
