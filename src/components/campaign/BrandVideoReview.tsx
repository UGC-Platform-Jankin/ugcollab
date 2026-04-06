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
import { Loader2, Video, CheckCircle, XCircle, MessageSquare, Play, ArrowLeft } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Props {
  campaignId: string;
}

const BrandVideoReview = ({ campaignId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allCreators, setAllCreators] = useState<{ userId: string; profile: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewSub, setReviewSub] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [expectedVideoCount, setExpectedVideoCount] = useState(1);

  const loadData = async () => {
    // Load campaign expected video count
    const { data: campData } = await supabase
      .from("campaigns")
      .select("expected_video_count")
      .eq("id", campaignId)
      .single();
    setExpectedVideoCount(campData?.expected_video_count || 1);

    // Load ALL accepted creators for this campaign
    const { data: apps } = await supabase
      .from("campaign_applications")
      .select("creator_user_id")
      .eq("campaign_id", campaignId)
      .eq("status", "accepted");
    const creatorIds = [...new Set((apps || []).map((a: any) => a.creator_user_id))] as string[];

    // Load submissions
    const { data: subs } = await supabase
      .from("video_submissions")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    setSubmissions(subs || []);

    // Also include creator IDs from submissions (in case they exist but aren't in applications)
    const subCreatorIds = [...new Set((subs || []).map((s: any) => s.creator_user_id))] as string[];
    const allIds = [...new Set([...creatorIds, ...subCreatorIds])] as string[];

    // Load profiles
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
    if (s === "accepted") return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">Accepted</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-500 dark:border-yellow-500/30">Pending</Badge>;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  // Build per-creator data
  const byCreator: Record<string, any[]> = {};
  submissions.forEach((sub: any) => {
    if (!byCreator[sub.creator_user_id]) byCreator[sub.creator_user_id] = [];
    byCreator[sub.creator_user_id].push(sub);
  });

  // Stats
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const acceptedCount = submissions.filter(s => s.status === "accepted").length;
  const rejectedCount = submissions.filter(s => s.status === "rejected").length;

  // Selected creator detail view
  if (selectedCreator) {
    const creator = allCreators.find(c => c.userId === selectedCreator);
    if (!creator) { setSelectedCreator(null); return null; }
    const prof = creator.profile;
    const subs = byCreator[selectedCreator] || [];
    const cPending = subs.filter(s => s.status === "pending").length;
    const cAccepted = subs.filter(s => s.status === "accepted").length;
    const cRejected = subs.filter(s => s.status === "rejected").length;
    const videosLeft = Math.max(0, expectedVideoCount - cAccepted);

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
            <p className="text-xs text-muted-foreground">{subs.length} submission{subs.length !== 1 ? "s" : ""} · {videosLeft} video{videosLeft !== 1 ? "s" : ""} left</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{cPending}</p>
            <p className="text-[11px] text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{cAccepted}</p>
            <p className="text-[11px] text-muted-foreground">Accepted</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-destructive/10 border border-red-200 dark:border-destructive/20 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{cRejected}</p>
            <p className="text-[11px] text-muted-foreground">Rejected</p>
          </div>
        </div>

        {subs.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-8 text-center">
              <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No videos submitted yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {subs.map((sub: any) => (
              <Card key={sub.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
  }

  // Creator grid view — show ALL creators
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{pendingCount}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{acceptedCount}</p>
          <p className="text-[11px] text-muted-foreground">Accepted</p>
        </div>
        <div className="rounded-xl bg-red-50 dark:bg-destructive/10 border border-red-200 dark:border-destructive/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{rejectedCount}</p>
          <p className="text-[11px] text-muted-foreground">Rejected</p>
        </div>
      </div>

      {allCreators.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No creators in this campaign yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allCreators.map(({ userId, profile: prof }) => {
            const subs = byCreator[userId] || [];
            const cPending = subs.filter(s => s.status === "pending").length;
            const cAccepted = subs.filter(s => s.status === "accepted").length;
            const videosLeft = Math.max(0, expectedVideoCount - cAccepted);
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
                    {cPending > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-yellow-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {cPending}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm text-foreground truncate max-w-full">{prof.display_name || prof.username || "Creator"}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{subs.length} video{subs.length !== 1 ? "s" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">{videosLeft} left to deliver</p>
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

export default BrandVideoReview;
