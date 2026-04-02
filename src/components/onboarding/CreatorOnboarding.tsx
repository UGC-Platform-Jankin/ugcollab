import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Instagram, Facebook, Video, ArrowRight, ArrowLeft, Check, Sparkles, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CONTENT_TYPES = [
  "Food & Cooking", "Beauty & Skincare", "Fashion & Style", "Tech & Gadgets",
  "Fitness & Health", "Travel & Lifestyle", "Gaming", "Education & Tutorials",
  "Home & Decor", "Pets & Animals", "Finance & Business", "Entertainment",
  "Parenting & Family", "Sports", "Music", "Art & Crafts",
  "Automotive", "Photography", "Comedy & Humor", "Unboxing & Reviews",
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const COUNTRIES = [
  "Hong Kong", "United Kingdom", "United States", "Australia", "Canada",
  "Singapore", "Malaysia", "Japan", "South Korea", "Thailand",
  "Philippines", "Indonesia", "India", "Germany", "France",
  "Netherlands", "Sweden", "Brazil", "Mexico", "Other",
];

const platforms = [
  { key: "instagram", name: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourhandle", color: "text-pink-400", bg: "bg-pink-500/10" },
  { key: "facebook", name: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourpage", color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "tiktok", name: "TikTok", icon: Video, placeholder: "https://tiktok.com/@yourhandle", color: "text-cyan-400", bg: "bg-cyan-500/10" },
] as const;

interface SocialForm {
  profile_url: string;
  followers_count: string;
  average_views: string;
}

const emptyForm: SocialForm = { profile_url: "", followers_count: "", average_views: "" };

interface Props {
  onComplete: () => void;
}

const CreatorOnboarding = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 1: Basic info
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  // Step 2: Bio
  const [bio, setBio] = useState("");

  // Step 3: Content types
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Step 4: Socials
  const [socialForms, setSocialForms] = useState<Record<string, SocialForm>>({
    instagram: { ...emptyForm },
    facebook: { ...emptyForm },
    tiktok: { ...emptyForm },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploadingAvatar(false);
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return displayName.trim().length > 0 && gender.length > 0 && country.length > 0;
      case 2: return bio.trim().length >= 10;
      case 3: return selectedTypes.length > 0;
      case 4: {
        const hasAnySocial = Object.values(socialForms).some(f => f.profile_url.trim().length > 0);
        return hasAnySocial;
      }
      case 5: return true; // summary step
      default: return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    const cleanAvatarUrl = avatarUrl.split("?")[0];
    await supabase.from("profiles").update({
      username: username.trim() || displayName.trim(),
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: cleanAvatarUrl || null,
      content_types: selectedTypes,
      gender,
      country,
    } as any).eq("user_id", user.id);

    for (const p of platforms) {
      const form = socialForms[p.key];
      if (form.profile_url.trim()) {
        await supabase.from("social_connections").upsert({
          user_id: user.id,
          platform: p.key,
          profile_url: form.profile_url.trim(),
          followers_count: parseInt(form.followers_count) || 0,
          average_views: parseInt(form.average_views) || 0,
        }, { onConflict: "user_id,platform" });
      }
    }

    toast({ title: "Welcome aboard! 🎉", description: "Your profile is all set." });
    setSaving(false);
    onComplete();
  };

  const updateSocialField = (platform: string, field: keyof SocialForm, value: string) => {
    setSocialForms(prev => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));
  };

  const stepTitles = [
    { title: "Let's get to know you", subtitle: "Basic info to get started" },
    { title: "Tell us about yourself", subtitle: "Brands want to know what you're about" },
    { title: "What content do you create?", subtitle: "Select all that apply" },
    { title: "Connect your socials", subtitle: "Link at least one platform" },
    { title: "You're all set!", subtitle: "Review your profile summary" },
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
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-foreground">Complete Your Profile</span>
          </div>

          {/* Progress bar */}
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
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarUrl} />
                        <AvatarFallback className="bg-secondary text-lg">
                          {(displayName || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      >
                        {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Profile Picture</p>
                      <p className="text-xs text-muted-foreground">Optional but recommended</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Display Name *</Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Gender *</Label>
                      <div className="flex flex-wrap gap-2">
                        {GENDERS.map(g => (
                          <button
                            key={g}
                            onClick={() => setGender(g)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                              gender === g
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location *</Label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="I'm a content creator specialising in food reviews and lifestyle content based in Hong Kong..."
                    rows={6}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    {bio.trim().length < 10
                      ? `At least 10 characters (${bio.trim().length}/10)`
                      : <span className="text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Looks great!</span>
                    }
                  </p>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedTypes.includes(t)
                          ? "bg-primary text-primary-foreground border-primary shadow-coral"
                          : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      {selectedTypes.includes(t) && <Check className="inline h-3.5 w-3.5 mr-1" />}
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  {platforms.map(({ key, name, icon: Icon, placeholder, color, bg }) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full ${bg} flex items-center justify-center`}>
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <span className="text-sm font-medium text-foreground">{name}</span>
                      </div>
                      <Input
                        placeholder={placeholder}
                        value={socialForms[key].profile_url}
                        onChange={(e) => updateSocialField(key, "profile_url", e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Followers"
                          value={socialForms[key].followers_count}
                          onChange={(e) => updateSocialField(key, "followers_count", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Avg Views"
                          value={socialForms[key].average_views}
                          onChange={(e) => updateSocialField(key, "average_views", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-secondary text-lg">{(displayName || "U").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-heading font-bold text-foreground">{displayName}</p>
                      {username && <p className="text-sm text-muted-foreground">@{username}</p>}
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        {gender && <span>{gender}</span>}
                        {country && <span>· {country}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTypes.map(t => (
                      <Badge key={t} className="bg-primary/10 text-primary border-0 text-xs">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>
                  <div className="flex gap-3">
                    {platforms.filter(p => socialForms[p.key].profile_url.trim()).map(p => {
                      const Icon = p.icon;
                      return (
                        <div key={p.key} className={`flex items-center gap-1 text-xs ${p.color}`}>
                          <Icon className="h-3.5 w-3.5" /> {p.name}
                        </div>
                      );
                    })}
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
              disabled={!canProceed() || saving}
              className="bg-gradient-coral gap-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Setting up..." : "Let's Go!"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CreatorOnboarding;
