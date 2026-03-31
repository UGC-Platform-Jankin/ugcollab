import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Video, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

const VideoSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reuploadSub, setReuploadSub] = useState<any>(null);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadTitle, setReuploadTitle] = useState("");
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get accepted campaigns
      const { data: apps } = await supabase
        .from("campaign_applications")
        .select("campaign_id")
        .eq("creator_user_id", user.id)
        .eq("status", "accepted");
      
      const campIds = (apps || []).map((a: any) => a.campaign_id);
      if (campIds.length > 0) {
        const { data: camps } = await supabase.from("campaigns").select("id, title").in("id", campIds);
        setCampaigns(camps || []);
      }

      // Get all submissions
      const { data: subs } = await supabase
        .from("video_submissions" as any)
        .select("*")
        .eq("creator_user_id", user.id)
        .order("created_at", { ascending: false });
      setSubmissions((subs as any) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !selectedCampaign || !title.trim() || !file) {
      toast({ title: "Please fill all fields and select a video", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("video-submissions").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("video-submissions").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("video_submissions" as any).insert({
      campaign_id: selectedCampaign,
      creator_user_id: user.id,
      title: title.trim(),
      video_url: urlData.publicUrl,
    } as any);

    if (insertErr) {
      toast({ title: "Error", description: insertErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Notify brand
    const camp = campaigns.find(c => c.id === selectedCampaign);
    const { data: campFull } = await supabase.from("campaigns").select("brand_user_id").eq("id", selectedCampaign).single();
    if (campFull) {
      await supabase.from("notifications" as any).insert({
        user_id: campFull.brand_user_id,
        type: "video_submission",
        title: "New Video Submitted",
        body: `A creator submitted a video "${title.trim()}" for "${camp?.title || "your campaign"}"`,
        link: "/brand/video-review",
      } as any);
    }

    // Refresh
    const { data: subs } = await supabase.from("video_submissions" as any).select("*").eq("creator_user_id", user.id).order("created_at", { ascending: false });
    setSubmissions((subs as any) || []);
    setTitle("");
    setFile(null);
    setSelectedCampaign("");
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
    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setReuploadLoading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("video-submissions").getPublicUrl(path);

    await supabase.from("video_submissions" as any).update({
      video_url: urlData.publicUrl,
      status: "pending",
      feedback: null,
      title: reuploadTitle.trim() || reuploadSub.title,
      updated_at: new Date().toISOString(),
    } as any).eq("id", reuploadSub.id);

    // Notify brand
    const { data: campFull } = await supabase.from("campaigns").select("brand_user_id, title").eq("id", reuploadSub.campaign_id).single();
    if (campFull) {
      await supabase.from("notifications" as any).insert({
        user_id: campFull.brand_user_id,
        type: "video_resubmission",
        title: "Video Re-submitted",
        body: `A creator re-submitted a video for "${campFull.title}"`,
        link: "/brand/video-review",
      } as any);
    }

    const { data: subs } = await supabase.from("video_submissions" as any).select("*").eq("creator_user_id", user.id).order("created_at", { ascending: false });
    setSubmissions((subs as any) || []);
    setReuploadSub(null);
    setReuploadFile(null);
    setReuploadTitle("");
    toast({ title: "Video re-submitted for review!" });
    setReuploadLoading(false);
  };

  const statusIcon = (s: string) => {
    if (s === "accepted") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const statusBadge = (s: string) => {
    if (s === "accepted") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Accepted</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending Review</Badge>;
  };

  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title || "Campaign";

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Video Submissions</h1>
        <p className="text-muted-foreground mt-1">Submit videos for your active campaigns</p>
      </div>

      {/* Submit Form */}
      {campaigns.length > 0 && (
        <Card className="border-border/50 mb-8">
          <CardHeader><CardTitle className="text-lg">Submit a Video</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Submission title" value={title} onChange={e => setTitle(e.target.value)} />
            <Input ref={fileRef} type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Submit Video</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {campaigns.length === 0 && (
        <Card className="border-border/50 border-dashed mb-8">
          <CardContent className="py-12 text-center">
            <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">You need to be accepted to a campaign before submitting videos.</p>
          </CardContent>
        </Card>
      )}

      {/* Submissions List */}
      {submissions.length > 0 && (
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">Your Submissions</h2>
          <div className="space-y-3">
            {submissions.map((sub: any) => (
              <Card key={sub.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon(sub.status)}
                        <p className="font-medium text-foreground truncate">{sub.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{getCampaignTitle(sub.campaign_id)} &middot; {new Date(sub.created_at).toLocaleDateString()}</p>
                      {statusBadge(sub.status)}
                      {sub.feedback && (
                        <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Feedback</p>
                          <p className="text-sm text-foreground">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <a href={sub.video_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1"><Video className="h-3.5 w-3.5" /> View</Button>
                      </a>
                      {sub.status === "rejected" && (
                        <Button size="sm" variant="secondary" className="gap-1" onClick={() => { setReuploadSub(sub); setReuploadTitle(sub.title); }}>
                          <RefreshCw className="h-3.5 w-3.5" /> Re-upload
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reupload Dialog */}
      <Dialog open={!!reuploadSub} onOpenChange={o => { if (!o) { setReuploadSub(null); setReuploadFile(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Re-upload Video</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {reuploadSub?.feedback && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Previous Feedback</p>
                <p className="text-sm">{reuploadSub.feedback}</p>
              </div>
            )}
            <Input value={reuploadTitle} onChange={e => setReuploadTitle(e.target.value)} placeholder="Submission title" />
            <Input ref={reuploadRef} type="file" accept="video/*" onChange={e => setReuploadFile(e.target.files?.[0] || null)} />
            <Button onClick={handleReupload} disabled={reuploadLoading || !reuploadFile} className="w-full gap-2">
              {reuploadLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Re-submit</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoSubmissions;
