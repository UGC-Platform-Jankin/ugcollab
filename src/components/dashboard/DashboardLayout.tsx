import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, User, LogOut, MessageCircle, Shield, Video, Link2 } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const unread = useUnreadMessages();

  const navItems = [
    { label: "Gigs", icon: Briefcase, path: "/dashboard", badge: 0 },
    { label: "Videos", icon: Video, path: "/dashboard/videos", badge: 0 },
    { label: "Posted Videos", icon: Link2, path: "/dashboard/posted-videos", badge: 0 },
    { label: "Messages", icon: MessageCircle, path: "/dashboard/messages", badge: unread.total },
    { label: "Profile", icon: User, path: "/dashboard/profile", badge: 0 },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles" as any).select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      if (data && (data as any[]).length > 0) setIsAdmin(true);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
          {isAdmin && (
            <Link
              to="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/dashboard/admin"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-border/50">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => signOut().then(() => navigate("/"))}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
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

export default DashboardLayout;
