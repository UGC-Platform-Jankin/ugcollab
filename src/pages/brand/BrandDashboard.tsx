import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogOut, Users, Megaphone, BarChart3 } from "lucide-react";

const BrandDashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [brandProfile, setBrandProfile] = useState<any>(null);

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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" /> Overview
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer">
            <Megaphone className="h-4 w-4" /> Campaigns
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer">
            <Users className="h-4 w-4" /> Find Creators
          </div>
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
          <div className="flex items-center gap-4 mb-8">
            {brandProfile.logo_url && (
              <img src={brandProfile.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover border border-border" />
            )}
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">{brandProfile.business_name}</h1>
              <p className="text-sm text-muted-foreground">{brandProfile.business_type} · {brandProfile.country}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Active Campaigns</CardDescription>
                <CardTitle className="text-3xl font-heading">0</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Create your first campaign to find creators</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>Creators Applied</CardDescription>
                <CardTitle className="text-3xl font-heading">0</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Creators will appear here once you post campaigns</p>
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
