import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Instagram, Facebook, Users, Eye, Video, UserPlus, Link2, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SocialConnection {
  id: string;
  platform: string;
  platform_username: string | null;
  followers_count: number | null;
  following_count: number | null;
  average_views: number | null;
  video_count: number | null;
  profile_picture_url: string | null;
}

const platformConfig = {
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "from-pink-500 to-purple-500",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-400",
  },
  tiktok: {
    name: "TikTok",
    icon: Video,
    color: "from-cyan-400 to-pink-500",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-400",
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
};

const Socials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id);
    setConnections(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const connectedPlatforms = connections.map((c) => c.platform);

  const handleConnect = (platform: string) => {
    toast({
      title: `Connect ${platformConfig[platform as keyof typeof platformConfig]?.name}`,
      description: "Social media API integration requires developer app setup. This will be enabled once API credentials are configured.",
    });
  };

  const handleDisconnect = async (connectionId: string) => {
    const { error } = await supabase
      .from("social_connections")
      .delete()
      .eq("id", connectionId);
    if (error) {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    } else {
      toast({ title: "Disconnected" });
      fetchConnections();
    }
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-foreground">Connected Socials</h1>
        <p className="text-muted-foreground mt-1">Link your social media accounts to showcase your reach</p>
      </div>

      <div className="grid gap-6">
        {(Object.keys(platformConfig) as Array<keyof typeof platformConfig>).map((platform) => {
          const config = platformConfig[platform];
          const connection = connections.find((c) => c.platform === platform);
          const Icon = config.icon;

          return (
            <Card key={platform} className="border-border/50">
              <CardContent className="p-6">
                {connection ? (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={connection.profile_picture_url || ""} />
                        <AvatarFallback className={config.bgColor}>
                          <Icon className={`h-6 w-6 ${config.textColor}`} />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-foreground">
                            {connection.platform_username || config.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">Connected</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{formatNumber(connection.followers_count)} followers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>{formatNumber(connection.following_count)} following</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{formatNumber(connection.average_views)} avg views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Video className="h-3.5 w-3.5" />
                            <span>{formatNumber(connection.video_count)} videos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${config.textColor}`} />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">{config.name}</h3>
                        <p className="text-sm text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(platform)}
                      className="border-border/50"
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Socials;
