import { useAuth } from "@/contexts/AuthContext";
import BrandOnboarding from "@/components/onboarding/BrandOnboarding";
import { useNavigate, Link, useLocation, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, LogOut, Users, Megaphone, BarChart3, User, MessageCircle, Sun, Moon, Sparkles, ChevronDown, ChevronRight, Video, Link2, Calendar, Settings, DollarSign, Send, Search } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

const BrandLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, accountType, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [perCampaignNotifs, setPerCampaignNotifs] = useState<Record<string, number>>({});
  const [perCampaignAppNotifs, setPerCampaignAppNotifs] = useState<Record<string, number>>({});
  const [perCampaignVideoNotifs, setPerCampaignVideoNotifs] = useState<Record<string, number>>({});
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: "Overview", icon: BarChart3, path: "/brand/dashboard", count: 0 },
    { label: "Campaigns", icon: Megaphone, path: "/brand/campaigns", count: 0 },
    { label: "Find Creators", icon: Search, path: "/brand/creators", count: 0, subItems: [
      { label: "Browse", icon: Users, path: "/brand/creators" },
      { label: "Invites", icon: Send, path: "/brand/creators/invites", count: pendingInviteCount },
    ]},
    { label: "Profile", icon: User, path: "/brand/profile", count: 0 },
  ];

  useEffect(() => {
    if (!loading && !user) navigate("/brand/auth");
    else if (!loading && user && accountType !== "brand") {
      navigate("/auth");
    }
  }, [user, loading, accountType, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("brand_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
        if (!data) { setNeedsOnboarding(true); } else { setBrandProfile(data); }
        setOnboardingChecked(true);
      });

      supabase.from("campaigns").select("id, title, status, group_chat_enabled").eq("brand_user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
        setCampaigns(data || []);
        const match = location.pathname.match(/\/brand\/campaigns\/([^/]+)/);
        if (match && match[1] !== "new") setExpandedCampaigns(new Set([match[1]]));
      });

      // Load unread notifications for badge counts — split by type per campaign
      supabase.from("notifications").select("id, type, link, read").eq("user_id", user.id).eq("read", false).then(({ data: notifs }) => {
        if (!notifs) return;
        const campTypes = ["application", "video_submission", "video_resubmission", "video_accepted", "video_rejected"];
        const appTypes = ["application"];
        const videoTypes = ["video_submission", "video_resubmission", "video_accepted", "video_rejected"];
        const perCampApp: Record<string, number> = {};
        const perCampVideo: Record<string, number> = {};
        notifs.forEach((n: any) => {
          if (!campTypes.includes(n.type)) return;
          if (n.link) {
            const m = n.link.match(/\/brand\/campaigns\/([^/]+)/);
            if (m) {
              if (appTypes.includes(n.type)) perCampApp[m[1]] = (perCampApp[m[1]] || 0) + 1;
              if (videoTypes.includes(n.type)) perCampVideo[m[1]] = (perCampVideo[m[1]] || 0) + 1;
            }
          }
        });
        setPerCampaignNotifs(prev => {
          const next: Record<string, number> = {};
          Object.keys(prev).forEach(id => {
            next[id] = (perCampApp[id] || 0) + (perCampVideo[id] || 0);
          });
          return next;
        });
        // Store split counts for sub-items
        setPerCampaignAppNotifs(perCampApp);
        setPerCampaignVideoNotifs(perCampVideo);
      });

      // Load pending invite count for the Invites nav badge
      supabase.from("campaign_invites").select("id", { count: "exact" }).eq("brand_user_id", user.id).eq("status", "pending").then(({ count }) => {
        setPendingInviteCount(count || 0);
      });
    }
  }, [user]);

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading || !onboardingChecked) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" /></div>;

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
    if (user) supabase.from("brand_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => { if (data) setBrandProfile(data); });
  };

  const campaignSubItems = [
    { label: "Applications", icon: Users, suffix: "/applications", notifType: "app" as const },
    { label: "Videos", icon: Video, suffix: "", notifType: "video" as const },
    { label: "Posted", icon: Link2, suffix: "/posted", notifType: null },
    { label: "Schedule", icon: Calendar, suffix: "/schedule", notifType: null },
    { label: "Chat", icon: MessageCircle, suffix: "/messages", notifType: null },
    { label: "Private", icon: MessageCircle, suffix: "/private", notifType: null },
    { label: "Pricing", icon: DollarSign, suffix: "/pricing", notifType: null },
    { label: "Settings", icon: Settings, suffix: "/settings", notifType: null },
  ];

  // Find the current nav icon for header
  const currentNavItem = (() => {
    const campMatch = location.pathname.match(/\/brand\/campaigns\/([^/]+)/);
    if (campMatch) return null;
    // Check sub-items first
    for (const item of navItems) {
      if (item.subItems) {
        const sub = item.subItems.find((s: any) => location.pathname === s.path);
        if (sub) return { icon: sub.icon, label: sub.label, isSub: true };
      }
    }
    return navItems.find(n => location.pathname === n.path) || navItems[0];
  })();

  const headerTitle = (() => {
    const campMatch = location.pathname.match(/\/brand\/campaigns\/([^/]+)/);
    if (campMatch && campMatch[1] !== "new") {
      const camp = campaigns.find(c => c.id === campMatch[1]);
      return camp?.title || "Campaign";
    }
    if (location.pathname === "/brand/campaigns/new") return "New Campaign";
    return currentNavItem && !("isSub" in currentNavItem) ? currentNavItem.label : (currentNavItem as any)?.label || "Brand Portal";
  })();

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const endedCampaigns = campaigns.filter(c => c.status === "ended");

  return (
    <SidebarProvider>
      {needsOnboarding && <BrandOnboarding onComplete={handleOnboardingComplete} />}
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r-0">
          <SidebarHeader className="p-5 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-gradient-coral flex items-center justify-center shadow-coral">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              </div>
              <div>
                <span className="text-lg font-heading font-bold text-sidebar-foreground">UGCollab</span>
                <p className="text-xs text-sidebar-foreground/50">Brand Portal</p>
              </div>
            </Link>
          </SidebarHeader>

          <div className="px-4 py-3 mx-3 mt-4 rounded-xl bg-sidebar-accent border border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 rounded-lg">
                <AvatarImage src={brandProfile?.logo_url || undefined} />
                <AvatarFallback className="rounded-lg bg-gradient-coral text-white font-bold text-sm">
                  {(brandProfile?.business_name || "B").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-sidebar-foreground truncate">{brandProfile?.business_name || "Brand"}</p>
                <p className="text-[11px] text-sidebar-foreground/50">Brand Account</p>
              </div>
            </div>
          </div>

          <SidebarContent className="px-3 py-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    // If item has subItems, render as expandable header + sub-items
                    if (item.subItems) {
                      const hasActiveSub = item.subItems.some((sub: any) => location.pathname === sub.path);
                      const isItemActive = location.pathname.startsWith(item.path);
                      return (
                        <div key={item.label}>
                          <div className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer",
                            isItemActive ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}>
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 text-[13px] truncate">{item.label}</span>
                            {item.count > 0 && (
                              <Badge className="h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0 bg-primary text-primary-foreground">
                                {item.count > 99 ? "99+" : item.count}
                              </Badge>
                            )}
                          </div>
                          <div className="ml-4 space-y-0.5">
                            {item.subItems.map((sub: any) => {
                              const isSubActive = location.pathname === sub.path;
                              return (
                                <SidebarMenuItem key={sub.path}>
                                  <SidebarMenuButton asChild>
                                    <NavLink
                                      to={sub.path}
                                      className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 text-[12px]",
                                        isSubActive ? "bg-primary text-primary-foreground font-semibold" : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                      )}
                                    >
                                      <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="flex-1">{sub.label}</span>
                                      {sub.count > 0 && (
                                        <Badge className={cn("h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0", isSubActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")}>
                                          {sub.count > 99 ? "99+" : sub.count}
                                        </Badge>
                                      )}
                                    </NavLink>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.path}
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

                  {/* Active Campaigns - expandable */}
                  {activeCampaigns.length > 0 && (
                    <>
                      <div className="pt-3 pb-1 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">Active Campaigns</p>
                      </div>
                      {activeCampaigns.map(camp => {
                        const isExpanded = expandedCampaigns.has(camp.id);
                        const isCampActive = location.pathname.startsWith(`/brand/campaigns/${camp.id}`);
                        const campCount = perCampaignNotifs[camp.id] || 0;
                        return (
                          <div key={camp.id}>
                            <SidebarMenuItem>
                              <button
                                onClick={() => toggleCampaign(camp.id)}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-left",
                                  isCampActive ? "bg-primary/10 text-primary font-semibold" : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                )}
                              >
                                <Megaphone className="w-4 h-4 shrink-0" />
                                <span className="flex-1 text-[13px] truncate">{camp.title}</span>
                                {campCount > 0 && (
                                  <Badge className="h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0 bg-primary text-primary-foreground">
                                    {campCount}
                                  </Badge>
                                )}
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            </SidebarMenuItem>
                            {isExpanded && (
                              <div className="ml-4 space-y-0.5">
                                {campaignSubItems
                                  .filter(sub => sub.label !== "Chat" || (camp as any).group_chat_enabled !== false)
                                  .map(sub => {
                                  const subPath = `/brand/campaigns/${camp.id}${sub.suffix}`;
                                  const isSubActive = location.pathname === subPath;
                                  const notifCount = sub.notifType === "app" ? (perCampaignAppNotifs[camp.id] || 0)
                                    : sub.notifType === "video" ? (perCampaignVideoNotifs[camp.id] || 0)
                                    : 0;
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
                                          {notifCount > 0 && (
                                            <Badge className={cn("h-5 min-w-[20px] px-1.5 text-[11px] font-bold border-0", isSubActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground")}>
                                              {notifCount}
                                            </Badge>
                                          )}
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
              {currentNavItem ? (
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                  <currentNavItem.icon className="w-3.5 h-3.5 text-foreground" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                  <Megaphone className="w-3.5 h-3.5 text-foreground" />
                </div>
              )}
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

export default BrandLayout;
