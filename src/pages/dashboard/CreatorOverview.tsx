import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MessageCircle, Video, Mail, TrendingUp, Clock } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Link } from "react-router-dom";

const CreatorOverview = () => {
  const { user } = useAuth();
  const unread = useUnreadMessages();
  const [stats, setStats] = useState({
    activeGigs: 0,
    pendingApps: 0,
    acceptedApps: 0,
    pendingVideos: 0,
    acceptedVideos: 0,
    rejectedVideos: 0,
    invites: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch applications
    supabase.from("campaign_applications").select("id, status, campaign_id, created_at").eq("creator_user_id", user.id).then(({ data }) => {
      const apps = data || [];
      setStats(s => ({
        ...s,
        pendingApps: apps.filter(a => a.status === "pending").length,
        acceptedApps: apps.filter(a => a.status === "accepted").length,
        activeGigs: apps.filter(a => a.status === "accepted").length,
      }));
    });

    // Fetch video submissions
    supabase.from("video_submissions").select("id, status, title, created_at").eq("creator_user_id", user.id).then(({ data }) => {
      const vids = data || [];
      setStats(s => ({
        ...s,
        pendingVideos: vids.filter(v => v.status === "pending").length,
        acceptedVideos: vids.filter(v => v.status === "accepted").length,
        rejectedVideos: vids.filter(v => v.status === "rejected").length,
      }));
    });

    // Fetch invites
    supabase.from("campaign_invites").select("id").eq("creator_user_id", user.id).eq("status", "pending").then(({ data }) => {
      setStats(s => ({ ...s, invites: (data || []).length }));
    });

    // Recent notifications as activity
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => {
      setRecentActivity(data || []);
    });
  }, [user]);

  const statCards = [
    { label: "Unread Messages", value: unread.total, icon: MessageCircle, color: "text-blue-500", link: "/dashboard/messages" },
    { label: "Active Gigs", value: stats.activeGigs, icon: Briefcase, color: "text-emerald-500", link: "/dashboard/gigs" },
    { label: "Pending Invites", value: stats.invites, icon: Mail, color: "text-amber-500", link: "/dashboard/gigs" },
    { label: "Videos Pending", value: stats.pendingVideos, icon: Video, color: "text-purple-500", link: "/dashboard/videos" },
    { label: "Videos Accepted", value: stats.acceptedVideos, icon: TrendingUp, color: "text-emerald-500", link: "/dashboard/videos" },
    { label: "Pending Applications", value: stats.pendingApps, icon: Clock, color: "text-orange-500", link: "/dashboard/gigs" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your creator account</p>
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
          <CardTitle className="text-base font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity yet</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    {notif.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorOverview;
