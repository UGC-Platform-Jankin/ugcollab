import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Eye, Loader2 } from "lucide-react";

const BrandCampaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignTab, setCampaignTab] = useState("active");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("campaigns")
      .select("*")
      .eq("brand_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCampaigns((data as any) || []);
        setLoading(false);
      });
  }, [user]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const endedCampaigns = campaigns.filter((c) => c.status !== "active");

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="border-border/50 animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderCampaignList = (list: any[]) => {
    if (list.length === 0) {
      return (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No campaigns here</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {list.map((c) => (
          <Card
            key={c.id}
            className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/brand/campaigns/${c.id}`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">{c.title}</h3>
                <div className="flex gap-2 mt-1 items-center flex-wrap">
                  <Badge
                    variant={c.status === "active" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {c.status}
                  </Badge>
                  {c.platforms?.map((p: string) => (
                    <Badge key={p} variant="outline" className="text-xs capitalize">
                      {p}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    Max {c.max_creators || 10} creators
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-heading font-bold text-foreground">Your Campaigns</h2>
        <p className="text-sm text-muted-foreground">View applications and manage your campaigns</p>
      </div>
      <Tabs value={campaignTab} onValueChange={setCampaignTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({activeCampaigns.length})</TabsTrigger>
          <TabsTrigger value="ended">Ended ({endedCampaigns.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderCampaignList(activeCampaigns)}</TabsContent>
        <TabsContent value="ended">{renderCampaignList(endedCampaigns)}</TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandCampaigns;
