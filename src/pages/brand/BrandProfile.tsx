import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Camera, Loader2, Lock, Instagram, Facebook, Video, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, BarChart3, Megaphone, Users, User } from "lucide-react";

const businessTypes = [
  "Digital Product", "Physical Product", "Restaurant / F&B", "E-commerce",
  "Fashion & Apparel", "Beauty & Skincare", "Health & Fitness", "Technology",
  "Education", "Travel & Hospitality", "Entertainment", "Real Estate", "Other",
];

const countries = [
  "Hong Kong", "United Kingdom", "United States", "Singapore", "Australia",
  "Canada", "Japan", "South Korea", "Malaysia", "Thailand", "Philippines",
  "Indonesia", "Vietnam", "Taiwan", "China", "India", "Germany", "France", "Other",
];

const BrandProfile = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [country, setCountry] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/brand/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("brand_profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (!data) {
        navigate("/brand/setup");
        return;
      }
      setBusinessName(data.business_name || "");
      setBusinessType(data.business_type || "");
      setDescription(data.description || "");
      setLogoUrl(data.logo_url || "");
      setCountry(data.country || "");
      setWebsiteUrl(data.website_url || "");
      setInstagramUrl(data.instagram_url || "");
      setFacebookUrl(data.facebook_url || "");
      setTiktokUrl(data.tiktok_url || "");
      setLoadingProfile(false);
    });
  }, [user, navigate]);

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
    await supabase.from("brand_profiles").update({ logo_url: publicUrl }).eq("user_id", user.id);
    toast({ title: "Logo updated!" });
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("brand_profiles").update({
      business_name: businessName,
      business_type: businessType,
      description,
      logo_url: logoUrl.split("?")[0],
      country,
      website_url: websiteUrl,
      instagram_url: instagramUrl,
      facebook_url: facebookUrl,
      tiktok_url: tiktokUrl,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    } else {
      toast({ title: "Profile updated!" });
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

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-lg bg-gradient-coral animate-pulse" />
      </div>
    );
  }

  const navItems = [
    { label: "Overview", icon: BarChart3, path: "/brand/dashboard" },
    { label: "Campaigns", icon: Megaphone, path: "/brand/campaigns/new" },
    { label: "Find Creators", icon: Users, path: "/brand/dashboard" },
    { label: "Profile", icon: User, path: "/brand/profile", active: true },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">UGC Zone</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Brand Portal</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={() => signOut().then(() => navigate("/"))}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-foreground">Brand Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your business details</p>
          </div>

          <div className="space-y-6 max-w-2xl">
            {/* Business Info */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Business Information</CardTitle>
                <CardDescription>Your public brand profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="h-20 w-20 rounded-xl border border-border overflow-hidden bg-secondary flex items-center justify-center">
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
                    <p className="text-sm font-medium text-foreground">Brand Logo</p>
                    <p className="text-xs text-muted-foreground">Click to upload (max 5MB)</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Type</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {businessTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your business..." rows={4} />
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Email:</span>
                  <span className="text-foreground">{user?.email}</span>
                </div>

                <Button onClick={handleSave} disabled={saving} className="bg-gradient-coral">
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Online Presence</CardTitle>
                <CardDescription>Your website and social media links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Website</Label>
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourbusiness.com" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                  <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/yourbrand" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
                  <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/yourbrand" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Video className="h-3.5 w-3.5" /> TikTok</Label>
                  <Input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@yourbrand" />
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-coral">
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Links"}
                </Button>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline">
                  <Lock className="h-4 w-4 mr-1" />
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BrandProfile;
