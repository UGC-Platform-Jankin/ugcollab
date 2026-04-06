import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Video, RefreshCw, CheckCircle, XCircle, Clock, ArrowRight, Play, ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";

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
  const [activeTab, setActiveTab] = useState("submit");
  const [playingVideo, setPlayingVideo] = useState<{ url: string; title: string } | null>(null);
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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

      const { data: subs } = await supabase
        .from("video_submissions")
        .select("*")
        .eq("creator_user_id", user.id)
        .order("created_at", { ascending: false });
      setSubmissions(subs || []);

      // Auto-open all campaigns with submissions
      const campIdsWithSubs = new Set((subs || []).map((s: any) => s.campaign_id));
      setOpenCampaigns(campIdsWithSubs as Set<string>);

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

    const { error: insertErr } = await supabase.from("video_submissions").insert({
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

    const camp = campaigns.find(c => c.id === selectedCampaign);
    const { data: campFull } = await supabase.from("campaigns").select("brand_user_id").eq("id", selectedCampaign).single();
    if (campFull) {
      await supabase.from("notifications").insert({
        user_id: campFull.brand_user_id,
        type: "video_submission",
        title: "New Video Submitted",
        body: `A creator submitted a video "${title.trim()}" for "${camp?.title || "your campaign"}"`,
        link: "/brand/video-review",
      });
    }

    const { data: subs } = await supabase.from("video_submissions").select("*").eq("creator_user_id", user.id).order("created_at", { ascending: false });
    setSubmissions(subs || []);
    setTitle("");
    setFile(null);
    setSelectedCampaign("");
    if (fileRef.current) fileRef.current.value = "";
    toast({ title: "Video submitted for review!" });
    setUploading(false);
    setActiveTab("history");
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

    await supabase.from("video_submissions").update({
      video_url: urlData.publicUrl,
      status: "pending",
      feedback: null,
      title: reuploadTitle.trim() || reuploadSub.title,
      updated_at: new Date().toISOString(),
    } as any).eq("id", reuploadSub.id);

    const { data: campFull } = await supabase.from("campaigns").select("brand_user_id, title").eq("id", reuploadSub.campaign_id).single();
    if (campFull) {
      await supabase.from("notifications").insert({
        user_id: campFull.brand_user_id,
        type: "video_resubmission",
        title: "Video Re-submitted",
        body: `A creator re-submitted a video for "${campFull.title}"`,
        link: "/brand/video-review",
      });
    }

    const { data: subs } = await supabase.from("video_submissions").select("*").eq("creator_user_id", user.id).order("created_at", { ascending: false });
    setSubmissions(subs || []);
    setReuploadSub(null);
    setReuploadFile(null);
    setReuploadTitle("");
    toast({ title: "Video re-submitted for review!" });
    setReuploadLoading(false);
  };

  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title || "Campaign";

  const toggleCampaign = (id: string) => {
    setOpenCampaigns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pendingSubs = submissions.filter((s: any) => s.status === "pending");
  const rejectedSubs = submissions.filter((s: any) => s.status === "rejected");
  const acceptedSubs = submissions.filter((s: any) => s.status === "accepted");

  // Group submissions by campaign
  const groupedByCampaign: Record<string, { title: string; subs: any[] }> = {};
  submissions.forEach((sub: any) => {
    if (!groupedByCampaign[sub.campaign_id]) {
      groupedByCampaign[sub.campaign_id] = { title: getCampaignTitle(sub.campaign_id), subs: [] };
    }
    groupedByCampaign[sub.campaign_id].subs.push(sub);
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight">Video Submissions</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Submit, track, and resubmit videos for your campaigns</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{pendingSubs.length}</p>
          <p className="text-[11px] text-muted-foreground">Pending</p>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
          <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{rejectedSubs.length}</p>
          <p className="text-[11px] text-muted-foreground">Needs Revision</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
          <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{acceptedSubs.length}</p>
          <p className="text-[11px] text-muted-foreground">Accepted</p>
        </div>
      </div>

      {/* Needs attention banner */}
      {rejectedSubs.length > 0 && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{rejectedSubs.length} video{rejectedSubs.length > 1 ? "s" : ""} need revision</p>
              <p className="text-xs text-muted-foreground">Review feedback and re-upload your updated videos</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => {
            setReuploadSub(rejectedSubs[0]);
            setReuploadTitle(rejectedSubs[0].title);
          }}>
            Fix Now <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="submit">Submit Video</TabsTrigger>
          <TabsTrigger value="history">
            History
            {submissions.length > 0 && <span className="ml-1.5 text-xs opacity-70">{submissions.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          {campaigns.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">You need to be accepted to a campaign before submitting videos.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-lg">Submit a Video</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Campaign</p>
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Submission Title</p>
                  <Input placeholder="e.g. Product Unboxing Take 1" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Video File</p>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">{file ? file.name : "Click to select or drag a video file"}</p>
                    <Input ref={fileRef} type="file" accept="video/*" className="max-w-xs mx-auto" onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={uploading || !selectedCampaign || !title.trim() || !file} className="w-full gap-2">
                  {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Submit Video</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          {submissions.length === 0 ? (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Video className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No submissions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByCampaign).map(([campId, { title: campTitle, subs }]) => {
                const isOpen = openCampaigns.has(campId);
                const pendingCount = subs.filter(s => s.status === "pending").length;
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
                          <p className="text-xs text-muted-foreground">
                            {subs.length} submission{subs.length !== 1 ? "s" : ""}
                            {pendingCount > 0 && <span className="text-yellow-500 ml-1">· {pendingCount} pending</span>}
                          </p>
                        </div>
                      </div>
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/50 divide-y divide-border/20">
                        {subs.map((sub: any) => (
                          <div key={sub.id} className="flex items-start justify-between gap-4 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {sub.status === "accepted" ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> :
                                 sub.status === "rejected" ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
                                 <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                                <p className="font-medium text-sm text-foreground truncate">{sub.title}</p>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</p>
                              <div className="mt-1.5">
                                <Badge
                                  className={
                                    sub.status === "accepted" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                    sub.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" :
                                    "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                                  }
                                >
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
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            <div className="space-y-2">
              <p className="text-sm font-medium">Title</p>
              <Input value={reuploadTitle} onChange={e => setReuploadTitle(e.target.value)} placeholder="Submission title" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Updated Video</p>
              <Input type="file" accept="video/*" onChange={e => setReuploadFile(e.target.files?.[0] || null)} />
            </div>
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

export default VideoSubmissions;
