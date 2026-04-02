import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Users, Megaphone, BarChart3, User, MessageCircle, Video, Link2, Sun, Moon } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTheme } from "@/contexts/ThemeContext";

const BrandLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const unread = useUnreadMessages();
  const { theme, toggleTheme } = useTheme();

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
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-coral flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
          </Link>
          <p className="text-[11px] text-muted-foreground mt-1.5 ml-[42px]">Brand Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className={`h-5 min-w-[20px] rounded-full text-[11px] font-bold flex items-center justify-center px-1.5 ${
                    isActive ? "bg-white/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground text-[13px] h-9"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground text-[13px] h-9"
            onClick={() => signOut().then(() => navigate("/"))}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-6 py-3 flex items-center justify-end gap-3">
          <NotificationBell />
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BrandLayout;
