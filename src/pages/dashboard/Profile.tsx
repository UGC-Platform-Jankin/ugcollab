import { useEffect, useState, useRef, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Lock, Save, Camera, Loader2, Instagram, Facebook, Video, Users, Eye, Trash2, Briefcase, Plus, Tag } from "lucide-react";

const CONTENT_TYPES = [
  "Food & Cooking", "Beauty & Skincare", "Fashion & Style", "Tech & Gadgets",
  "Fitness & Health", "Travel & Lifestyle", "Gaming", "Education & Tutorials",
  "Comedy & Entertainment", "Music & Dance", "Pets & Animals", "Home & DIY",
  "Parenting & Family", "Finance & Business", "Art & Photography", "Sports", "Other",
];
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

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSocial, setSavingSocial] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [socialForms, setSocialForms] = useState<Record<string, SocialForm>>({
    instagram: { ...emptyForm },
    facebook: { ...emptyForm },
    tiktok: { ...emptyForm },
  });
  const [socialIds, setSocialIds] = useState<Record<string, string>>({});

  // Past collaborations
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [newCollabBrand, setNewCollabBrand] = useState("");
  const [newCollabDesc, setNewCollabDesc] = useState("");
  const [savingCollab, setSavingCollab] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [profileRes, socialsRes, collabsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("social_connections").select("id, platform, profile_url, followers_count, average_views").eq("user_id", user.id),
        supabase.from("past_collaborations" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (profileRes.data) {
        setUsername(profileRes.data.username || "");
        setDisplayName(profileRes.data.display_name || "");
        setBio(profileRes.data.bio || "");
        setAvatarUrl(profileRes.data.avatar_url || "");
        setContentTypes((profileRes.data as any).content_types || []);
      }
      if (socialsRes.data) {
        const newForms: Record<string, SocialForm> = { instagram: { ...emptyForm }, facebook: { ...emptyForm }, tiktok: { ...emptyForm } };
        const newIds: Record<string, string> = {};
        socialsRes.data.forEach((c: any) => {
          newForms[c.platform] = {
            profile_url: c.profile_url || "",
            followers_count: c.followers_count?.toString() || "",
            average_views: c.average_views?.toString() || "",
          };
          newIds[c.platform] = c.id;
        });
        setSocialForms(newForms);
        setSocialIds(newIds);
      }
      setCollaborations((collabsRes.data as any) || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

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
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploadingAvatar(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "Avatar updated!" });
    setUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username, display_name: displayName, bio, avatar_url: avatarUrl.split("?")[0], content_types: contentTypes })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  const updateSocialField = (platform: string, field: keyof SocialForm, value: string) => {
    setSocialForms((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }));
  };

  const handleSaveSocial = async (platform: string) => {
    if (!user) return;
    setSavingSocial(platform);
    const form = socialForms[platform];
    const row = {
      user_id: user.id,
      platform,
      profile_url: form.profile_url.trim(),
      followers_count: parseInt(form.followers_count) || 0,
      average_views: parseInt(form.average_views) || 0,
    };
    let error;
    if (socialIds[platform]) {
      ({ error } = await supabase.from("social_connections").update(row).eq("id", socialIds[platform]));
    } else {
      const { data, error: e } = await supabase.from("social_connections").insert(row).select("id").single();
      error = e;
      if (data) setSocialIds((prev) => ({ ...prev, [platform]: data.id }));
    }
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} saved!` });
    }
    setSavingSocial(null);
  };

  const handleRemoveSocial = async (platform: string) => {
    if (!socialIds[platform]) return;
    // Prevent removing the last social connection
    const connectedCount = Object.values(socialIds).filter(Boolean).length;
    if (connectedCount <= 1) {
      toast({ title: "Can't remove", description: "You must have at least one social linked.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("social_connections").delete().eq("id", socialIds[platform]);
    if (!error) {
      setSocialForms((prev) => ({ ...prev, [platform]: { ...emptyForm } }));
      setSocialIds((prev) => { const n = { ...prev }; delete n[platform]; return n; });
      toast({ title: "Removed" });
    }
  };

  const handleAddCollaboration = async () => {
    if (!user || !newCollabBrand.trim()) return;
    setSavingCollab(true);
    const { data, error } = await supabase.from("past_collaborations" as any).insert({
      user_id: user.id,
      brand_name: newCollabBrand.trim(),
      description: newCollabDesc.trim() || null,
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCollaborations((prev) => [data, ...prev]);
      setNewCollabBrand("");
      setNewCollabDesc("");
      toast({ title: "Collaboration added!" });
    }
    setSavingCollab(false);
  };

  const handleRemoveCollaboration = async (id: string) => {
    const { error } = await supabase.from("past_collaborations" as any).delete().eq("id", id);
    if (!error) {
      setCollaborations((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Removed" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <Card className="border-border/50 animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your creator profile and account</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your public creator profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-secondary text-lg">
                    {(displayName || username || "U").charAt(0).toUpperCase()}
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
                <p className="text-xs text-muted-foreground">Click to upload (max 5MB)</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell brands about yourself..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Content Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setContentTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      contentTypes.includes(t)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {contentTypes.length === 0 && <p className="text-xs text-destructive">Select at least one category</p>}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Email:</span>
              <span className="text-foreground">{user?.email}</span>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-coral">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Socials */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Socials
            </CardTitle>
            <CardDescription>Add your social media profiles and stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {platforms.map(({ key, name, icon: Icon, placeholder, color, bg }) => {
              const form = socialForms[key];
              const hasExisting = !!socialIds[key];
              const isSaving = savingSocial === key;
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <h4 className="font-medium text-foreground text-sm">{name}</h4>
                  </div>
                  <div>
                    <Input placeholder={placeholder} value={form.profile_url} onChange={(e) => updateSocialField(key, "profile_url", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="Followers" value={form.followers_count} onChange={(e) => updateSocialField(key, "followers_count", e.target.value)} />
                    <Input type="number" placeholder="Avg Views" value={form.average_views} onChange={(e) => updateSocialField(key, "average_views", e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveSocial(key)} disabled={isSaving} size="sm">
                      {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      {hasExisting ? "Update" : "Save"}
                    </Button>
                    {hasExisting && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveSocial(key)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  {key !== "tiktok" && <div className="border-b border-border/30" />}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Past Collaborations */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Past Collaborations
            </CardTitle>
            <CardDescription>Brands you've worked with. Visible on your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {collaborations.length > 0 && (
              <div className="space-y-2">
                {collaborations.map((c: any) => (
                  <div key={c.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.brand_name}</p>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0 h-7 w-7 p-0" onClick={() => handleRemoveCollaboration(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Input
                placeholder="Brand name"
                value={newCollabBrand}
                onChange={(e) => setNewCollabBrand(e.target.value)}
              />
              <Input
                placeholder="Brief description (optional)"
                value={newCollabDesc}
                onChange={(e) => setNewCollabDesc(e.target.value)}
              />
              <Button size="sm" onClick={handleAddCollaboration} disabled={savingCollab || !newCollabBrand.trim()}>
                {savingCollab ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add Collaboration
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline">
              <Lock className="h-4 w-4 mr-1" />
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
