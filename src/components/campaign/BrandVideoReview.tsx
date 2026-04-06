import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, CheckCircle, XCircle, Clock, MessageSquare, Play } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Props {
  campaignId: string;
}

const BrandVideoReview = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [reviewSub, setReviewSub] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);

  const loadData = async () => {
    const { data: subs } = await supabase
      .from("video_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    setSubmissions(subs || []);

    const creatorIds = [...new Set((subs || []).map((s: any) => s.creator_user_id))] as string[];
    if (creatorIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [campaignId]);

  const handleReview = async (status: "accepted" | "rejected") => {
    if (!reviewSub) return;
    if (status === "rejected" && !feedback.trim()) {
      toast({ title: "Please provide feedback for rejection", variant: "destructive" });
      return;
    }
    setReviewLoading(true);
    await supabase.from("video_submissions").update({ status, feedback: feedback.trim() || null, updated_at: new Date().toISOString() } as any).eq("id", reviewSub.id);
    await supabase.from("notifications").insert({
      user_id: reviewSub.creator_user_id,
      type: status === "accepted" ? "video_accepted" : "video_rejected",
      title: status === "accepted" ? "Video Accepted!" : "Video Needs Changes",
      body: status === "accepted" ? `Your video "${reviewSub.title}" has been approved.` : `Your video "${reviewSub.title}" needs changes: ${feedback.trim()}`,
      link: "/dashboard/videos",
    });
    await loadData();
    setReviewSub(null);
    setFeedback("");
    toast({ title: status === "accepted" ? "Video accepted" : "Video rejected with feedback" });
    setReviewLoading(false);
  };

  const statusBadge = (s: string) => {
    if (s === "accepted") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Accepted</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  // Group by creator
  const byCreator: Record<string, { profile: any; subs: any[] }> = {};
  submissions.forEach((sub: any) => {
    const uid = sub.creator_user_id;
    if (!byCreator[uid]) byCreator[uid] = { profile: profiles[uid] || {}, subs: [] };
    byCreator[uid].subs.push(sub);
  });

  if (submissions.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="py-12 text-center">
          <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No video submissions yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{submissions.filter(s => s.status === "pending").length}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{submissions.filter(s => s.status === "accepted").length}</p>
          <p className="text-[11px] text-muted-foreground">Accepted</p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{submissions.filter(s => s.status === "rejected").length}</p>
          <p className="text-[11px] text-muted-foreground">Rejected</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(byCreator).map(([uid, { profile: prof, subs }]) => (
          <Card key={uid} className="border-border/50">
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20 border-b border-border/30">
              <Avatar className="h-8 w-8">
                <AvatarImage src={prof.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-xs">{(prof.display_name || prof.username || "C").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm text-foreground">{prof.display_name || prof.username || "Creator"}</p>
                <p className="text-[11px] text-muted-foreground">{subs.length} video{subs.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {subs.map((sub: any) => (
                <div key={sub.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{sub.title}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                    <div className="mt-1.5">{statusBadge(sub.status)}</div>
                    {sub.feedback && <div className="mt-2 p-2 rounded bg-secondary/50 text-xs"><span className="text-muted-foreground">Feedback: </span>{sub.feedback}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setPlayingVideo({ url: sub.video_url, title: sub.title })}>
                      <Play className="h-3 w-3" /> View
                    </Button>
                    {sub.status === "pending" && (
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => { setReviewSub(sub); setFeedback(""); }}>
                        <MessageSquare className="h-3 w-3" /> Review
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!reviewSub} onOpenChange={o => { if (!o) setReviewSub(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review: {reviewSub?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" className="w-full gap-2" onClick={() => setPlayingVideo({ url: reviewSub?.video_url, title: reviewSub?.title })}>
              <Play className="h-4 w-4" /> Watch Video
            </Button>
            <Textarea placeholder="Feedback (required for rejection)" value={feedback} onChange={e => setFeedback(e.target.value)} className="min-h-[100px]" />
            <div className="flex gap-3">
              <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview("accepted")} disabled={reviewLoading}>
                <CheckCircle className="h-4 w-4" /> Accept
              </Button>
              <Button className="flex-1 gap-2" variant="destructive" onClick={() => handleReview("rejected")} disabled={reviewLoading}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default BrandVideoReview;
