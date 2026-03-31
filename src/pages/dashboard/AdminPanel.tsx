import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Eye, EyeOff, Star, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Brands state
  const [brands, setBrands] = useState<any[]>([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandLogo, setNewBrandLogo] = useState("");
  const [newBrandWebsite, setNewBrandWebsite] = useState("");

  // Spotlight state
  const [spotlights, setSpotlights] = useState<any[]>([]);
  const [allCreators, setAllCreators] = useState<any[]>([]);
  const [selectedCreator, setSelectedCreator] = useState("");
  const [spotlightHeadline, setSpotlightHeadline] = useState("");

  // Reviews state
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase.from("user_roles" as any).select("role").eq("user_id", user.id).eq("role", "admin");
      const admin = data && (data as any[]).length > 0;
      setIsAdmin(admin);
      if (admin) {
        fetchBrands();
        fetchSpotlights();
        fetchPendingReviews();
        fetchCreators();
      }
      setLoading(false);
    };
    checkAdmin();
  }, [user]);

  const fetchBrands = async () => {
    const { data } = await supabase.from("homepage_brands" as any).select("*").order("display_order");
    if (data) setBrands(data as any[]);
  };

  const fetchSpotlights = async () => {
    const { data: spots } = await supabase.from("creator_spotlights" as any).select("*").order("display_order");
    if (!spots) return;
    const userIds = (spots as any[]).map(s => s.creator_user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds);
      const enriched = (spots as any[]).map(s => ({
        ...s,
        profile: profiles?.find((p: any) => p.user_id === s.creator_user_id),
      }));
      setSpotlights(enriched);
    } else {
      setSpotlights([]);
    }
  };

  const fetchCreators = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url");
    if (data) setAllCreators(data as any[]);
  };

  const fetchPendingReviews = async () => {
    const { data } = await supabase.from("reviews" as any).select("*").eq("approved", false).order("created_at", { ascending: false });
    if (!data) return;
    const userIds = (data as any[]).map(r => r.user_id);
    const [{ data: profiles }, { data: brandProfiles }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, username").in("user_id", userIds),
      supabase.from("brand_profiles").select("user_id, business_name").in("user_id", userIds),
    ]);
    const enriched = (data as any[]).map(r => ({
      ...r,
      profile: profiles?.find((p: any) => p.user_id === r.user_id),
      brand: brandProfiles?.find((b: any) => b.user_id === r.user_id),
    }));
    setPendingReviews(enriched);
  };

  // Brand actions
  const addBrand = async () => {
    if (!newBrandName.trim()) return;
    await supabase.from("homepage_brands" as any).insert({
      brand_name: newBrandName,
      logo_url: newBrandLogo || null,
      website_url: newBrandWebsite || null,
      display_order: brands.length,
    } as any);
    setNewBrandName("");
    setNewBrandLogo("");
    setNewBrandWebsite("");
    fetchBrands();
    toast({ title: "Brand added" });
  };

  const toggleBrandVisibility = async (id: string, visible: boolean) => {
    await supabase.from("homepage_brands" as any).update({ visible: !visible } as any).eq("id", id);
    fetchBrands();
  };

  const deleteBrand = async (id: string) => {
    await supabase.from("homepage_brands" as any).delete().eq("id", id);
    fetchBrands();
    toast({ title: "Brand removed" });
  };

  // Spotlight actions
  const addSpotlight = async () => {
    if (!selectedCreator) return;
    await supabase.from("creator_spotlights" as any).insert({
      creator_user_id: selectedCreator,
      headline: spotlightHeadline || null,
      display_order: spotlights.length,
    } as any);
    setSelectedCreator("");
    setSpotlightHeadline("");
    fetchSpotlights();
    toast({ title: "Creator added to spotlight" });
  };

  const deleteSpotlight = async (id: string) => {
    await supabase.from("creator_spotlights" as any).delete().eq("id", id);
    fetchSpotlights();
    toast({ title: "Creator removed from spotlight" });
  };

  // Review actions
  const approveReview = async (id: string) => {
    await supabase.from("reviews" as any).update({ approved: true } as any).eq("id", id);
    fetchPendingReviews();
    toast({ title: "Review approved" });
  };

  const rejectReview = async (id: string) => {
    await supabase.from("reviews" as any).delete().eq("id", id);
    fetchPendingReviews();
    toast({ title: "Review rejected" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `brand-logos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) return;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setNewBrandLogo(publicUrl);
    toast({ title: "Logo uploaded" });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <div className="flex items-center justify-center h-64 text-muted-foreground">Admin access required.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">Admin Panel</h1>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="brands">Homepage Brands</TabsTrigger>
          <TabsTrigger value="spotlights">Creator Spotlight</TabsTrigger>
          <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-lg">Add Brand</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Brand name" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} className="bg-secondary" />
              <div className="flex gap-2 items-center">
                <Input placeholder="Logo URL (or upload)" value={newBrandLogo} onChange={(e) => setNewBrandLogo(e.target.value)} className="bg-secondary flex-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" asChild><span>Upload</span></Button>
                </label>
              </div>
              {newBrandLogo && <img src={newBrandLogo} alt="Preview" className="h-12 w-12 rounded-lg object-contain bg-secondary p-1" />}
              <Input placeholder="Website URL (optional)" value={newBrandWebsite} onChange={(e) => setNewBrandWebsite(e.target.value)} className="bg-secondary" />
              <Button onClick={addBrand} disabled={!newBrandName.trim()} className="bg-gradient-coral text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Add Brand
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.brand_name} className="h-10 w-10 rounded-lg object-contain bg-secondary p-1" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-primary">{b.brand_name.charAt(0)}</div>
                )}
                <span className="flex-1 font-medium text-foreground">{b.brand_name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBrandVisibility(b.id, b.visible)}>
                  {b.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBrand(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="spotlights" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-lg">Add Creator to Spotlight</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedCreator}
                onChange={(e) => setSelectedCreator(e.target.value)}
                className="w-full rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select a creator...</option>
                {allCreators.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.display_name || c.username || c.user_id}
                  </option>
                ))}
              </select>
              <Input placeholder="Headline (e.g. Food & Lifestyle Creator)" value={spotlightHeadline} onChange={(e) => setSpotlightHeadline(e.target.value)} className="bg-secondary" />
              <Button onClick={addSpotlight} disabled={!selectedCreator} className="bg-gradient-coral text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Add to Spotlight
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {spotlights.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={s.profile?.avatar_url} />
                  <AvatarFallback className="bg-secondary text-xs">{(s.profile?.display_name || "?").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{s.profile?.display_name || s.profile?.username || "Creator"}</p>
                  {s.headline && <p className="text-xs text-muted-foreground">{s.headline}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSpotlight(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No pending reviews.</div>
          ) : (
            pendingReviews.map((r) => {
              const name = r.brand?.business_name || r.profile?.display_name || r.profile?.username || "User";
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground text-sm">{name}</p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: r.rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{r.reviewer_type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">"{r.content}"</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveReview(r.id)} className="bg-gradient-coral text-primary-foreground gap-1">
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectReview(r.id)} className="gap-1 text-destructive">
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
