import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Plus, Trash2, Loader2, ExternalLink, Play, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

const PLATFORMS = ["TikTok", "Instagram", "YouTube", "Facebook", "X (Twitter)", "Other"];

const PostedVideos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [acceptedSubs, setAcceptedSubs] = useState<any[]>([]);
  const [postedLinks, setPostedLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState("");
  const [links, setLinks] = useState<{ platform: string; url: string }[]>([{ platform: "", url: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: subs } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("creator_user_id", user.id)
        .eq("status", "accepted");

      const accepted = subs || [];
      if (accepted.length > 0) {
        const campIds = [...new Set(accepted.map((s: any) => s.campaign_id))] as string[];
        const { data: camps } = await supabase.from("campaigns").select("id, title").in("id", campIds);
        const campMap: Record<string, string> = {};
        (camps || []).forEach((c: any) => { campMap[c.id] = c.title; });
        accepted.forEach((s: any) => { s._campaignTitle = campMap[s.campaign_id] || "Campaign"; });

        const subIds = accepted.map((s: any) => s.id);
        const { data: pl } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);
        setPostedLinks(pl || []);

        setOpenCampaigns(new Set(campIds));
      }
      setAcceptedSubs(accepted);
      setLoading(false);
    };
    load();
  }, [user]);

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
    if (validLinks.length === 0) { toast({ title: "Add at least one platform link", variant: "destructive" }); return; }
    setSubmitting(true);

    const rows = validLinks.map(l => ({ submission_id: selectedSub, platform: l.platform, url: l.url.trim() }));
    const { error } = await supabase.from("posted_video_links").insert(rows as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const subIds = acceptedSubs.map((s: any) => s.id);
    const { data: pl } = await supabase.from("posted_video_links").select("*").in("submission_id", subIds);
    setPostedLinks(pl || []);
    setLinks([{ platform: "", url: "" }]);
    setSelectedSub("");
    toast({ title: "Posted video links saved!" });
    setSubmitting(false);
  };

  const toggleCampaign = (id: string) => {
    setOpenCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Group by campaign
  const linkMap: Record<string, any[]> = {};
  postedLinks.forEach((l: any) => {
    if (!linkMap[l.submission_id]) linkMap[l.submission_id] = [];
    linkMap[l.submission_id].push(l);
  });

  const groupedByCampaign: Record<string, { title: string; subs: any[] }> = {};
  acceptedSubs.forEach((sub: any) => {
    if (!groupedByCampaign[sub.campaign_id]) {
      groupedByCampaign[sub.campaign_id] = { title: sub._campaignTitle, subs: [] };
    }
    groupedByCampaign[sub.campaign_id].subs.push({ ...sub, _links: linkMap[sub.id] || [] });
  });

  const subsWithLinks = acceptedSubs.filter(s => linkMap[s.id]?.length > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Posted Videos</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Submit links to your posted videos</p>
      </div>

      {acceptedSubs.length > 0 && (
        <Card className="border-border/50 mb-6">
          <CardHeader><CardTitle className="text-lg">Submit Posted Video Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedSub} onValueChange={setSelectedSub}>
              <SelectTrigger><SelectValue placeholder="Select accepted submission" /></SelectTrigger>
              <SelectContent>
                {acceptedSubs.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title} ({s._campaignTitle})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={link.platform} onValueChange={v => updateLink(i, "platform", v)}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="flex-1" placeholder="https://..." value={link.url} onChange={e => updateLink(i, "url", e.target.value)} />
                {links.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={() => removeLink(i)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLink} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Platform</Button>
            <Button onClick={handleSubmitLinks} disabled={submitting} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Submit Links
            </Button>
          </CardContent>
        </Card>
      )}

      {acceptedSubs.length === 0 && (
        <Card className="border-border/50 border-dashed mb-6">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No accepted videos yet. Submit videos for review first.</p>
          </CardContent>
        </Card>
      )}

      {subsWithLinks.length > 0 && (
        <div>
          <h2 className="text-lg font-heading font-bold text-foreground mb-4">Your Posted Links</h2>
          <div className="space-y-4">
            {Object.entries(groupedByCampaign)
              .filter(([, { subs }]) => subs.some(s => s._links.length > 0))
              .map(([campId, { title: campTitle, subs }]) => {
                const isOpen = openCampaigns.has(campId);
                const totalLinks = subs.reduce((sum, s) => sum + s._links.length, 0);
                return (
                  <Card key={campId} className="border-border/50 overflow-hidden">
                    <button
                      onClick={() => toggleCampaign(campId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="font-heading font-bold text-foreground">{campTitle}</p>
                          <p className="text-xs text-muted-foreground">{totalLinks} link{totalLinks !== 1 ? "s" : ""} posted</p>
                        </div>
                      </div>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/50 divide-y divide-border/20">
                        {subs.filter(s => s._links.length > 0).map((sub: any) => (
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
                    )}
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

export default PostedVideos;
