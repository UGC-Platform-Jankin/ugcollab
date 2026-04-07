import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, Instagram, Facebook, Video, MessageSquare, Phone, Globe, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const platformOptions = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400" },
  { value: "tiktok", label: "TikTok", icon: Video, color: "text-cyan-400" },
];

const regionOptions = [
  { value: "Worldwide", label: "🌍 Worldwide" },
  { value: "Hong Kong", label: "🇭🇰 Hong Kong" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "United States", label: "🇺🇸 United States" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "Malaysia", label: "🇲🇾 Malaysia" },
  { value: "Thailand", label: "🇹🇭 Thailand" },
  { value: "Philippines", label: "🇵🇭 Philippines" },
  { value: "Indonesia", label: "🇮🇩 Indonesia" },
  { value: "Vietnam", label: "🇻🇳 Vietnam" },
  { value: "Taiwan", label: "🇹🇼 Taiwan" },
  { value: "China", label: "🇨🇳 China" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "France", label: "🇫🇷 France" },
];

const contactTypeOptions = [
  { value: "imessage", label: "iMessage", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "instagram_dm", label: "Instagram DM", icon: Instagram },
];

const CreateCampaign = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const reuse = (location.state as any)?.reuse;

  const [title, setTitle] = useState(reuse?.title || "");
  const [description, setDescription] = useState(reuse?.description || "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(reuse?.platforms || []);
  const [isFreeProduct, setIsFreeProduct] = useState(reuse?.is_free_product || false);
  const [pricePerVideo, setPricePerVideo] = useState(reuse?.price_per_video?.toString() || "");
  const [expectedVideoCount, setExpectedVideoCount] = useState(reuse?.expected_video_count?.toString() || "1");
  const [campaignLengthDays, setCampaignLengthDays] = useState(reuse?.campaign_length_days?.toString() || "");
  const [requirements, setRequirements] = useState(reuse?.requirements || "");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(reuse?.target_regions || ["Worldwide"]);
  const [maxCreators, setMaxCreators] = useState(reuse?.max_creators?.toString() || "10");
  const [submitting, setSubmitting] = useState(false);

  // Communication settings
  const [communicationType, setCommunicationType] = useState(reuse?.communication_type || "in_app_chat");
  const [externalCommLink, setExternalCommLink] = useState(reuse?.external_comm_link || "");
  const [requestContactTypes, setRequestContactTypes] = useState<string[]>(reuse?.request_contact_types || []);

  // Calendly
  const [calendlyEnabled, setCalendlyEnabled] = useState(reuse?.calendly_enabled || false);
  const [calendlyLink, setCalendlyLink] = useState(reuse?.calendly_link || "");

  // Pricing & video count modes
  const [pricingMode, setPricingMode] = useState<"fixed" | "flexible">(reuse?.pricing_mode || "fixed");
  const [videosMode, setVideosMode] = useState<"fixed" | "flexible">(reuse?.videos_mode || "fixed");

  useEffect(() => {
    if (!authLoading && !user) navigate("/brand/auth");
  }, [user, authLoading, navigate]);

  const descCharCount = description.length;
  const isDescValid = descCharCount >= 500;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const toggleRegion = (region: string) => {
    if (region === "Worldwide") {
      setSelectedRegions(["Worldwide"]);
      return;
    }
    setSelectedRegions((prev) => {
      const without = prev.filter((r) => r !== "Worldwide");
      if (prev.includes(region)) {
        const result = without.filter((r) => r !== region);
        return result.length === 0 ? ["Worldwide"] : result;
      }
      return [...without, region];
    });
  };

  const toggleContactType = (type: string) => {
    setRequestContactTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isDescValid) {
      toast({ title: "Description too short", description: `Minimum 500 characters required (${descCharCount}/500).`, variant: "destructive" });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: "Select at least one platform", variant: "destructive" });
      return;
    }
    if (!isFreeProduct && (!pricePerVideo || Number(pricePerVideo) <= 0)) {
      toast({ title: "Price required", description: "Enter a price per video or toggle free product.", variant: "destructive" });
      return;
    }
    if (communicationType === "external" && !externalCommLink.trim()) {
      toast({ title: "External link required", description: "Provide a Discord/group link or choose a different communication method.", variant: "destructive" });
      return;
    }
    if (communicationType === "request_contact" && requestContactTypes.length === 0) {
      toast({ title: "Select contact types", description: "Choose at least one contact method to request from creators.", variant: "destructive" });
      return;
    }
    if (calendlyEnabled && !calendlyLink.trim()) {
      toast({ title: "Calendly link required", description: "Provide your Calendly URL or disable call scheduling.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: insertedCampaign, error } = await supabase.from("campaigns").insert({
      brand_user_id: user.id,
      title,
      description,
      platforms: selectedPlatforms,
      is_free_product: isFreeProduct,
      price_per_video: isFreeProduct ? null : Number(pricePerVideo),
      expected_video_count: Number(expectedVideoCount),
      campaign_length_days: campaignLengthDays ? Number(campaignLengthDays) : null,
      requirements: requirements || null,
      target_regions: selectedRegions,
      max_creators: Number(maxCreators) || 10,
      communication_type: communicationType,
      external_comm_link: communicationType === "external" ? externalCommLink.trim() : null,
      request_contact_types: communicationType === "request_contact" ? requestContactTypes : [],
      calendly_enabled: calendlyEnabled,
      calendly_link: calendlyEnabled ? calendlyLink.trim() : null,
      pricing_mode: pricingMode,
      videos_mode: videosMode,
    } as any).select("id, title, max_creators, communication_type").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Only create group chat if using in-app chat and max_creators > 1
      if ((insertedCampaign as any)?.communication_type === "in_app_chat" && ((insertedCampaign as any)?.max_creators || 0) > 1) {
        const { data: groupRoom } = await supabase.from("chat_rooms").insert({
          type: "group",
          campaign_id: insertedCampaign!.id,
          name: insertedCampaign!.title,
        } as any).select("id").single();

        if (groupRoom) {
          await supabase.from("chat_participants").insert({ chat_room_id: groupRoom.id, user_id: user.id } as any);
          await supabase.from("messages").insert({
            chat_room_id: groupRoom.id,
            sender_id: user.id,
            content: `Welcome to the ${insertedCampaign!.title} campaign group chat. This space is for the brand and accepted creators to coordinate together.`,
            pinned: true,
          } as any);
        }
      }

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
                  placeholder="Describe what you're looking for: content style, talking points, dos and don'ts, target audience, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="min-h-[180px]"
                />
                <p className={`text-xs ${isDescValid ? "text-muted-foreground" : "text-destructive"}`}>
                  {descCharCount}/500 characters
                </p>
              </div>

              {/* Platforms (multi-select) */}
              <div className="space-y-3">
                <Label>Platforms * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                <div className="flex flex-wrap gap-3">
                  {platformOptions.map(({ value, label, icon: Icon, color }) => {
                    const selected = selectedPlatforms.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => togglePlatform(value)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${selected ? color : ""}`} />
                        {label}
                      </button>
                    );
                  })}
                </div>
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pricing Model</Label>
                  <RadioGroup value={pricingMode} onValueChange={(v) => setPricingMode(v as "fixed" | "flexible")} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fixed" id="price-fixed" />
                      <Label htmlFor="price-fixed" className="text-sm cursor-pointer">Fixed (same for all creators)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="flexible" id="price-flexible" />
                      <Label htmlFor="price-flexible" className="text-sm cursor-pointer">Flexible (per-creator pricing)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Target Regions (multi-select) */}
              <div className="space-y-3">
                <Label>Target Creator Regions *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto p-1">
                  {regionOptions.map(({ value, label }) => {
                    const selected = selectedRegions.includes(value);
                    const isWorldwide = value === "Worldwide";
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRegion(value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                        } ${isWorldwide ? "col-span-2 sm:col-span-3" : ""}`}
                      >
                        <Checkbox checked={selected} className="pointer-events-none h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Creators */}
              <div className="space-y-2">
                <Label htmlFor="maxCreators">Max Number of Influencers *</Label>
                <Input id="maxCreators" type="number" min="1" max="100" value={maxCreators} onChange={(e) => setMaxCreators(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Campaign will auto-close when all spots are filled</p>
              </div>

              {/* Expected Videos */}
              <div className="space-y-2">
                <Label htmlFor="videoCount">Expected Number of Videos per Creator *</Label>
                <Input id="videoCount" type="number" min="1" max="100" value={expectedVideoCount} onChange={(e) => setExpectedVideoCount(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Video Count Model</Label>
                <RadioGroup value={videosMode} onValueChange={(v) => setVideosMode(v as "fixed" | "flexible")} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fixed" id="videos-fixed" />
                    <Label htmlFor="videos-fixed" className="text-sm cursor-pointer">Fixed (same for all creators)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="flexible" id="videos-flexible" />
                    <Label htmlFor="videos-flexible" className="text-sm cursor-pointer">Flexible (per-creator video count)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Campaign Length */}
              <div className="space-y-2">
                <Label htmlFor="campaignLength">Campaign Length (days)</Label>
                <Input id="campaignLength" type="number" min="1" max="365" placeholder="e.g. 30" value={campaignLengthDays} onChange={(e) => setCampaignLengthDays(e.target.value)} />
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <Label htmlFor="requirements">Additional Requirements</Label>
                <Textarea id="requirements" placeholder="e.g. Must have 1000+ followers, based in Hong Kong, etc." value={requirements} onChange={(e) => setRequirements(e.target.value)} />
              </div>

              {/* Communication Settings */}
              <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Communication Method</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">How would you like to communicate with creators?</p>
                </div>
                <Select value={communicationType} onValueChange={setCommunicationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app_chat">In-app Chat (Group + Private DMs)</SelectItem>
                    <SelectItem value="external">External Link (Discord, Telegram, etc.)</SelectItem>
                    <SelectItem value="request_contact">Request Creator Contact (iMessage, WhatsApp, IG)</SelectItem>
                  </SelectContent>
                </Select>

                {communicationType === "external" && (
                  <div className="space-y-2">
                    <Label>External Chat Link *</Label>
                    <Input placeholder="https://discord.gg/... or any group link" value={externalCommLink} onChange={(e) => setExternalCommLink(e.target.value)} />
                  </div>
                )}

                {communicationType === "request_contact" && (
                  <div className="space-y-2">
                    <Label>Request which contact methods? *</Label>
                    <div className="flex flex-wrap gap-2">
                      {contactTypeOptions.map(({ value, label, icon: Icon }) => {
                        const selected = requestContactTypes.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleContactType(value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Calendly Scheduling */}
              <div className="space-y-4 p-4 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Call Scheduling</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Allow creators to book calls with you via Calendly</p>
                  </div>
                  <Switch checked={calendlyEnabled} onCheckedChange={setCalendlyEnabled} />
                </div>
                {calendlyEnabled && (
                  <div className="space-y-2">
                    <Label>Calendly Link *</Label>
                    <Input placeholder="https://calendly.com/yourbusiness/30min" value={calendlyLink} onChange={(e) => setCalendlyLink(e.target.value)} />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !title || !isDescValid || selectedPlatforms.length === 0}>
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
