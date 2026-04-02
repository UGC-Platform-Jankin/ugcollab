import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Megaphone, MessageCircle, Video, Plus, TrendingUp, Clock } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const BrandOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadMessages();
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalApps: 0,
    pendingApps: 0,
    pendingVideos: 0,
    acceptedVideos: 0,
  });
  const [recentApps, setRecentApps] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    supabase.from("campaigns").select("id, title, status").eq("brand_user_id", user.id).then(({ data: campaigns }) => {
      const all = campaigns || [];
      const active = all.filter((c: any) => c.status === "active");
      setStats(s => ({ ...s, activeCampaigns: active.length }));

      if (all.length > 0) {
        const ids = all.map((c: any) => c.id);
        
        supabase.from("campaign_applications").select("id, status, creator_user_id, campaign_id, created_at").in("campaign_id", ids).order("created_at", { ascending: false }).then(({ data: apps }) => {
          const allApps = apps || [];
          setStats(s => ({
            ...s,
            totalApps: allApps.length,
            pendingApps: allApps.filter(a => a.status === "pending").length,
          }));

          const recent = allApps.slice(0, 5);
          const creatorIds = [...new Set(recent.map((a: any) => a.creator_user_id))] as string[];
          if (creatorIds.length > 0) {
            supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds).then(({ data: profiles }) => {
              const pMap: Record<string, any> = {};
              (profiles || []).forEach((p: any) => { pMap[p.user_id] = p; });
              const cMap: Record<string, string> = {};
              all.forEach((c: any) => { cMap[c.id] = c.title; });
              setRecentApps(recent.map((a: any) => ({
                ...a,
                _name: pMap[a.creator_user_id]?.display_name || pMap[a.creator_user_id]?.username || "Creator",
                _avatar: pMap[a.creator_user_id]?.avatar_url,
                _campaign: cMap[a.campaign_id] || "Campaign",
              })));
            });
          }
        });

        supabase.from("video_submissions").select("id, status").in("campaign_id", ids).then(({ data: vids }) => {
          const allVids = vids || [];
          setStats(s => ({
            ...s,
            pendingVideos: allVids.filter(v => v.status === "pending").length,
            acceptedVideos: allVids.filter(v => v.status === "accepted").length,
          }));
        });
      }
    });
  }, [user]);

  const statCards = [
    { label: "Unread Messages", value: unread.total, icon: MessageCircle, color: "text-blue-500", link: "/brand/messages" },
    { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-emerald-500", link: "/brand/campaigns" },
    { label: "Pending Applications", value: stats.pendingApps, icon: Clock, color: "text-amber-500", link: "/brand/campaigns" },
    { label: "Videos for Review", value: stats.pendingVideos, icon: Video, color: "text-purple-500", link: "/brand/video-review" },
    { label: "Videos Accepted", value: stats.acceptedVideos, icon: TrendingUp, color: "text-emerald-500", link: "/brand/video-review" },
    { label: "Total Applications", value: stats.totalApps, icon: Users, color: "text-orange-500", link: "/brand/campaigns" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Brand Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your campaigns and creator engagement</p>
        </div>
        <Button onClick={() => navigate("/brand/campaigns/new")} className="gap-2">
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Users className="h-4 w-4" /> Recent Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentApps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No applications yet. Create a campaign to start receiving applications.</p>
          ) : (
            <div className="space-y-2">
              {recentApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 cursor-pointer transition-colors"
                  onClick={() => navigate("/brand/campaigns", { state: { openCampaignId: app.campaign_id } })}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                    {app._avatar ? (
                      <img src={app._avatar} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      app._name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{app._name}</p>
                    <p className="text-xs text-muted-foreground truncate">Applied to {app._campaign}</p>
                  </div>
                  <Badge variant={app.status === "pending" ? "outline" : app.status === "accepted" ? "default" : "destructive"} className="text-xs capitalize shrink-0">{app.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandOverview;
