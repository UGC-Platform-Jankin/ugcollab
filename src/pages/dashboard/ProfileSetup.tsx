import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Instagram, Facebook, Video, ArrowRight, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialForm {
  profile_url: string;
  followers_count: string;
  average_views: string;
}

const platforms = [
  { key: "instagram", name: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourhandle", color: "text-pink-400", bg: "bg-pink-500/10" },
  { key: "facebook", name: "Facebook", icon: Facebook, placeholder: "https://facebook.com/yourpage", color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "tiktok", name: "TikTok", icon: Video, placeholder: "https://tiktok.com/@yourhandle", color: "text-cyan-400", bg: "bg-cyan-500/10" },
] as const;

const emptyForm: SocialForm = { profile_url: "", followers_count: "", average_views: "" };

const ProfileSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [socialForms, setSocialForms] = useState<Record<string, SocialForm>>({
    instagram: { ...emptyForm },
    facebook: { ...emptyForm },
    tiktok: { ...emptyForm },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

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

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const cleanAvatarUrl = avatarUrl.split("?")[0];
    await supabase.from("profiles").update({
      username, display_name: displayName, bio, avatar_url: cleanAvatarUrl,
    }).eq("user_id", user.id);
    setStep(2);
    setSaving(false);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    for (const p of platforms) {
      const form = socialForms[p.key];
      if (form.profile_url.trim() || form.followers_count || form.average_views) {
        await supabase.from("social_connections").upsert({
          user_id: user.id,
          platform: p.key,
          profile_url: form.profile_url.trim(),
          followers_count: parseInt(form.followers_count) || 0,
          average_views: parseInt(form.average_views) || 0,
        }, { onConflict: "user_id,platform" });
      }
    }
    toast({ title: "Profile setup complete!" });
    navigate("/dashboard");
    setSaving(false);
  };

  const updateSocialField = (platform: string, field: keyof SocialForm, value: string) => {
    setSocialForms((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-lg font-heading font-bold text-foreground">UGCollab</span>
          <h1 className="text-2xl font-heading font-bold text-foreground mt-4">Set Up Your Profile</h1>
          <p className="text-muted-foreground mt-1">Step {step} of 2</p>
          <div className="flex gap-2 justify-center mt-3">
            <div className={`h-1.5 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-1.5 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                  <p className="text-xs text-muted-foreground">Click to upload</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell brands about yourself..." rows={3} />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-gradient-coral">
                {saving ? "Saving..." : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Your Socials</CardTitle>
              <CardDescription>Add your social media links and stats (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {platforms.map(({ key, name, icon: Icon, placeholder, color, bg }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{name}</span>
                  </div>
                  <Input placeholder={placeholder} value={socialForms[key].profile_url} onChange={(e) => updateSocialField(key, "profile_url", e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" placeholder="Followers" value={socialForms[key].followers_count} onChange={(e) => updateSocialField(key, "followers_count", e.target.value)} />
                    <Input type="number" placeholder="Avg Views" value={socialForms[key].average_views} onChange={(e) => updateSocialField(key, "average_views", e.target.value)} />
                  </div>
                  {key !== "tiktok" && <div className="border-b border-border/30 pt-2" />}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1">
                  Skip for now
                </Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1 bg-gradient-coral">
                  {saving ? "Saving..." : "Finish Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;