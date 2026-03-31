import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Lock, Save, Camera, Loader2, Instagram, Facebook, Video, Users, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialConnection {
  platform: string;
  profile_url: string | null;
  followers_count: number | null;
  average_views: number | null;
}

const socialIcons: Record<string, { icon: typeof Instagram; color: string; bg: string }> = {
  instagram: { icon: Instagram, color: "text-pink-400", bg: "bg-pink-500/10" },
  facebook: { icon: Facebook, color: "text-blue-400", bg: "bg-blue-500/10" },
  tiktok: { icon: Video, color: "text-cyan-400", bg: "bg-cyan-500/10" },
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [socials, setSocials] = useState<SocialConnection[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const [profileRes, socialsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("social_connections").select("platform, profile_url, followers_count, average_views").eq("user_id", user.id),
      ]);
      if (profileRes.data) {
        setUsername(profileRes.data.username || "");
        setDisplayName(profileRes.data.display_name || "");
        setBio(profileRes.data.bio || "");
        setAvatarUrl(profileRes.data.avatar_url || "");
      }
      setSocials((socialsRes.data as SocialConnection[]) || []);
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
      .update({ username, display_name: displayName, bio, avatar_url: avatarUrl.split("?")[0] })
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
    setSaving(false);
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

        {/* Socials Overview */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Connected Socials
            </CardTitle>
            <CardDescription>Your linked social accounts and stats</CardDescription>
          </CardHeader>
          <CardContent>
            {socials.length === 0 ? (
              <p className="text-sm text-muted-foreground">No socials added yet. Go to the <a href="/dashboard/socials" className="text-primary hover:underline">Socials page</a> to add them.</p>
            ) : (
              <div className="space-y-3">
                {socials.map((s) => {
                  const cfg = socialIcons[s.platform] || { icon: ExternalLink, color: "text-muted-foreground", bg: "bg-muted" };
                  const Icon = cfg.icon;
                  return (
                    <div key={s.platform} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{s.platform}</p>
                          {s.profile_url && (
                            <a href={s.profile_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline truncate max-w-[200px] block">
                              {s.profile_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 35)}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{formatNumber(s.followers_count)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{formatNumber(s.average_views)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
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
