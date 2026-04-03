import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User, Lock, Save, Camera, Loader2, Instagram, Facebook, Video, Eye,
  Trash2, Briefcase, Plus, Tag, MapPin, ExternalLink, Edit2, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CONTENT_TYPES = [
  "Food & Cooking", "Beauty & Skincare", "Fashion & Style", "Tech & Gadgets",
  "Fitness & Health", "Travel & Lifestyle", "Gaming", "Education & Tutorials",
  "Comedy & Entertainment", "Music & Dance", "Pets & Animals", "Home & DIY",
  "Parenting & Family", "Finance & Business", "Art & Photography", "Sports", "Other",
];

interface SocialForm {
  profile_url: string;
  followers_count: string;
  average_views: string;
}

const platforms = [
  { key: "instagram", name: "Instagram", icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-400", bg: "bg-blue-500/10", placeholder: "https://facebook.com/yourpage" },
  { key: "tiktok", name: "TikTok", icon: Video, color: "text-cyan-400", bg: "bg-cyan-500/10", placeholder: "https://tiktok.com/@yourhandle" },
] as const;

const emptyForm: SocialForm = { profile_url: "", followers_count: "", average_views: "" };

const formatNumber = (num: number | null) => {
  if (!num) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingSocial, setSavingSocial] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSocialsOpen, setEditSocialsOpen] = useState(false);
  const [editPasswordOpen, setEditPasswordOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [socialForms, setSocialForms] = useState<Record<string, SocialForm>>({
    instagram: { ...emptyForm }, facebook: { ...emptyForm }, tiktok: { ...emptyForm },
  });
  const [socialIds, setSocialIds] = useState<Record<string, string>>({});

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
        supabase.from("past_collaborations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (profileRes.data) {
        setUsername(profileRes.data.username || "");
        setDisplayName(profileRes.data.display_name || "");
        setBio(profileRes.data.bio || "");
        setAvatarUrl(profileRes.data.avatar_url || "");
        setContentTypes(profileRes.data.content_types || []);
        setGender(profileRes.data.gender || "");
        setCountry(profileRes.data.country || "");
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
      .update({ username, display_name: displayName, bio, avatar_url: avatarUrl.split("?")[0], content_types: contentTypes, gender, country })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      setEditDialogOpen(false);
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
      user_id: user.id, platform,
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
    const { data, error } = await supabase.from("past_collaborations").insert({
      user_id: user.id, brand_name: newCollabBrand.trim(), description: newCollabDesc.trim() || null,
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
    const { error } = await supabase.from("past_collaborations").delete().eq("id", id);
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
      setEditPasswordOpen(false);
    }
    setChangingPassword(false);
  };

  const connectedSocials = platforms.filter(p => !!socialIds[p.key]);
  const totalFollowers = connectedSocials.reduce((sum, p) => sum + (parseInt(socialForms[p.key].followers_count) || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Your Creator Profile</h1>
          <p className="text-muted-foreground text-sm mt-0.5">This is how brands see you</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left Column - Profile Card */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <Avatar className="h-28 w-28 ring-4 ring-border">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-secondary text-2xl font-bold">
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

              <h2 className="text-xl font-heading font-bold text-foreground">{displayName || username || "Creator"}</h2>
              {country && <p className="text-sm text-muted-foreground mt-0.5">{country}</p>}

              {/* Social Stats Row */}
              {connectedSocials.length > 0 && (
                <div className="flex items-center gap-4 mt-3">
                  {connectedSocials.map(p => {
                    const Icon = p.icon;
                    const count = parseInt(socialForms[p.key].followers_count) || 0;
                    return (
                      <a
                        key={p.key}
                        href={socialForms[p.key].profile_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Icon className={`h-4 w-4 ${p.color}`} />
                        <span className="font-semibold text-foreground">{formatNumber(count)}</span>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Content Types */}
              {contentTypes.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                  {contentTypes.map(t => (
                    <Badge key={t} variant="secondary" className="text-[11px] font-medium uppercase tracking-wide">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" className="mt-4 gap-1.5 rounded-full" onClick={() => setEditDialogOpen(true)}>
                <Edit2 className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Connect Card */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Connect
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditSocialsOpen(true)}>
                  <Edit2 className="h-3 w-3" /> Edit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
                  <p className="text-sm text-foreground">{user?.email}</p>
                </div>
              </div>
              {connectedSocials.map(p => {
                const Icon = p.icon;
                const url = socialForms[p.key].profile_url;
                const handle = url ? url.replace(/https?:\/\/(www\.)?(instagram|facebook|tiktok)\.com\/?(@)?/i, "@") : "";
                return (
                  <a key={p.key} href={url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <div className={`h-8 w-8 rounded-full ${p.bg} flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${p.color}`} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{p.name}</p>
                      <p className="text-sm text-primary group-hover:underline">{handle || p.name}</p>
                    </div>
                  </a>
                );
              })}
            </CardContent>
          </Card>

          {/* Demographics */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Demographics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {country && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Location</p>
                    <p className="text-sm text-foreground">{country}</p>
                  </div>
                </div>
              )}
              {gender && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Gender</p>
                    <p className="text-sm text-foreground">{gender}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Bio */}
          {bio && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Social Stats */}
          {connectedSocials.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Social Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {connectedSocials.map(p => {
                    const followers = parseInt(socialForms[p.key].followers_count) || 0;
                    const avgViews = parseInt(socialForms[p.key].average_views) || 0;
                    const Icon = p.icon;
                    return (
                      <div key={p.key} className="space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Icon className={`h-4 w-4 ${p.color}`} />
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/50 text-center">
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Followers</p>
                          <p className="text-lg font-bold text-foreground">{formatNumber(followers)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/50 text-center">
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Avg Views</p>
                          <p className="text-lg font-bold text-foreground">{formatNumber(avgViews)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past Collaborations */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Past Collaborations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Input placeholder="Brand name" value={newCollabBrand} onChange={(e) => setNewCollabBrand(e.target.value)} />
                <Input placeholder="Brief description (optional)" value={newCollabDesc} onChange={(e) => setNewCollabDesc(e.target.value)} />
                <Button size="sm" onClick={handleAddCollaboration} disabled={savingCollab || !newCollabBrand.trim()}>
                  {savingCollab ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add Collaboration
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditPasswordOpen(true)}>
                <Lock className="h-3.5 w-3.5" /> Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gender</Label>
                <div className="flex flex-wrap gap-2">
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map(g => (
                    <button key={g} type="button" onClick={() => setGender(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        gender === g ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                      }`}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <select value={country} onChange={(e) => setCountry(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Select country</option>
                  {["Hong Kong", "United Kingdom", "United States", "Australia", "Canada", "Singapore", "Malaysia", "Japan", "South Korea", "Thailand", "Philippines", "Indonesia", "India", "Germany", "France", "Netherlands", "Sweden", "Brazil", "Mexico", "Other"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Content Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(t => (
                  <button key={t} type="button"
                    onClick={() => setContentTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      contentTypes.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
                    }`}>{t}</button>
                ))}
              </div>
              {contentTypes.length === 0 && <p className="text-xs text-destructive">Select at least one category</p>}
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-gradient-coral">
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Socials Dialog */}
      <Dialog open={editSocialsOpen} onOpenChange={setEditSocialsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Your Socials</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
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
                  <Input placeholder={placeholder} value={form.profile_url} onChange={(e) => updateSocialField(key, "profile_url", e.target.value)} />
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={editPasswordOpen} onOpenChange={setEditPasswordOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full">
              <Lock className="h-4 w-4 mr-1" /> {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
