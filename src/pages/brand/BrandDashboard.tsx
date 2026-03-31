import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, Users, Megaphone, BarChart3, Plus, User, MessageCircle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

const BrandDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [creatorsApplied, setCreatorsApplied] = useState(0);
  const [recentApps, setRecentApps] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/brand/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("brand_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (!data) {
          navigate("/brand/setup");
        } else {
          setBrandProfile(data);
        }
      });

      // Fetch stats
      supabase.from("campaigns").select("id, title, status").eq("brand_user_id", user.id).then(({ data: campaigns }) => {
        const allCampaigns = campaigns || [];
        const active = allCampaigns.filter((c: any) => c.status === "active");
        setActiveCampaigns(active.length);

        if (allCampaigns.length > 0) {
          const campaignIds = allCampaigns.map((c: any) => c.id);
          supabase.from("campaign_applications").select("*").in("campaign_id", campaignIds).order("created_at", { ascending: false }).then(({ data: apps }) => {
            setCreatorsApplied((apps || []).length);
            // Enrich recent apps with campaign title and creator profile
            const recent = (apps || []).slice(0, 5);
            const creatorIds = [...new Set(recent.map((a: any) => a.creator_user_id))] as string[];
            if (creatorIds.length > 0) {
              supabase.from("profiles").select("*").in("user_id", creatorIds).then(({ data: profiles }) => {
                const profileMap: Record<string, any> = {};
                (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
                const campaignMap: Record<string, string> = {};
                allCampaigns.forEach((c: any) => { campaignMap[c.id] = c.title; });
                setRecentApps(recent.map((a: any) => ({
                  ...a,
                  _creatorName: profileMap[a.creator_user_id]?.display_name || profileMap[a.creator_user_id]?.username || "Creator",
                  _creatorAvatar: profileMap[a.creator_user_id]?.avatar_url,
                  _campaignTitle: campaignMap[a.campaign_id] || "Campaign",
                })));
              });
            } else {
              setRecentApps([]);
            }
          });
        }
      });
    }
  }, [user, navigate]);

  if (loading || !brandProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Brand Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/brand/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" /> Overview
          </Link>
          <Link to="/brand/campaigns" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Megaphone className="h-4 w-4" /> Campaigns
          </Link>
          <Link to="/brand/messages" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
            <MessageCircle className="h-4 w-4" /> Messages
          </Link>
          <Link to="/brand/creators" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Users className="h-4 w-4" /> Find Creators
          </Link>
          <Link to="/brand/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
            <User className="h-4 w-4" /> Profile
          </Link>
        </nav>
        <div className="p-4 border-t border-border/50">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => signOut().then(() => navigate("/"))}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {brandProfile.logo_url && (
                <img src={brandProfile.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover border border-border" />
              )}
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">{brandProfile.business_name}</h1>
                <p className="text-sm text-muted-foreground">{brandProfile.business_type} · {brandProfile.country}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/brand/campaigns/new")} className="gap-2">
              <Plus className="h-4 w-4" /> Create Campaign
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Active Campaigns</CardDescription>
                <CardTitle className="text-3xl font-heading">{activeCampaigns}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{activeCampaigns === 0 ? "Create your first campaign to find creators" : `${activeCampaigns} campaign${activeCampaigns > 1 ? "s" : ""} running`}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Creators Applied</CardDescription>
                <CardTitle className="text-3xl font-heading">{creatorsApplied}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{creatorsApplied === 0 ? "Creators will appear here once you post campaigns" : `${creatorsApplied} total application${creatorsApplied > 1 ? "s" : ""}`}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Content Delivered</CardDescription>
                <CardTitle className="text-3xl font-heading">0</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Track delivered UGC content here</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Applications */}
          <Card className="mt-8 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Recent Applications</CardTitle>
              <CardDescription>Latest creator applications across your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {recentApps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No applications yet. Create a campaign to start receiving applications.</p>
              ) : (
                <div className="space-y-3">
                  {recentApps.map((app) => (
                    <div key={app.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                        {app._creatorAvatar ? (
                          <img src={app._creatorAvatar} alt="" className="h-full w-full object-cover rounded-full" />
                        ) : (
                          app._creatorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{app._creatorName}</p>
                        <p className="text-xs text-muted-foreground truncate">Applied to <span className="text-primary">{app._campaignTitle}</span></p>
                      </div>
                      <Badge variant={app.status === "pending" ? "outline" : app.status === "accepted" ? "default" : "destructive"} className="text-xs capitalize shrink-0">{app.status}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-8 border-border/50">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Here's how to find the right creators for your brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">1</div>
                <div>
                  <p className="font-medium text-foreground">Create a Campaign</p>
                  <p className="text-sm text-muted-foreground">Describe what kind of UGC content you need, set your budget and deadline.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">2</div>
                <div>
                  <p className="font-medium text-foreground">Review Creator Applications</p>
                  <p className="text-sm text-muted-foreground">Browse creator profiles, check their stats, and pick the best fit.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">3</div>
                <div>
                  <p className="font-medium text-foreground">Receive & Approve Content</p>
                  <p className="text-sm text-muted-foreground">Get UGC content delivered, review it, and process payment — all in one place.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BrandDashboard;
