import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Megaphone, MessageCircle, Video, Plus, TrendingUp, Clock, ArrowRight, Bell, CheckCircle, XCircle, Send, RefreshCw } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface ActivityItem {
  id: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  text: string;
  time: string;
  link: string;
}

const BrandOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadMessages();
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [stats, setStats] = useState({ activeCampaigns: 0, totalApps: 0, pendingApps: 0, pendingVideos: 0, acceptedVideos: 0 });
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!user) return;

    supabase.from("brand_profiles").select("business_name, logo_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setBrandProfile(data);
    });

    supabase.from("campaigns").select("id, title, status").eq("brand_user_id", user.id).then(async ({ data: campaigns }) => {
      const all = campaigns || [];
      const active = all.filter((c: any) => c.status === "active");
      setStats(s => ({ ...s, activeCampaigns: active.length }));

      if (all.length > 0) {
        const ids = all.map((c: any) => c.id);
        const campMap: Record<string, string> = {};
        all.forEach((c: any) => { campMap[c.id] = c.title; });

        const [appsRes, videosRes] = await Promise.all([
          supabase.from("campaign_applications").select("id, status, creator_user_id, campaign_id, created_at").in("campaign_id", ids).order("created_at", { ascending: false }),
          supabase.from("video_submissions").select("id, status, title, campaign_id, creator_user_id, created_at, updated_at").in("campaign_id", ids).order("updated_at", { ascending: false }),
        ]);

        const allApps = appsRes.data || [];
        const allVids = videosRes.data || [];

        setStats(s => ({
          ...s,
          totalApps: allApps.length,
          pendingApps: allApps.filter(a => a.status === "pending").length,
          pendingVideos: allVids.filter(v => v.status === "pending").length,
          acceptedVideos: allVids.filter(v => v.status === "accepted").length,
        }));

        // Gather creator profiles for activity feed
        const creatorIds = [...new Set([
          ...allApps.slice(0, 10).map((a: any) => a.creator_user_id),
          ...allVids.slice(0, 10).map((v: any) => v.creator_user_id),
        ])] as string[];

        let profileMap: Record<string, any> = {};
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
          (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
        }

        // Build activity feed from recent apps + video submissions
        const activityItems: ActivityItem[] = [];

        // Recent applications
        allApps.slice(0, 5).forEach((app: any) => {
          const name = profileMap[app.creator_user_id]?.display_name || profileMap[app.creator_user_id]?.username || "A creator";
          const camp = campMap[app.campaign_id] || "a campaign";
          activityItems.push({
            id: `app-${app.id}`,
            icon: Send,
            iconColor: "text-blue-600 dark:text-blue-400",
            iconBg: "bg-blue-50 dark:bg-blue-500/10",
            text: `${name} applied to "${camp}"`,
            time: app.created_at,
            link: "/brand/campaigns",
          });
        });

        // Recent video submissions/resubmissions
        allVids.slice(0, 5).forEach((vid: any) => {
          const name = profileMap[vid.creator_user_id]?.display_name || profileMap[vid.creator_user_id]?.username || "A creator";
          const camp = campMap[vid.campaign_id] || "a campaign";
          const isResubmission = vid.updated_at !== vid.created_at && vid.status === "pending";
          activityItems.push({
            id: `vid-${vid.id}`,
            icon: isResubmission ? RefreshCw : Video,
            iconColor: isResubmission ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400",
            iconBg: isResubmission ? "bg-amber-50 dark:bg-amber-500/10" : "bg-purple-50 dark:bg-purple-500/10",
            text: isResubmission
              ? `${name} resubmitted "${vid.title}" for "${camp}"`
              : `${name} submitted "${vid.title}" for "${camp}"`,
            time: vid.updated_at || vid.created_at,
            link: `/brand/campaigns/${vid.campaign_id}`,
          });
        });

        // Sort by time, most recent first
        activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivities(activityItems.slice(0, 8));

        // Recent apps for the card list
        const recent = allApps.slice(0, 5);
        setRecentApps(recent.map((a: any) => {
          const p = profileMap[a.creator_user_id];
          return {
            ...a,
            _name: p?.display_name || p?.username || "Creator",
            _avatar: p?.avatar_url,
            _campaign: campMap[a.campaign_id] || "Campaign",
          };
        }));
      }
    });
  }, [user]);

  const statCards = [
    { label: "Unread Messages", value: unread.total, icon: MessageCircle, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", link: "/brand/messages" },
    { label: "Active Campaigns", value: stats.activeCampaigns, icon: Megaphone, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", link: "/brand/campaigns" },
    { label: "Pending Applications", value: stats.pendingApps, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", link: "/brand/campaigns" },
    { label: "Videos for Review", value: stats.pendingVideos, icon: Video, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10", link: "/brand/video-review" },
    { label: "Videos Accepted", value: stats.acceptedVideos, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", link: "/brand/video-review" },
    { label: "Total Applications", value: stats.totalApps, icon: Users, color: "text-primary", bg: "bg-primary/5", link: "/brand/campaigns" },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-border p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-xl ring-2 ring-primary/20">
              <AvatarImage src={brandProfile?.logo_url} className="rounded-xl" />
              <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                {(brandProfile?.business_name || "B").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {brandProfile?.business_name || "Brand"} Dashboard
              </h1>
              <p className="text-muted-foreground mt-0.5">Track your campaigns and creator engagement</p>
            </div>
          </div>
          <Button onClick={() => navigate("/brand/campaigns/new")} className="gap-2 shadow-coral hidden md:flex">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Latest Updates */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" /> Latest Updates
            </h2>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate(activity.link)}
                  >
                    <div className={`h-8 w-8 rounded-lg ${activity.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <activity.icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{activity.text}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Applications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" /> Recent Applications
          </h2>
          <Link to="/brand/campaigns" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentApps.length === 0 ? (
          <Card className="border-border border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No applications yet. Create a campaign to start receiving applications.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentApps.map((app) => (
              <Card
                key={app.id}
                className="border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                onClick={() => navigate("/brand/campaigns", { state: { openCampaignId: app.campaign_id } })}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {app._avatar ? <AvatarImage src={app._avatar} /> : null}
                    <AvatarFallback className="bg-secondary text-xs font-bold">{app._name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{app._name}</p>
                    <p className="text-xs text-muted-foreground truncate">Applied to {app._campaign}</p>
                  </div>
                  <Badge variant={app.status === "pending" ? "outline" : app.status === "accepted" ? "default" : "destructive"} className="text-xs capitalize shrink-0">
                    {app.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandOverview;
