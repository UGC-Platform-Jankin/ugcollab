import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, User, LogOut, MessageCircle, Shield, Video, Link2, LayoutDashboard, Sun, Moon } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTheme } from "@/contexts/ThemeContext";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const unread = useUnreadMessages();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, path: "/dashboard", badge: 0 },
    { label: "Gigs", icon: Briefcase, path: "/dashboard/gigs", badge: 0 },
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
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-coral flex items-center justify-center">
              <span className="text-sm font-bold text-white">U</span>
            </div>
            <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
          </Link>
          <p className="text-[11px] text-muted-foreground mt-1.5 ml-[42px]">Creator Hub</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
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
          {isAdmin && (
            <Link
              to="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                location.pathname === "/dashboard/admin"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </Link>
          )}
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

export default DashboardLayout;
