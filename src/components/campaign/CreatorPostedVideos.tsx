import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Plus, Trash2, Loader2, ExternalLink, Play } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook", "X (Twitter)", "Other"];

interface Props {
  campaignId: string;
  campaignTitle: string;
}

const CreatorPostedVideos = ({ campaignId, campaignTitle }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [acceptedSubs, setAcceptedSubs] = useState<any[]>([]);
  const [postedLinks, setPostedLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState("");
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([{ platform: "", url: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: subs } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("creator_user_id", user.id)
        .eq("campaign_id", campaignId)
        .eq("status", "accepted");

      const accepted = subs || [];
      setAcceptedSubs(accepted);

      if (accepted.length > 0) {
        const subIds = accepted.map((s: any) => s.id);
        const { data: pl } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);
        setPostedLinks(pl || []);
      }
      setLoading(false);
    };
    load();
  }, [user, campaignId]);

  const addLink = () => setLinks([...links, { platform: "", url: "" }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: string, val: string) => {
    const updated = [...links];
    (updated[i] as any)[field] = val;
    setLinks(updated);
  };

  const handleSubmitLinks = async () => {
    if (!selectedSub) { toast({ title: "Select a submission", variant: "destructive" }); return; }
    const validLinks = links.filter(l => l.platform && l.url.trim());
    if (validLinks.length === 0) { toast({ title: "Add at least one link", variant: "destructive" }); return; }
    setSubmitting(true);
    const rows = validLinks.map(l => ({ submission_id: selectedSub, platform: l.platform, url: l.url.trim() }));
    const { error } = await supabase.from("posted_video_links").insert(rows as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSubmitting(false); return; }

    const subIds = acceptedSubs.map((s: any) => s.id);
    const { data: pl } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);
    setPostedLinks(pl || []);
    setLinks([{ platform: "", url: "" }]); setSelectedSub("");
    toast({ title: "Posted video links saved!" });
    setSubmitting(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const linkMap: Record<string, any[]> = {};
  postedLinks.forEach((l: any) => { if (!linkMap[l.submission_id]) linkMap[l.submission_id] = []; linkMap[l.submission_id].push(l); });

  return (
    <div className="space-y-6">
      {acceptedSubs.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-lg">Submit Posted Video Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSub} onValueChange={setSelectedSub}>
              <SelectTrigger><SelectValue placeholder="Select accepted submission" /></SelectTrigger>
              <SelectContent>
                {acceptedSubs.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={link.platform} onValueChange={v => updateLink(i, "platform", v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="flex-1" placeholder="https://..." value={link.url} onChange={e => updateLink(i, "url", e.target.value)} />
                {links.length > 1 && <Button size="icon" variant="ghost" onClick={() => removeLink(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLink} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Platform</Button>
            <Button onClick={handleSubmitLinks} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Submit Links
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No accepted videos yet for this campaign.</p>
          </CardContent>
        </Card>
      )}

      {Object.keys(linkMap).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Posted Links</h3>
          <div className="space-y-3">
            {Object.entries(linkMap).map(([subId, subLinks]) => {
              const sub = acceptedSubs.find(s => s.id === subId);
              return (
                <Card key={subId} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-sm text-foreground">{sub?.title || "Video"}</p>
                      {sub?.video_url && (
                        <button onClick={() => setPlayingVideo({ url: sub.video_url, title: sub.title })} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Play className="h-3 w-3" /> Watch
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {subLinks.map((l: any) => (
                        <div key={l.id} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{l.platform}</Badge>
                          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex items-center gap-1">
                            {l.url} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default CreatorPostedVideos;
