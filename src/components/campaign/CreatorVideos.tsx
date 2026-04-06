import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Video, RefreshCw, CheckCircle, XCircle, Clock, Play } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

interface Props {
  campaignId: string;
  campaignTitle: string;
}

const CreatorVideos = ({ campaignId, campaignTitle }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reuploadSub, setReuploadSub] = useState<any>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadTitle, setReuploadTitle] = useState("");
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSubs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("video_submissions")
      .select("*")
      .eq("creator_user_id", user.id)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSubs(); }, [user, campaignId]);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !file) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("video-submissions").upload(path, file);
    if (uploadErr) { toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("video-submissions").getPublicUrl(path);

    const { error } = await supabase.from("video_submissions").insert({ campaign_id: campaignId, creator_user_id: user.id, title: title.trim(), video_url: urlData.publicUrl } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setUploading(false); return; }

    const { data: camp } = await supabase.from("campaigns").select("brand_user_id").eq("id", campaignId).single();
    if (camp) {
      await supabase.from("notifications").insert({ user_id: camp.brand_user_id, type: "video_submission", title: "New Video Submitted", body: `A creator submitted "${title.trim()}" for "${campaignTitle}"`, link: `/brand/campaigns/${campaignId}` });
    }

    await loadSubs();
    setTitle(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    toast({ title: "Video submitted for review!" });
    setUploading(false);
  };

  const handleReupload = async () => {
    if (!user || !reuploadSub || !reuploadFile) return;
    setReuploadLoading(true);
    const ext = reuploadFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("video-submissions").upload(path, reuploadFile);
    if (uploadErr) { toast({ title: "Upload failed", variant: "destructive" }); setReuploadLoading(false); return; }
    const { data: urlData } = supabase.storage.from("video-submissions").getPublicUrl(path);

    await supabase.from("video_submissions").update({ video_url: urlData.publicUrl, status: "pending", feedback: null, title: reuploadTitle.trim() || reuploadSub.title, updated_at: new Date().toISOString() } as any).eq("id", reuploadSub.id);
    await loadSubs();
    setReuploadSub(null); setReuploadFile(null); setReuploadTitle("");
    toast({ title: "Video re-submitted!" });
    setReuploadLoading(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const rejectedCount = submissions.filter(s => s.status === "rejected").length;
  const acceptedCount = submissions.filter(s => s.status === "accepted").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{pendingCount}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{acceptedCount}</p>
          <p className="text-[11px] text-muted-foreground">Accepted</p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <p className="text-lg font-bold text-foreground">{rejectedCount}</p>
          <p className="text-[11px] text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Submit form */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-lg">Submit a Video</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Title</p>
            <Input placeholder="e.g. Product Unboxing Take 1" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Video File</p>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{file ? file.name : "Select a video file"}</p>
              <Input ref={fileRef} type="file" accept="video/*" className="max-w-xs mx-auto" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={uploading || !title.trim() || !file} className="w-full gap-2">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Submit Video</>}
          </Button>
        </CardContent>
      </Card>

      {/* Submissions list */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Submission History</h3>
          {submissions.map((sub: any) => (
            <Card key={sub.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {sub.status === "accepted" ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> :
                       sub.status === "rejected" ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
                       <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                      <p className="font-medium text-sm text-foreground truncate">{sub.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                    <div className="mt-1.5">
                      <Badge className={
                        sub.status === "accepted" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        sub.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
                        "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                      }>
                        {sub.status === "accepted" ? "Accepted" : sub.status === "rejected" ? "Needs Revision" : "Pending Review"}
                      </Badge>
                    </div>
                    {sub.feedback && (
                      <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                        <p className="text-xs text-muted-foreground mb-0.5 font-semibold">📝 Brand Feedback</p>
                        <p className="text-xs text-foreground">{sub.feedback}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setPlayingVideo({ url: sub.video_url, title: sub.title })}>
                      <Play className="h-3 w-3" /> View
                    </Button>
                    {sub.status === "rejected" && (
                      <Button size="sm" className="gap-1 h-7 text-xs bg-gradient-coral" onClick={() => { setReuploadSub(sub); setReuploadTitle(sub.title); }}>
                        <RefreshCw className="h-3 w-3" /> Re-upload
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reupload Dialog */}
      <Dialog open={!!reuploadSub} onOpenChange={o => { if (!o) { setReuploadSub(null); setReuploadFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Re-upload Video</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {reuploadSub?.feedback && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1 font-semibold">📝 Previous Feedback</p>
                <p className="text-sm">{reuploadSub.feedback}</p>
              </div>
            )}
            <Input value={reuploadTitle} onChange={e => setReuploadTitle(e.target.value)} placeholder="Title" />
            <Input type="file" accept="video/*" onChange={e => setReuploadFile(e.target.files?.[0] || null)} />
            <Button onClick={handleReupload} disabled={reuploadLoading || !reuploadFile} className="w-full gap-2">
              {reuploadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Re-submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VideoPlayerDialog videoUrl={playingVideo?.url || null} title={playingVideo?.title} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default CreatorVideos;
