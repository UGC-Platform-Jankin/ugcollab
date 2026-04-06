import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink, Link2, Play, ArrowLeft } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Props {
  campaignId: string;
}

const BrandPostedVideos = ({ campaignId }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [allCreators, setAllCreators] = useState<{ userId: string; profile: any }[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [scheduleEvents, setScheduleEvents] = useState<any[]>([]);
  const [expectedVideoCount, setExpectedVideoCount] = useState(1);

  useEffect(() => {
    const load = async () => {
      // Load campaign + all accepted creators + submissions + events
      const [{ data: campData }, { data: apps }, { data: subs }, { data: events }] = await Promise.all([
        supabase.from("campaigns").select("platforms, expected_video_count").eq("id", campaignId).single(),
        supabase.from("campaign_applications").select("creator_user_id").eq("campaign_id", campaignId).eq("status", "accepted"),
        supabase.from("video_submissions").select("*").eq("campaign_id", campaignId).eq("status", "accepted"),
        supabase.from("posting_schedule").select("*").eq("campaign_id", campaignId).order("event_date"),
      ]);

      setCampaign(campData);
      setExpectedVideoCount(campData?.expected_video_count || 1);
      setScheduleEvents(events || []);

      const creatorIds = [...new Set((apps || []).map((a: any) => a.creator_user_id))] as string[];
      const accepted = subs || [];

      // Get posted links for accepted submissions
      const subIds = accepted.map((s: any) => s.id);
      let allLinks: any[] = [];
      if (subIds.length > 0) {
        const { data: links } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);
        allLinks = links || [];
      }

      const linkMap: Record<string, any[]> = {};
      allLinks.forEach((l: any) => {
        if (!linkMap[l.submission_id]) linkMap[l.submission_id] = [];
        linkMap[l.submission_id].push(l);
      });

      const enriched = accepted.map((s: any) => ({ ...s, _links: linkMap[s.id] || [] }));
      setData(enriched);

      // Also include creator IDs from submissions
      const subCreatorIds = [...new Set(accepted.map((s: any) => s.creator_user_id))] as string[];
      const allIds = [...new Set([...creatorIds, ...subCreatorIds])] as string[];

      if (allIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", allIds);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setAllCreators(allIds.map(uid => ({ userId: uid, profile: map[uid] || {} })));
      } else {
        setAllCreators([]);
      }
      setLoading(false);
    };
    load();
  }, [campaignId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  // Group enriched data by creator
  const byCreator: Record<string, any[]> = {};
  data.forEach((sub: any) => {
    if (!byCreator[sub.creator_user_id]) byCreator[sub.creator_user_id] = [];
    byCreator[sub.creator_user_id].push(sub);
  });

  const platforms = (campaign?.platforms || []) as string[];

  // Selected creator detail
  if (selectedCreator) {
    const creator = allCreators.find(c => c.userId === selectedCreator);
    if (!creator) { setSelectedCreator(null); return null; }
    const prof = creator.profile;
    const subs = byCreator[selectedCreator] || [];

    const allLinksList = subs.flatMap((s: any) => s._links.map((l: any) => ({ ...l, _sub: s })));
    const byPlatform: Record<string, any[]> = {};
    allLinksList.forEach((l: any) => {
      if (!byPlatform[l.platform]) byPlatform[l.platform] = [];
      byPlatform[l.platform].push(l);
    });

    const getEventLabel = (eventId: string | null) => {
      if (!eventId) return null;
      const ev = scheduleEvents.find(e => e.id === eventId);
      return ev ? `${new Date(ev.event_date).toLocaleDateString()} — ${ev.description}` : null;
    };

    const acceptedVideos = subs.length;
    const videosLeft = Math.max(0, expectedVideoCount - acceptedVideos);

    return (
      <div>
        <button onClick={() => setSelectedCreator(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to all creators
        </button>

        <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-secondary/30 border border-border/50">
          <Avatar className="h-12 w-12">
            <AvatarImage src={prof.avatar_url || undefined} />
            <AvatarFallback className="bg-secondary">{(prof.display_name || "C").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{prof.display_name || prof.username || "Creator"}</p>
            <p className="text-xs text-muted-foreground">{allLinksList.length} link{allLinksList.length !== 1 ? "s" : ""} posted · {videosLeft} video{videosLeft !== 1 ? "s" : ""} left</p>
          </div>
        </div>

        {allLinksList.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-8 text-center">
              <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No posted links yet</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(byPlatform).map(([platform, pLinks]) => (
            <div key={platform} className="mb-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Badge variant="secondary">{platform}</Badge>
                <span className="text-xs font-normal">({pLinks.length})</span>
              </h3>
              <div className="space-y-2">
                {pLinks.map((l: any) => {
                  const eventLabel = getEventLabel(l.schedule_event_id);
                  return (
                    <Card key={l.id} className="border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{l._sub.title}</p>
                            {eventLabel && <p className="text-[11px] text-muted-foreground mt-0.5">📅 {eventLabel}</p>}
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1 mt-1">
                              {l.url} <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          </div>
                          <button onClick={() => setPlayingVideo({ url: l._sub.video_url, title: l._sub.title })} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                            <Play className="h-3 w-3" /> Watch
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
      </div>
    );
  }

  // Creator grid view — show ALL creators
  return (
    <div>
      {allCreators.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No creators in this campaign yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allCreators.map(({ userId, profile: prof }) => {
            const subs = byCreator[userId] || [];
            const linkCount = subs.reduce((sum, s) => sum + (s._links?.length || 0), 0);
            const newLinks = subs.reduce((sum, s) => {
              // Count links posted in the last 3 days as "new"
              return sum + (s._links || []).filter((l: any) => {
                const d = new Date(l.created_at);
                return (Date.now() - d.getTime()) < 3 * 24 * 60 * 60 * 1000;
              }).length;
            }, 0);
            const acceptedVideos = subs.length;
            const videosLeft = Math.max(0, expectedVideoCount - acceptedVideos);

            return (
              <Card
                key={userId}
                className="border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCreator(userId)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={prof.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-lg">{(prof.display_name || prof.username || "C").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {newLinks > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                        {newLinks}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-foreground truncate max-w-full">{prof.display_name || prof.username || "Creator"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{linkCount} link{linkCount !== 1 ? "s" : ""} posted</p>
                  <p className="text-[10px] text-muted-foreground">{videosLeft} video{videosLeft !== 1 ? "s" : ""} left</p>
                </CardContent>
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
