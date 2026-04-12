import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CreatorOnboarding from "@/components/onboarding/CreatorOnboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, User, LogOut, Shield, LayoutDashboard, Sun, Moon, Sparkles, ChevronDown, ChevronRight, Video, Link2, Calendar, Building2, BookOpen, MessageCircle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accountType, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [expandedGigs, setExpandedGigs] = useState<Set<string>>(new Set());
  const [gigNotifs, setGigNotifs] = useState(0); // unread gig-related notifs
  const [activeGigNotifs, setActiveGigNotifs] = useState<Record<string, number>>({}); // per-gig notifs
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", count: 0 },
    { label: "Gigs", icon: Briefcase, path: "/dashboard/gigs", count: gigNotifs },
    { label: "Profile", icon: User, path: "/dashboard/profile", count: 0 },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && user && accountType !== null) {
      if (accountType === "brand") {
        navigate("/brand/dashboard");
      }
      // If accountType === null, wait — auth state is still resolving
    }
  }, [user, loading, accountType, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").then(({ data }) => {
      if (data && (data as any[]).length > 0) setIsAdmin(true);
    });
    supabase.from("profiles").select("display_name, username, avatar_url, bio, content_types").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setProfile(data);
        const hasProfile = data.display_name && data.bio && (data as any).content_types?.length > 0;
        supabase.from("social_connections").select("id").eq("user_id", user.id).limit(1).then(({ data: socials }) => {
          setNeedsOnboarding(!hasProfile || !socials?.length);
          setOnboardingChecked(true);
        });
      } else {
        setNeedsOnboarding(true);
        setOnboardingChecked(true);
      }
    });

    // Load active gigs for sidebar (with brand logos)
    supabase.from("campaign_applications").select("campaign_id").eq("creator_user_id", user.id).eq("status", "accepted").then(async ({ data: apps }) => {
      if (!apps?.length) return;
      const campIds = apps.map((a: any) => a.campaign_id);
      const { data: camps } = await supabase.from("campaigns").select("id, title, brand_user_id, group_chat_enabled").in("id", campIds);
      if (!camps?.length) return;
      const brandIds = [...new Set(camps.map((c: any) => c.brand_user_id))];
      const { data: brands } = await supabase.from("brand_profiles").select("user_id, logo_url, business_name").in("user_id", brandIds);
      const brandMap: Record<string, any> = {};
      (brands || []).forEach((b: any) => { brandMap[b.user_id] = b; });
      setActiveGigs(camps.map((c: any) => ({ ...c, _brand: brandMap[c.brand_user_id] || null })));
      const match = location.pathname.match(/\/dashboard\/gig\/([^/]+)/);
      if (match) setExpandedGigs(new Set([match[1]]));
    });

    // Load unread notifications for badge counts
    supabase.from("notifications").select("id, type, link, read").eq("user_id", user.id).eq("read", false).then(({ data: notifs }) => {
      if (!notifs) return;
      // Gigs tab: application-related notifs
      const gigTypes = ["application_accepted", "application_rejected", "invite"];
      setGigNotifs(notifs.filter((n: any) => gigTypes.includes(n.type)).length);
      // Per-gig notifs: video accepted/rejected
      const perGig: Record<string, number> = {};
      notifs.forEach((n: any) => {
        if (["video_accepted", "video_rejected"].includes(n.type) && n.link) {
          // link format: /dashboard/gig/CAMPAIGN_ID or /dashboard/videos
          const m = n.link.match(/\/dashboard\/gig\/([^/]+)/);
          if (m) perGig[m[1]] = (perGig[m[1]] || 0) + 1;
        }
      });
      setActiveGigNotifs(perGig);
    });
  }, [user]);

  const toggleGig = (id: string) => {
    setExpandedGigs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" /></div>;
  if (!user) return null;

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    supabase.from("profiles").select("display_name, username, avatar_url, bio, content_types").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data);
    });
  };

  const gigSubItems = [
    { label: "Videos", icon: Video, suffix: "" },
    { label: "Posted", icon: Link2, suffix: "/posted" },
    { label: "Schedule", icon: Calendar, suffix: "/schedule" },
    { label: "Resources", icon: BookOpen, suffix: "/resources" },
    { label: "Chat", icon: MessageCircle, suffix: "/messages" },
    { label: "Private", icon: MessageCircle, suffix: "/private" },
  ];

  // Find the current nav icon for header
  const currentNavItem = (() => {
    const gigMatch = location.pathname.match(/\/dashboard\/gig\/([^/]+)/);
    if (gigMatch) return null; // gig pages use brand logo
    if (location.pathname === "/dashboard/admin") return { icon: Shield, label: "Admin" };
    return navItems.find(n => location.pathname === n.path) || navItems[0];
  })();

  const headerTitle = (() => {
    const gigMatch = location.pathname.match(/\/dashboard\/gig\/([^/]+)/);
    if (gigMatch) {
      const gig = activeGigs.find(g => g.id === gigMatch[1]);
      return gig?.title || "Gig";
    }
    return currentNavItem?.label || "Dashboard";
  })();

  const headerGig = (() => {
    const gigMatch = location.pathname.match(/\/dashboard\/gig\/([^/]+)/);
    if (gigMatch) return activeGigs.find(g => g.id === gigMatch[1]);
    return null;
  })();

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
                <span className="text-lg font-heading font-bold text-sidebar-foreground">UGCollab</span>
                <p className="text-xs text-sidebar-foreground/50">Creator Hub</p>
              </div>
            </Link>
          </SidebarHeader>

          <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 rounded-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="rounded-lg bg-gradient-coral text-white font-bold text-sm">
                  {(profile?.display_name || profile?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-sidebar-foreground truncate">{profile?.display_name || profile?.username || "Creator"}</p>
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
                              isActive ? "bg-primary text-primary-foreground shadow-coral font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-[13px] truncate">{item.label}</span>
                            {item.count > 0 && (
                              <Badge className={cn("h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")}>
                                {item.count > 99 ? "99+" : item.count}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Active Gigs - expandable */}
                  {activeGigs.length > 0 && (
                    <>
                      <div className="pt-3 pb-1 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">Active Gigs</p>
                      </div>
                      {activeGigs.map(gig => {
                        const isExpanded = expandedGigs.has(gig.id);
                        const isGigActive = location.pathname.startsWith(`/dashboard/gig/${gig.id}`);
                        const gigCount = activeGigNotifs[gig.id] || 0;
                        return (
                          <div key={gig.id}>
                            <SidebarMenuItem>
                              <button
                                onClick={() => toggleGig(gig.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-left",
                                  isGigActive ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                )}
                              >
                                {gig._brand?.logo_url ? (
                                  <Avatar className="w-5 h-5 shrink-0 rounded">
                                    <AvatarImage src={gig._brand.logo_url} />
                                    <AvatarFallback className="rounded bg-primary/10 text-[9px] font-bold">{(gig._brand.business_name || "B").charAt(0)}</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <Building2 className="w-4 h-4 shrink-0" />
                                )}
                                <span className="flex-1 text-[13px] truncate">{gig.title}</span>
                                {gigCount > 0 && (
                                  <Badge className="h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0 bg-primary text-primary-foreground">
                                    {gigCount}
                                  </Badge>
                                )}
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            </SidebarMenuItem>
                            {isExpanded && (
                              <div className="ml-4 space-y-0.5">
                                {gigSubItems
                                  .filter(sub => sub.label !== "Chat" || gig.group_chat_enabled !== false)
                                  .map(sub => {
                                  const subPath = `/dashboard/gig/${gig.id}${sub.suffix}`;
                                  const isSubActive = location.pathname === subPath;
                                  return (
                                    <SidebarMenuItem key={sub.suffix}>
                                      <SidebarMenuButton asChild>
                                        <NavLink
                                          to={subPath}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-[12px]",
                                            isSubActive ? "bg-primary text-primary-foreground font-semibold" : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                          )}
                                        >
                                          <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                          <span>{sub.label}</span>
                                        </NavLink>
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {isAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to="/dashboard/admin"
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                            location.pathname === "/dashboard/admin" ? "bg-primary text-primary-foreground shadow-coral font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[13px] h-9 rounded-lg" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent text-[13px] h-9 rounded-lg" onClick={() => signOut().then(() => navigate("/"))}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 md:px-6 gap-3 sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex items-center gap-2.5">
              {headerGig ? (
                headerGig._brand?.logo_url ? (
                  <Avatar className="w-7 h-7 rounded-lg">
                    <AvatarImage src={headerGig._brand.logo_url} className="rounded-lg" />
                    <AvatarFallback className="rounded-lg bg-secondary text-xs font-bold">{(headerGig._brand.business_name || "B").charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )
              ) : currentNavItem ? (
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                  <currentNavItem.icon className="w-3.5 h-3.5 text-foreground" />
                </div>
              ) : null}
              <h1 className="font-heading font-bold text-base md:text-lg text-foreground truncate">{headerTitle}</h1>
            </div>
            <div className="ml-auto"><NotificationBell /></div>
          </header>
          <div className="flex-1 p-3 md:p-6 overflow-auto bg-mesh">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
