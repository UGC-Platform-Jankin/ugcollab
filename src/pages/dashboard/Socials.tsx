import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Instagram, Facebook, Users, Eye, Video, UserPlus, Link2, Unlink, Loader2 } from "lucide-react";
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
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-400",
  },
  tiktok: {
    name: "TikTok",
    icon: Video,
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-400",
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
  },
};

const Socials = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Handle OAuth callback results
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");

    if (success === "true" && platform) {
      toast({ title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connected!`, description: "Your social account has been linked successfully." });
      fetchConnections();
      setSearchParams({});
    } else if (error) {
      toast({ title: "Connection failed", description: `Error: ${error}`, variant: "destructive" });
      setSearchParams({});
    }
  }, [searchParams]);

  const handleConnect = async (platform: string) => {
    if (!user) return;
    setConnecting(platform);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Not authenticated", variant: "destructive" });
        setConnecting(null);
        return;
      }

      const redirectUri = `${window.location.origin}/dashboard/socials`;

      const response = await supabase.functions.invoke("social-auth", {
        body: null,
        headers: {},
      });

      // Use fetch directly to pass query params
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/social-auth?platform=${platform}&redirect_uri=${encodeURIComponent(redirectUri)}&user_id=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const data = await res.json();

      if (data.error) {
        toast({ title: "Setup required", description: data.error, variant: "destructive" });
        setConnecting(null);
        return;
      }

      if (data.auth_url) {
        // Redirect to OAuth provider
        window.location.href = data.auth_url;
      }
    } catch (err) {
      console.error("Connect error:", err);
      toast({ title: "Connection failed", description: "Something went wrong", variant: "destructive" });
      setConnecting(null);
    }
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
          const isConnecting = connecting === platform;

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
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
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
                      disabled={isConnecting}
                      className="border-border/50"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4 mr-1" />
                      )}
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 mt-8">
        <CardContent className="p-6">
          <h3 className="font-heading font-semibold text-foreground mb-2">Setup Instructions</h3>
          <p className="text-sm text-muted-foreground mb-3">
            To connect your social accounts, the platform needs API credentials from each provider:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li><strong className="text-foreground">Instagram & Facebook:</strong> Create a Meta Developer App at <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="text-primary hover:underline">developers.facebook.com</a></li>
            <li><strong className="text-foreground">TikTok:</strong> Create a TikTok Developer App at <a href="https://developers.tiktok.com" target="_blank" rel="noopener" className="text-primary hover:underline">developers.tiktok.com</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Socials;
