import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink, Link2, Play } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Props {
  campaignId: string;
}

const BrandPostedVideos = ({ campaignId }: Props) => {
  const [data, setData] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: subs } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "accepted");

      const accepted = subs || [];
      if (accepted.length === 0) { setLoading(false); return; }

      const subIds = accepted.map((s: any) => s.id);
      const { data: links } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);

      const linkMap: Record<string, any[]> = {};
      (links || []).forEach((l: any) => {
        if (!linkMap[l.submission_id]) linkMap[l.submission_id] = [];
        linkMap[l.submission_id].push(l);
      });

      const enriched = accepted.filter((s: any) => linkMap[s.id]?.length > 0).map((s: any) => ({ ...s, _links: linkMap[s.id] || [] }));
      setData(enriched);

      const creatorIds = [...new Set(enriched.map((s: any) => s.creator_user_id))] as string[];
      if (creatorIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [campaignId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  if (data.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="py-12 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No posted video links yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by creator
  const byCreator: Record<string, { profile: any; subs: any[] }> = {};
  data.forEach((sub: any) => {
    const uid = sub.creator_user_id;
    if (!byCreator[uid]) byCreator[uid] = { profile: profiles[uid] || {}, subs: [] };
    byCreator[uid].subs.push(sub);
  });

  return (
    <div className="space-y-4">
      {Object.entries(byCreator).map(([uid, { profile: prof, subs }]) => (
        <Card key={uid} className="border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20 border-b border-border/30">
            <Avatar className="h-8 w-8">
              <AvatarImage src={prof.avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-xs">{(prof.display_name || prof.username || "C").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm text-foreground">{prof.display_name || prof.username || "Creator"}</p>
          </div>
          <div className="divide-y divide-border/20">
            {subs.map((sub: any) => (
              <div key={sub.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground">{sub.title}</p>
                  <button onClick={() => setPlayingVideo({ url: sub.video_url, title: sub.title })} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Play className="h-3 w-3" /> Watch
                  </button>
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
        </Card>
      ))}
      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default BrandPostedVideos;
