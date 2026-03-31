import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";

const VideoReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [reviewSub, setReviewSub] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: camps } = await supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id);
      setCampaigns(camps || []);

      const campIds = (camps || []).map((c: any) => c.id);
      if (campIds.length > 0) {
        const { data: subs } = await supabase
          .from("video_submissions" as any)
          .select("*")
          .in("campaign_id", campIds)
          .order("created_at", { ascending: false });
        setSubmissions((subs as any) || []);

        // Load creator profiles
        const creatorIds = [...new Set(((subs as any) || []).map((s: any) => s.creator_user_id))] as string[];
        if (creatorIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
          const map: Record<string, any> = {};
          (profs || []).forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleReview = async (status: "accepted" | "rejected") => {
    if (!reviewSub) return;
    if (status === "rejected" && !feedback.trim()) {
      toast({ title: "Please provide feedback for rejection", variant: "destructive" });
      return;
    }
    setReviewLoading(true);

    await supabase.from("video_submissions" as any).update({
      status,
      feedback: feedback.trim() || null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", reviewSub.id);

    // Notify creator
    await supabase.from("notifications" as any).insert({
      user_id: reviewSub.creator_user_id,
      type: status === "accepted" ? "video_accepted" : "video_rejected",
      title: status === "accepted" ? "Video Accepted!" : "Video Needs Changes",
      body: status === "accepted"
        ? `Your video "${reviewSub.title}" has been approved. You can now post it!`
        : `Your video "${reviewSub.title}" needs changes: ${feedback.trim()}`,
      link: "/dashboard/videos",
    } as any);

    // Refresh
    const campIds = campaigns.map(c => c.id);
    const { data: subs } = await supabase.from("video_submissions" as any).select("*").in("campaign_id", campIds).order("created_at", { ascending: false });
    setSubmissions((subs as any) || []);
    setReviewSub(null);
    setFeedback("");
    toast({ title: status === "accepted" ? "Video accepted" : "Video rejected with feedback" });
    setReviewLoading(false);
  };

  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title || "Campaign";
  const getProfile = (uid: string) => profiles[uid] || {};

  const filtered = selectedCampaign === "all" ? submissions : submissions.filter((s: any) => s.campaign_id === selectedCampaign);

  const statusBadge = (s: string) => {
    if (s === "accepted") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Accepted</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Video Review</h1>
        <p className="text-muted-foreground mt-1">Review video submissions from creators</p>
      </div>

      <div className="mb-6">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No video submissions yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub: any) => {
            const prof = getProfile(sub.creator_user_id);
            return (
              <Card key={sub.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={prof.avatar_url || undefined} />
                        <AvatarFallback className="bg-secondary text-sm">{(prof.display_name || prof.username || "C").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{prof.display_name || prof.username || "Creator"} &middot; {getCampaignTitle(sub.campaign_id)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                        <div className="mt-2">{statusBadge(sub.status)}</div>
                        {sub.feedback && (
                          <div className="mt-2 p-2 rounded bg-secondary/50 text-xs">
                            <span className="text-muted-foreground">Feedback: </span>{sub.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <a href={sub.video_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1"><Video className="h-3.5 w-3.5" /> View</Button>
                      </a>
                      {sub.status === "pending" && (
                        <Button size="sm" variant="secondary" className="gap-1" onClick={() => { setReviewSub(sub); setFeedback(""); }}>
                          <MessageSquare className="h-3.5 w-3.5" /> Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
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
            <a href={reviewSub?.video_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full gap-2"><Video className="h-4 w-4" /> Watch Video</Button>
            </a>
            <Textarea placeholder="Feedback / comments (required for rejection)" value={feedback} onChange={e => setFeedback(e.target.value)} className="min-h-[100px]" />
            <div className="flex gap-3">
              <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleReview("accepted")} disabled={reviewLoading}>
                <CheckCircle className="h-4 w-4" /> Accept
              </Button>
              <Button className="flex-1 gap-2" variant="destructive" onClick={() => handleReview("rejected")} disabled={reviewLoading}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoReview;
