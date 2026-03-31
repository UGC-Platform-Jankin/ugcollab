import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Users, Megaphone, BarChart3, User, MessageCircle, Video, Link2 } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const BrandLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const unread = useUnreadMessages();

  const navItems = [
    { label: "Overview", icon: BarChart3, path: "/brand/dashboard", badge: 0 },
    { label: "Campaigns", icon: Megaphone, path: "/brand/campaigns", badge: 0 },
    { label: "Video Review", icon: Video, path: "/brand/video-review", badge: 0 },
    { label: "Posted Videos", icon: Link2, path: "/brand/posted-videos", badge: 0 },
    { label: "Messages", icon: MessageCircle, path: "/brand/messages", badge: unread.total },
    { label: "Find Creators", icon: Users, path: "/brand/creators", badge: 0 },
    { label: "Profile", icon: User, path: "/brand/profile", badge: 0 },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/brand/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("brand_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (!data) navigate("/brand/setup");
        else setBrandProfile(data);
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
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="h-5 min-w-[20px] rounded-full bg-primary text-[11px] font-bold text-primary-foreground flex items-center justify-center px-1.5">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default BrandLayout;
