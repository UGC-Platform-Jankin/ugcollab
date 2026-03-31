import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: subs } = await supabase
        .from("video_submissions" as any)
        .select("*")
        .eq("creator_user_id", user.id)
        .eq("status", "accepted");

      const accepted = (subs as any) || [];
      // Enrich with campaign title
      if (accepted.length > 0) {
        const campIds = [...new Set(accepted.map((s: any) => s.campaign_id))] as string[];
        const { data: camps } = await supabase.from("campaigns").select("id, title").in("id", campIds);
        const campMap: Record<string, string> = {};
        (camps || []).forEach((c: any) => { campMap[c.id] = c.title; });
        accepted.forEach((s: any) => { s._campaignTitle = campMap[s.campaign_id] || "Campaign"; });
      }
      setAcceptedSubs(accepted);

      // Get posted links
      if (accepted.length > 0) {
        const subIds = accepted.map((s: any) => s.id);
        const { data: pl } = await supabase.from("posted_video_links" as any).select("*").in("submission_id", subIds);
        setPostedLinks((pl as any) || []);
      }
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
    const { error } = await supabase.from("posted_video_links" as any).insert(rows as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Refresh
    const subIds = acceptedSubs.map((s: any) => s.id);
    const { data: pl } = await supabase.from("posted_video_links" as any).select("*").in("submission_id", subIds);
    setPostedLinks((pl as any) || []);
    setLinks([{ platform: "", url: "" }]);
    setSelectedSub("");
    toast({ title: "Posted video links saved!" });
    setSubmitting(false);
  };

  const getSubTitle = (id: string) => acceptedSubs.find(s => s.id === id)?.title || "Video";
  const getSubCampaign = (id: string) => acceptedSubs.find(s => s.id === id)?._campaignTitle || "Campaign";

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Group posted links by submission
  const linksBySub: Record<string, any[]> = {};
  postedLinks.forEach((l: any) => {
    if (!linksBySub[l.submission_id]) linksBySub[l.submission_id] = [];
    linksBySub[l.submission_id].push(l);
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Posted Videos</h1>
        <p className="text-muted-foreground mt-1">Submit links to your posted videos</p>
      </div>

      {acceptedSubs.length > 0 && (
        <Card className="border-border/50 mb-8">
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
        <Card className="border-border/50 border-dashed mb-8">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No accepted videos yet. Submit videos for review first.</p>
          </CardContent>
        </Card>
      )}

      {Object.keys(linksBySub).length > 0 && (
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">Your Posted Links</h2>
          <div className="space-y-3">
            {Object.entries(linksBySub).map(([subId, subLinks]) => (
              <Card key={subId} className="border-border/50">
                <CardContent className="p-4">
                  <p className="font-medium text-foreground mb-1">{getSubTitle(subId)}</p>
                  <p className="text-xs text-muted-foreground mb-3">{getSubCampaign(subId)}</p>
                  <div className="space-y-2">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostedVideos;
