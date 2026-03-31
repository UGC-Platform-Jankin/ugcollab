import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Clock, DollarSign, MapPin, Send, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  platforms: string[] | null;
  campaign_length_days: number | null;
  status: string;
  price_per_video: number | null;
  is_free_product: boolean;
  target_regions: string[] | null;
  expected_video_count: number;
  requirements: string | null;
  brand_user_id: string;
}

const Gigs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedCampaigns, setAppliedCampaigns] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<Campaign | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [campaignsRes, applicationsRes] = await Promise.all([
        supabase.from("campaigns").select("*").eq("status", "active").order("created_at", { ascending: false }),
        user ? supabase.from("campaign_applications").select("campaign_id").eq("creator_user_id", user.id) : Promise.resolve({ data: [] }),
      ]);
      setCampaigns((campaignsRes.data as any) || []);
      if (applicationsRes.data) {
        setAppliedCampaigns(new Set(applicationsRes.data.map((a: any) => a.campaign_id)));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleApply = async () => {
    if (!user || !applyingTo) return;
    if (coverLetter.length < 300) {
      toast({ title: "Cover letter too short", description: `Minimum 300 characters (${coverLetter.length}/300)`, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Insert application
    const { error } = await supabase.from("campaign_applications").insert({
      campaign_id: applyingTo.id,
      creator_user_id: user.id,
      cover_letter: coverLetter,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setAppliedCampaigns((prev) => new Set([...prev, applyingTo.id]));
    toast({ title: "Application sent!", description: "The brand will review your application." });
    setApplyingTo(null);
    setCoverLetter("");
    setSubmitting(false);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Available Gigs</h1>
        <p className="text-muted-foreground mt-1">Browse and apply to brand campaigns</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50 animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2 mt-2" /></CardHeader>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No gigs available yet</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              New campaigns from brands will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const hasApplied = appliedCampaigns.has(campaign.id);
            return (
              <Card key={campaign.id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedCampaign(campaign)}>
                <CardHeader>
                  <CardTitle className="text-lg">{campaign.title}</CardTitle>
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {campaign.platforms.map((p) => (
                        <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}
                  <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    {campaign.is_free_product ? (
                      <Badge variant="outline" className="text-xs">Free Product</Badge>
                    ) : campaign.price_per_video ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>HK${campaign.price_per_video}/video</span>
                      </div>
                    ) : null}
                    {campaign.campaign_length_days && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{campaign.campaign_length_days}d</span>
                      </div>
                    )}
                    {campaign.target_regions && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">{campaign.target_regions.join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    {hasApplied ? (
                      <Button size="sm" variant="outline" disabled className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Applied
                      </Button>
                    ) : (
                      <Button size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setApplyingTo(campaign); }}>
                        <Send className="h-3.5 w-3.5" /> Apply
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCampaign.title}</DialogTitle>
                <div className="flex gap-1 flex-wrap mt-1">
                  {selectedCampaign.platforms?.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize text-xs">{p}</Badge>
                  ))}
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedCampaign.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Compensation</p>
                    <p className="font-medium text-foreground">{selectedCampaign.is_free_product ? "Free Product" : `HK$${selectedCampaign.price_per_video}/video`}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Videos Expected</p>
                    <p className="font-medium text-foreground">{selectedCampaign.expected_video_count}</p>
                  </div>
                  {selectedCampaign.campaign_length_days && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <p className="text-muted-foreground text-xs">Campaign Length</p>
                      <p className="font-medium text-foreground">{selectedCampaign.campaign_length_days} days</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Regions</p>
                    <p className="font-medium text-foreground">{selectedCampaign.target_regions?.join(", ")}</p>
                  </div>
                </div>
                {selectedCampaign.requirements && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Requirements</p>
                    <p className="text-sm text-foreground">{selectedCampaign.requirements}</p>
                  </div>
                )}
                <div className="pt-2">
                  {appliedCampaigns.has(selectedCampaign.id) ? (
                    <Button disabled variant="outline" className="w-full gap-1"><Check className="h-4 w-4" /> Already Applied</Button>
                  ) : (
                    <Button className="w-full gap-1" onClick={() => { setApplyingTo(selectedCampaign); setSelectedCampaign(null); }}>
                      <Send className="h-4 w-4" /> Apply Now
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={(open) => { if (!open) { setApplyingTo(null); setCoverLetter(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to: {applyingTo?.title}</DialogTitle>
            <DialogDescription>Write a cover letter explaining why you're a great fit for this campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Textarea
                placeholder="Tell the brand why you're the perfect creator for this campaign — your experience, content style, audience match, etc."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[200px]"
              />
              <p className={`text-xs mt-1 ${coverLetter.length >= 300 ? "text-muted-foreground" : "text-destructive"}`}>
                {coverLetter.length}/300 characters minimum
              </p>
            </div>
            <Button onClick={handleApply} disabled={submitting || coverLetter.length < 300} className="w-full">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Application"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Gigs;
