import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, ArrowRight, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const businessTypes = [
  "Digital Product",
  "Physical Product",
  "Restaurant / F&B",
  "Fashion & Apparel",
  "Beauty & Skincare",
  "Health & Wellness",
  "Tech & Software",
  "Travel & Hospitality",
  "Real Estate",
  "Education",
  "Entertainment",
  "E-commerce",
  "Agency",
  "Other",
];

const countries = [
  "Hong Kong", "United Kingdom", "United States", "Australia", "Canada",
  "Singapore", "Japan", "South Korea", "China", "Taiwan",
  "Thailand", "Malaysia", "Philippines", "Indonesia", "Vietnam",
  "India", "Germany", "France", "Italy", "Spain",
  "Netherlands", "Sweden", "Denmark", "Norway", "Portugal",
  "Brazil", "Mexico", "UAE", "Saudi Arabia", "New Zealand",
];

const BrandSetup = () => {
  const { user, loading: authLoading, accountType } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [country, setCountry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/brand/auth");
    else if (!authLoading && user && accountType !== "brand") navigate("/auth");
  }, [user, authLoading, accountType, navigate]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/brand-logo.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setLogoUrl(`${publicUrl}?t=${Date.now()}`);
    setUploadingLogo(false);
  };

  const handleNext = () => {
    if (!businessName.trim() || !businessType || !country) {
      toast({ title: "Please fill in required fields", description: "Business name, type and country are required.", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const cleanLogoUrl = logoUrl.split("?")[0];
    const { error } = await supabase.from("brand_profiles").insert({
      user_id: user.id,
      business_name: businessName.trim(),
      business_type: businessType,
      description: description.trim(),
      logo_url: cleanLogoUrl || null,
      country,
      website_url: websiteUrl.trim() || null,
      instagram_url: instagramUrl.trim() || null,
      facebook_url: facebookUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
    });
    if (error) {
      toast({ title: "Setup failed", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    toast({ title: "Brand profile created!" });
    navigate("/brand/dashboard");
    setSaving(false);
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center gap-2 justify-center">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">UGCollab</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground mt-4">Set Up Your Brand</h1>
          <p className="text-muted-foreground mt-1">Step {step} of 2</p>
          <div className="flex gap-2 justify-center mt-3">
            <div className={`h-1.5 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Business Info</CardTitle>
              <CardDescription>Tell us about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo upload */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border bg-secondary flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {uploadingLogo ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Business Logo *</p>
                  <p className="text-xs text-muted-foreground">Click to upload (max 5MB)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your Company Name" />
              </div>

              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger><SelectValue placeholder="Select your business type" /></SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Country *</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your business do?" rows={3} />
              </div>

              <Button onClick={handleNext} className="w-full bg-gradient-coral">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Online Presence</CardTitle>
              <CardDescription>Add your website and social links (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourbusiness.com" />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourbrand" />
              </div>
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/yourbrand" />
              </div>
              <div className="space-y-2">
                <Label>TikTok</Label>
                <Input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@yourbrand" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1 bg-gradient-coral">
                  {saving ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BrandSetup;
