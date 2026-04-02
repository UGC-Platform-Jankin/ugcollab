import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreatorOnboarding from "@/components/onboarding/CreatorOnboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, User, LogOut, MessageCircle, Shield, Video, Link2, LayoutDashboard, Sun, Moon, Sparkles } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const unread = useUnreadMessages();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", count: 0 },
    { label: "Gigs", icon: Briefcase, path: "/dashboard/gigs", count: 0 },
    { label: "Videos", icon: Video, path: "/dashboard/videos", count: 0 },
    { label: "Posted Videos", icon: Link2, path: "/dashboard/posted-videos", count: 0 },
    { label: "Messages", icon: MessageCircle, path: "/dashboard/messages", count: unread.total },
    { label: "Profile", icon: User, path: "/dashboard/profile", count: 0 },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles" as any).select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      if (data && (data as any[]).length > 0) setIsAdmin(true);
    });
    supabase.from("profiles").select("display_name, username, avatar_url, bio, content_types").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        const hasProfile = data.display_name && data.bio && (data as any).content_types?.length > 0;
        if (!hasProfile) {
          // Also check if they have at least one social
          supabase.from("social_connections").select("id").eq("user_id", user.id).limit(1).then(({ data: socials }) => {
            setNeedsOnboarding(!hasProfile || !socials?.length);
            setOnboardingChecked(true);
          });
        } else {
          supabase.from("social_connections").select("id").eq("user_id", user.id).limit(1).then(({ data: socials }) => {
            setNeedsOnboarding(!socials?.length);
            setOnboardingChecked(true);
          });
        }
      } else {
        setNeedsOnboarding(true);
        setOnboardingChecked(true);
      }
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

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    // Refresh profile
    supabase.from("profiles").select("display_name, username, avatar_url, bio, content_types").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data);
    });
  };

  return (
    <SidebarProvider>
      {onboardingChecked && needsOnboarding && <CreatorOnboarding onComplete={handleOnboardingComplete} />}
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r-0">
          <SidebarHeader className="p-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-gradient-coral flex items-center justify-center shadow-coral">
                  <span className="text-base font-extrabold text-white">U</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <span className="text-lg font-heading font-bold text-sidebar-foreground">UGC Zone</span>
                <p className="text-xs text-sidebar-foreground/50">Creator Hub</p>
              </div>
            </Link>
          </SidebarHeader>

          {/* User profile card */}
          <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 rounded-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="rounded-lg bg-gradient-coral text-white font-bold text-sm">
                  {(profile?.display_name || profile?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-sidebar-foreground truncate">
                  {profile?.display_name || profile?.username || "Creator"}
                </p>
                <p className="text-[11px] text-sidebar-foreground/50">Creator Account</p>
              </div>
            </div>
          </div>

          <SidebarContent className="px-3 py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.path}
                            end={item.path === "/dashboard"}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-coral font-semibold"
                                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-[13px] truncate">{item.label}</span>
                            {item.count > 0 && (
                              <Badge className={cn(
                                "h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary text-primary-foreground"
                              )}>
                                {item.count > 99 ? "99+" : item.count}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  {isAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/admin"
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                            location.pathname === "/dashboard/admin"
                              ? "bg-primary text-primary-foreground shadow-coral font-semibold"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <Shield className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-[13px]">Admin</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[13px] h-9 rounded-lg"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[13px] h-9 rounded-lg"
              onClick={() => signOut().then(() => navigate("/"))}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 md:px-6 gap-3 sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-coral flex items-center justify-center shadow-coral">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="font-heading font-bold text-base md:text-lg text-foreground truncate">
                {navItems.find((n) => location.pathname === n.path)?.label || (location.pathname === "/dashboard/admin" ? "Admin" : "Dashboard")}
              </h1>
            </div>
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>
          <div className="flex-1 p-3 md:p-6 overflow-auto bg-mesh">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
