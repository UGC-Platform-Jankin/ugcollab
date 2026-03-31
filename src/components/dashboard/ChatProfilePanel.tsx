import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, Instagram, Facebook, Video, Globe, MapPin, Building2, User, Loader2 } from "lucide-react";

const platformIcons: Record<string, any> = { instagram: Instagram, facebook: Facebook, tiktok: Video };
const platformColors: Record<string, string> = { instagram: "text-pink-400", facebook: "text-blue-400", tiktok: "text-cyan-400" };

interface ChatProfilePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomType: "private" | "group";
  roomId: string;
  currentUserId: string;
  campaignId: string | null;
}

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  socials: { platform: string; profile_url: string | null; followers_count: number | null; average_views: number | null }[];
  brandProfile: { business_name: string; business_type: string; description: string | null; logo_url: string | null; country: string | null; website_url: string | null; instagram_url: string | null; facebook_url: string | null; tiktok_url: string | null } | null;
}

const formatCount = (n: number | null) => {
  if (!n) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const ChatProfilePanel = ({ open, onOpenChange, roomType, roomId, currentUserId, campaignId }: ChatProfilePanelProps) => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [campaignTitle, setCampaignTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedMember(null);
    setLoading(true);

    const fetchMembers = async () => {
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("chat_room_id", roomId);

      if (!parts) { setLoading(false); return; }

      const userIds = parts.map((p: any) => p.user_id);

      const [{ data: profiles }, { data: socials }, { data: brands }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url, bio").in("user_id", userIds),
        supabase.from("social_connections").select("user_id, platform, profile_url, followers_count, average_views").in("user_id", userIds),
        supabase.from("brand_profiles").select("user_id, business_name, business_type, description, logo_url, country, website_url, instagram_url, facebook_url, tiktok_url").in("user_id", userIds),
      ]);

      if (campaignId) {
        const { data: campaign } = await supabase.from("campaigns").select("title").eq("id", campaignId).maybeSingle();
        setCampaignTitle(campaign?.title || null);
      }

      const memberList: MemberProfile[] = userIds.map((uid: string) => {
        const profile = profiles?.find((p: any) => p.user_id === uid);
        const userSocials = socials?.filter((s: any) => s.user_id === uid) || [];
        const brand = brands?.find((b: any) => b.user_id === uid) || null;
        return {
          user_id: uid,
          display_name: profile?.display_name || null,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          bio: profile?.bio || null,
          socials: userSocials,
          brandProfile: brand ? {
            business_name: brand.business_name,
            business_type: brand.business_type,
            description: brand.description,
            logo_url: brand.logo_url,
            country: brand.country,
            website_url: brand.website_url,
            instagram_url: brand.instagram_url,
            facebook_url: brand.facebook_url,
            tiktok_url: brand.tiktok_url,
          } : null,
        };
      });

      setMembers(memberList);

      // For private chats, auto-select the other person's profile
      if (roomType === "private") {
        const other = memberList.find((m) => m.user_id !== currentUserId) || memberList[0];
        setSelectedMember(other);
      }

      setLoading(false);
    };

    fetchMembers();
  }, [open, roomId, roomType, currentUserId, campaignId]);

  const renderProfileDetail = (member: MemberProfile) => {
    const isBrand = !!member.brandProfile;
    const name = isBrand ? member.brandProfile!.business_name : (member.display_name || member.username || "User");
    const avatar = isBrand ? member.brandProfile!.logo_url : member.avatar_url;

    return (
      <div className="space-y-5">
        {/* Back button for group members */}
        {roomType === "group" && (
          <button onClick={() => setSelectedMember(null)} className="text-xs text-primary hover:underline">
            ← Back to members
          </button>
        )}

        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 ring-2 ring-border/30">
            <AvatarImage src={avatar || undefined} />
            <AvatarFallback className="bg-secondary text-xl font-semibold">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-lg font-heading font-semibold text-foreground mt-3">{name}</h3>
          {isBrand && member.display_name && (
            <p className="text-xs text-muted-foreground">@{member.username || member.display_name}</p>
          )}
          {!isBrand && member.username && member.username !== member.display_name && (
            <p className="text-xs text-muted-foreground">@{member.username}</p>
          )}
          {isBrand && (
            <Badge variant="secondary" className="mt-1.5 text-[10px]">
              <Building2 className="h-3 w-3 mr-1" />
              {member.brandProfile!.business_type}
            </Badge>
          )}
        </div>

        {/* Bio / Description */}
        {(isBrand ? member.brandProfile!.description : member.bio) && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">About</p>
              <p className="text-sm text-foreground leading-relaxed">
                {isBrand ? member.brandProfile!.description : member.bio}
              </p>
            </div>
          </>
        )}

        {/* Location (brand) */}
        {isBrand && member.brandProfile!.country && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {member.brandProfile!.country}
          </div>
        )}

        {/* Brand socials */}
        {isBrand && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Links</p>
              <div className="space-y-2">
                {member.brandProfile!.website_url && (
                  <a href={member.brandProfile!.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
                {member.brandProfile!.instagram_url && (
                  <a href={member.brandProfile!.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-pink-400 hover:underline">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                )}
                {member.brandProfile!.facebook_url && (
                  <a href={member.brandProfile!.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:underline">
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </a>
                )}
                {member.brandProfile!.tiktok_url && (
                  <a href={member.brandProfile!.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-cyan-400 hover:underline">
                    <Video className="h-3.5 w-3.5" /> TikTok
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {/* Creator socials */}
        {!isBrand && member.socials.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Platforms</p>
              <div className="space-y-3">
                {member.socials.map((s) => {
                  const Icon = platformIcons[s.platform] || User;
                  const color = platformColors[s.platform] || "text-foreground";
                  return (
                    <div key={s.platform} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <span className="text-sm capitalize font-medium text-foreground">{s.platform}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <span>{formatCount(s.followers_count)} followers</span>
                        {s.average_views != null && (
                          <span className="ml-2">· {formatCount(s.average_views)} avg views</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {member.socials.some((s) => s.profile_url) && (
                <div className="mt-3 space-y-1">
                  {member.socials.filter((s) => s.profile_url).map((s) => (
                    <a key={s.platform} href={s.profile_url!} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 text-xs ${platformColors[s.platform] || "text-primary"} hover:underline`}>
                      {(() => { const I = platformIcons[s.platform] || User; return <I className="h-3 w-3" />; })()}
                      View {s.platform} profile →
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 sm:w-96 bg-card border-border/50 p-0">
        <SheetHeader className="p-4 border-b border-border/30">
          <SheetTitle className="text-base font-heading">
            {roomType === "group" && !selectedMember ? "Group Members" : "Profile"}
          </SheetTitle>
          {campaignTitle && (
            <p className="text-xs text-muted-foreground">{campaignTitle}</p>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : selectedMember ? (
              renderProfileDetail(selectedMember)
            ) : roomType === "group" ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-3">{members.length} members</p>
                {members.map((member) => {
                  const isBrand = !!member.brandProfile;
                  const name = isBrand ? member.brandProfile!.business_name : (member.display_name || member.username || "User");
                  const avatar = isBrand ? member.brandProfile!.logo_url : member.avatar_url;
                  const isCurrentUser = member.user_id === currentUserId;
                  return (
                    <button
                      key={member.user_id}
                      onClick={() => setSelectedMember(member)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={avatar || undefined} />
                        <AvatarFallback className="bg-secondary text-sm">
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                          {name}
                          {isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
                        </p>
                        {isBrand ? (
                          <p className="text-xs text-muted-foreground truncate">{member.brandProfile!.business_type}</p>
                        ) : member.socials.length > 0 ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {member.socials.map((s) => {
                              const Icon = platformIcons[s.platform] || User;
                              return <Icon key={s.platform} className={`h-3 w-3 ${platformColors[s.platform] || "text-muted-foreground"}`} />;
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Creator</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No profile available</p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ChatProfilePanel;
