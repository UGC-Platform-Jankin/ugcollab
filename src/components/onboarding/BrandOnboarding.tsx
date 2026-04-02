import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Building2, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const businessTypes = [
  "Digital Product", "Physical Product", "Restaurant / F&B", "Fashion & Apparel",
  "Beauty & Skincare", "Health & Wellness", "Tech & Software", "Travel & Hospitality",
  "Real Estate", "Education", "Entertainment", "E-commerce", "Agency", "Other",
];

const countries = [
  "Hong Kong", "United Kingdom", "United States", "Australia", "Canada",
  "Singapore", "Japan", "South Korea", "China", "Taiwan",
  "Thailand", "Malaysia", "Philippines", "Indonesia", "Vietnam",
  "India", "Germany", "France", "Italy", "Spain",
  "Netherlands", "Sweden", "Denmark", "Norway", "Portugal",
  "Brazil", "Mexico", "UAE", "Saudi Arabia", "New Zealand",
];

interface Props {
  onComplete: () => void;
}

const BrandOnboarding = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

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

  const canProceed = () => {
    switch (step) {
      case 1: return businessName.trim().length > 0 && businessType && country;
      case 2: return description.trim().length >= 10;
      case 3: return true; // socials optional for brands
      default: return false;
    }
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
    toast({ title: "Welcome aboard! 🎉", description: "Your brand profile is all set." });
    setSaving(false);
    onComplete();
  };

  const stepTitles = [
    { title: "About your business", subtitle: "Let's get the basics down" },
    { title: "Describe your brand", subtitle: "Help creators understand what you do" },
    { title: "Online presence", subtitle: "Add your website and socials (optional)" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-coral flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-foreground">Set Up Your Brand</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-coral rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: step > i ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step} of {totalSteps}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-heading font-bold text-foreground mb-1">
                {stepTitles[step - 1].title}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">{stepTitles[step - 1].subtitle}</p>

              {step === 1 && (
                <div className="space-y-5">
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
                      <p className="text-sm font-medium text-foreground">Business Logo</p>
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
                        {businessTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell creators what your brand is about, what products/services you offer, and what kind of content you're looking for..."
                    rows={6}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.trim().length < 10
                      ? `At least 10 characters (${description.trim().length}/10)`
                      : <span className="text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Looks great!</span>
                    }
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
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
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : <div />}

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="bg-gradient-coral gap-1"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={saving}
              className="bg-gradient-coral gap-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Setting up..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BrandOnboarding;
