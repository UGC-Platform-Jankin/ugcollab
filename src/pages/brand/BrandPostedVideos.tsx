import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink, Link2 } from "lucide-react";

const BrandPostedVideos = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [data, setData] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: camps } = await supabase.from("campaigns").select("id, title").eq("brand_user_id", user.id);
      setCampaigns(camps || []);

      const campIds = (camps || []).map((c: any) => c.id);
      if (campIds.length === 0) { setLoading(false); return; }

      // Get accepted submissions with posted links
      const { data: subs } = await supabase
        .from("video_submissions" as any)
        .select("*")
        .in("campaign_id", campIds)
        .eq("status", "accepted");

      const acceptedSubs = (subs as any) || [];
      if (acceptedSubs.length === 0) { setLoading(false); return; }

      const subIds = acceptedSubs.map((s: any) => s.id);
      const { data: links } = await supabase.from("posted_video_links" as any).select("*").in("submission_id", subIds);

      // Merge links into submissions
      const linkMap: Record<string, any[]> = {};
      ((links as any) || []).forEach((l: any) => {
        if (!linkMap[l.submission_id]) linkMap[l.submission_id] = [];
        linkMap[l.submission_id].push(l);
      });

      const enriched = acceptedSubs
        .filter((s: any) => linkMap[s.id]?.length > 0)
        .map((s: any) => ({ ...s, _links: linkMap[s.id] || [] }));

      setData(enriched);

      // Profiles
      const creatorIds = [...new Set(enriched.map((s: any) => s.creator_user_id))] as string[];
      if (creatorIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", creatorIds);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = selectedCampaign === "all" ? data : data.filter((s: any) => s.campaign_id === selectedCampaign);
  const getCampaignTitle = (id: string) => campaigns.find(c => c.id === id)?.title || "Campaign";

  // Group by campaign then creator
  const grouped: Record<string, Record<string, any[]>> = {};
  filtered.forEach((s: any) => {
    const campTitle = getCampaignTitle(s.campaign_id);
    if (!grouped[campTitle]) grouped[campTitle] = {};
    const creatorName = profiles[s.creator_user_id]?.display_name || profiles[s.creator_user_id]?.username || "Creator";
    if (!grouped[campTitle][creatorName]) grouped[campTitle][creatorName] = [];
    grouped[campTitle][creatorName].push(s);
  });

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Posted Videos</h1>
        <p className="text-muted-foreground mt-1">View posted video links by campaign and creator</p>
      </div>

      <div className="mb-6">
        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No posted video links yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([campTitle, creators]) => (
            <div key={campTitle}>
              <h2 className="text-lg font-heading font-bold text-foreground mb-3">{campTitle}</h2>
              <div className="space-y-3">
                {Object.entries(creators).map(([creatorName, subs]) => (
                  <Card key={creatorName} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profiles[subs[0].creator_user_id]?.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-xs">{creatorName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-foreground">{creatorName}</p>
                      </div>
                      {subs.map((sub: any) => (
                        <div key={sub.id} className="mb-3 last:mb-0">
                          <p className="text-sm font-medium text-foreground mb-1">{sub.title}</p>
                          <div className="space-y-1">
                            {sub._links.map((l: any) => (
                              <div key={l.id} className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">{l.platform}</Badge>
                                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex items-center gap-1">
                                  {l.url} <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandPostedVideos;
