import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, CheckCircle, XCircle, Clock, MessageSquare, Play, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

const VideoReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [reviewSub, setReviewSub] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: camps } = await supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id);
      setCampaigns(camps || []);

      const campIds = (camps || []).map((c: any) => c.id);
      if (campIds.length > 0) {
        const { data: subs } = await supabase
          .from("video_submissions")
          .select("*")
          .in("campaign_id", campIds)
          .order("created_at", { ascending: false });
        setSubmissions(subs || []);

        const creatorIds = [...new Set((subs || []).map((s: any) => s.creator_user_id))] as string[];
        if (creatorIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
          const map: Record<string, any> = {};
          (profs || []).forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }

        // Auto-open campaigns that have submissions
        const campIdsWithSubs = new Set((subs || []).map((s: any) => s.campaign_id));
        setOpenCampaigns(campIdsWithSubs as Set<string>);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const refreshSubmissions = async () => {
    const campIds = campaigns.map(c => c.id);
    const { data: subs } = await supabase.from("video_submissions").select("*").in("campaign_id", campIds).order("created_at", { ascending: false });
    setSubmissions(subs || []);
  };

  const handleReview = async (status: "accepted" | "rejected") => {
    if (!reviewSub) return;
    if (status === "rejected" && !feedback.trim()) {
      toast({ title: "Please provide feedback for rejection", variant: "destructive" });
      return;
    }
    setReviewLoading(true);

    await supabase.from("video_submissions").update({
      status,
      feedback: feedback.trim() || null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", reviewSub.id);

    await supabase.from("notifications").insert({
      user_id: reviewSub.creator_user_id,
      type: status === "accepted" ? "video_accepted" : "video_rejected",
      title: status === "accepted" ? "Video Accepted!" : "Video Needs Changes",
      body: status === "accepted"
        ? `Your video "${reviewSub.title}" has been approved. You can now post it!`
        : `Your video "${reviewSub.title}" needs changes: ${feedback.trim()}`,
      link: "/dashboard/videos",
    });

    await refreshSubmissions();
    setReviewSub(null);
    setFeedback("");
    toast({ title: status === "accepted" ? "Video accepted" : "Video rejected with feedback" });
    setReviewLoading(false);
  };

  const toggleCampaign = (id: string) => {
    setOpenCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getProfile = (uid: string) => profiles[uid] || {};

  const statusBadge = (s: string) => {
    if (s === "accepted") return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Accepted</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Group by campaign → creator
  const grouped: Record<string, { title: string; creators: Record<string, { profile: any; subs: any[] }> }> = {};
  campaigns.forEach(c => {
    grouped[c.id] = { title: c.title, creators: {} };
  });
  submissions.forEach((sub: any) => {
    if (!grouped[sub.campaign_id]) return;
    const uid = sub.creator_user_id;
    if (!grouped[sub.campaign_id].creators[uid]) {
      grouped[sub.campaign_id].creators[uid] = { profile: getProfile(uid), subs: [] };
    }
    grouped[sub.campaign_id].creators[uid].subs.push(sub);
  });

  const campaignsWithSubs = Object.entries(grouped).filter(([, v]) => Object.keys(v.creators).length > 0);
  const totalPending = submissions.filter(s => s.status === "pending").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Video Review</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Review video submissions from creators</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{totalPending}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{submissions.filter(s => s.status === "accepted").length}</p>
          <p className="text-[11px] text-muted-foreground">Accepted</p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{submissions.filter(s => s.status === "rejected").length}</p>
          <p className="text-[11px] text-muted-foreground">Rejected</p>
        </div>
      </div>

      {campaignsWithSubs.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No video submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaignsWithSubs.map(([campId, campData]) => {
            const isOpen = openCampaigns.has(campId);
            const campSubs = Object.values(campData.creators).flatMap(c => c.subs);
            const pendingCount = campSubs.filter(s => s.status === "pending").length;
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
                        {campSubs.length} submission{campSubs.length !== 1 ? "s" : ""} · {Object.keys(campData.creators).length} creator{Object.keys(campData.creators).length !== 1 ? "s" : ""}
                        {pendingCount > 0 && <span className="text-yellow-500 ml-1">· {pendingCount} pending</span>}
                      </p>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border/50">
                    {Object.entries(campData.creators).map(([uid, { profile: prof, subs: creatorSubs }]) => (
                      <div key={uid} className="border-b border-border/30 last:border-b-0">
                        <div className="flex items-center gap-3 px-4 py-3 bg-secondary/20">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={prof.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-xs">{(prof.display_name || prof.username || "C").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-foreground">{prof.display_name || prof.username || "Creator"}</p>
                            <p className="text-[11px] text-muted-foreground">{creatorSubs.length} video{creatorSubs.length !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="divide-y divide-border/20">
                          {creatorSubs.map((sub: any) => (
                            <div key={sub.id} className="flex items-start justify-between gap-4 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{sub.title}</p>
                                <p className="text-[11px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                                <div className="mt-1.5">{statusBadge(sub.status)}</div>
                                {sub.feedback && (
                                  <div className="mt-2 p-2 rounded bg-secondary/50 text-xs">
                                    <span className="text-muted-foreground">Feedback: </span>{sub.feedback}
                                  </div>
                                )}
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
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewSub} onOpenChange={o => { if (!o) setReviewSub(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review: {reviewSub?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" className="w-full gap-2" onClick={() => setPlayingVideo({ url: reviewSub?.video_url, title: reviewSub?.title })}>
              <Play className="h-4 w-4" /> Watch Video
            </Button>
            <Textarea placeholder="Feedback / comments (required for rejection)" value={feedback} onChange={e => setFeedback(e.target.value)} className="min-h-[100px]" />
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

export default VideoReview;
