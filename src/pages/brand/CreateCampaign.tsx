import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateCampaign = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("");
  const [isFreeProduct, setIsFreeProduct] = useState(false);
  const [pricePerVideo, setPricePerVideo] = useState("");
  const [expectedVideoCount, setExpectedVideoCount] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [requirements, setRequirements] = useState("");
  const [targetRegion, setTargetRegion] = useState("Worldwide");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/brand/auth");
  }, [user, authLoading, navigate]);

  const descCharCount = description.length;
  const isDescValid = descCharCount >= 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isDescValid) {
      toast({ title: "Description too short", description: `Minimum 500 characters required (${descCharCount}/500).`, variant: "destructive" });
      return;
    }
    if (!isFreeProduct && (!pricePerVideo || Number(pricePerVideo) <= 0)) {
      toast({ title: "Price required", description: "Enter a price per video or toggle free product.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("campaigns").insert({
      brand_user_id: user.id,
      title,
      description,
      platform: platform || null,
      is_free_product: isFreeProduct,
      price_per_video: isFreeProduct ? null : Number(pricePerVideo),
      expected_video_count: Number(expectedVideoCount),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      requirements: requirements || null,
      target_region: targetRegion,
    } as any);
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign created!", description: "Your campaign is now live." });
      navigate("/brand/dashboard");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/brand/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-heading">Create Campaign</CardTitle>
            <CardDescription>Post a UGC campaign to find the right creators for your brand.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campaign Name */}
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Name *</Label>
                <Input id="title" placeholder="e.g. Summer Product Unboxing" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description * <span className="text-xs text-muted-foreground">(min 500 characters)</span></Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you're looking for — content style, talking points, dos & don'ts, target audience, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="min-h-[180px]"
                />
                <p className={`text-xs ${isDescValid ? "text-muted-foreground" : "text-destructive"}`}>
                  {descCharCount}/500 characters
                </p>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="any">Any Platform</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compensation */}
              <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Free Product / Service Instead</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle on if you're offering free product instead of payment</p>
                  </div>
                  <Switch checked={isFreeProduct} onCheckedChange={setIsFreeProduct} />
                </div>

                {!isFreeProduct && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price per Video (HKD) *</Label>
                    <Input id="price" type="number" min="1" step="1" placeholder="e.g. 500" value={pricePerVideo} onChange={(e) => setPricePerVideo(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Target Region */}
              <div className="space-y-2">
                <Label>Target Creator Region *</Label>
                <Select value={targetRegion} onValueChange={setTargetRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Worldwide">🌍 Worldwide</SelectItem>
                    <SelectItem value="Hong Kong">🇭🇰 Hong Kong</SelectItem>
                    <SelectItem value="United Kingdom">🇬🇧 United Kingdom</SelectItem>
                    <SelectItem value="United States">🇺🇸 United States</SelectItem>
                    <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                    <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                    <SelectItem value="Canada">🇨🇦 Canada</SelectItem>
                    <SelectItem value="Japan">🇯🇵 Japan</SelectItem>
                    <SelectItem value="South Korea">🇰🇷 South Korea</SelectItem>
                    <SelectItem value="Malaysia">🇲🇾 Malaysia</SelectItem>
                    <SelectItem value="Thailand">🇹🇭 Thailand</SelectItem>
                    <SelectItem value="Philippines">🇵🇭 Philippines</SelectItem>
                    <SelectItem value="Indonesia">🇮🇩 Indonesia</SelectItem>
                    <SelectItem value="Vietnam">🇻🇳 Vietnam</SelectItem>
                    <SelectItem value="Taiwan">🇹🇼 Taiwan</SelectItem>
                    <SelectItem value="China">🇨🇳 China</SelectItem>
                    <SelectItem value="India">🇮🇳 India</SelectItem>
                    <SelectItem value="Germany">🇩🇪 Germany</SelectItem>
                    <SelectItem value="France">🇫🇷 France</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expected Videos */}
              <div className="space-y-2">
                <Label htmlFor="videoCount">Expected Number of Videos *</Label>
                <Input id="videoCount" type="number" min="1" max="100" value={expectedVideoCount} onChange={(e) => setExpectedVideoCount(e.target.value)} required />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <Label htmlFor="requirements">Additional Requirements</Label>
                <Textarea id="requirements" placeholder="e.g. Must have 1000+ followers, based in Hong Kong, etc." value={requirements} onChange={(e) => setRequirements(e.target.value)} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !title || !isDescValid}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Post Campaign"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCampaign;
