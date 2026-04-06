import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink, Link2, Play, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

const BrandPostedVideos = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: camps } = await supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id);
      setCampaigns(camps || []);

      const campIds = (camps || []).map((c: any) => c.id);
      if (campIds.length === 0) { setLoading(false); return; }

      const { data: subs } = await supabase
        .from("video_submissions")
        .select("*")
        .in("campaign_id", campIds)
        .eq("status", "accepted");

      const acceptedSubs = subs || [];
      if (acceptedSubs.length === 0) { setLoading(false); return; }

      const subIds = acceptedSubs.map((s: any) => s.id);
      const { data: links } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);

      const linkMap: Record<string, any[]> = {};
      (links || []).forEach((l: any) => {
        if (!linkMap[l.submission_id]) linkMap[l.submission_id] = [];
        linkMap[l.submission_id].push(l);
      });

      const enriched = acceptedSubs
        .filter((s: any) => linkMap[s.id]?.length > 0)
        .map((s: any) => ({ ...s, _links: linkMap[s.id] || [] }));

      setData(enriched);

      const creatorIds = [...new Set(enriched.map((s: any) => s.creator_user_id))] as string[];
      if (creatorIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }

      // Auto-open campaigns with data
      const campIdsWithData = new Set(enriched.map((s: any) => s.campaign_id));
      setOpenCampaigns(campIdsWithData as Set<string>);

      setLoading(false);
    };
    load();
  }, [user]);

  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title || "Campaign";

  const toggleCampaign = (id: string) => {
    setOpenCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Group by campaign → creator
  const grouped: Record<string, { title: string; creators: Record<string, { profile: any; subs: any[] }> }> = {};
  data.forEach((sub: any) => {
    const campId = sub.campaign_id;
    if (!grouped[campId]) grouped[campId] = { title: getCampaignTitle(campId), creators: {} };
    const uid = sub.creator_user_id;
    const prof = profiles[uid] || {};
    if (!grouped[campId].creators[uid]) grouped[campId].creators[uid] = { profile: prof, subs: [] };
    grouped[campId].creators[uid].subs.push(sub);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Posted Videos</h1>
        <p className="text-muted-foreground text-sm mt-0.5">View posted video links by campaign and creator</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No posted video links yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([campId, campData]) => {
            const isOpen = openCampaigns.has(campId);
            const totalLinks = Object.values(campData.creators).flatMap(c => c.subs).reduce((sum, s) => sum + s._links.length, 0);
            return (
              <Card key={campId} className="border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleCampaign(campId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="font-heading font-bold text-foreground">{campData.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(campData.creators).length} creator{Object.keys(campData.creators).length !== 1 ? "s" : ""} · {totalLinks} link{totalLinks !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border/50">
                    {Object.entries(campData.creators).map(([uid, { profile: prof, subs: creatorSubs }]) => {
                      const name = prof.display_name || prof.username || "Creator";
                      return (
                        <div key={uid} className="border-b border-border/30 last:border-b-0">
                          <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={prof.avatar_url || undefined} />
                              <AvatarFallback className="bg-secondary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm text-foreground">{name}</p>
                          </div>
                          <div className="divide-y divide-border/20">
                            {creatorSubs.map((sub: any) => (
                              <div key={sub.id} className="px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="text-sm font-medium text-foreground">{sub.title}</p>
                                  {sub.video_url && (
                                    <button
                                      onClick={() => setPlayingVideo({ url: sub.video_url, title: sub.title })}
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Play className="h-3 w-3" /> Watch
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  {sub._links.map((l: any) => (
                                    <div key={l.id} className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">{l.platform}</Badge>
                                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex items-center gap-1">
                                        {l.url} <ExternalLink className="h-3 w-3 shrink-0" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default BrandPostedVideos;
