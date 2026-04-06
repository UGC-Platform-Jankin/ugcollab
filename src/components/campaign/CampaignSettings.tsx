import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Calendar, Loader2, XCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  campaignId: string;
}

const CampaignSettings = ({ campaignId }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupChatEnabled, setGroupChatEnabled] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    supabase.from("campaigns").select("group_chat_enabled, posting_schedule_enabled").eq("id", campaignId).single().then(({ data }) => {
      if (data) {
        setGroupChatEnabled((data as any).group_chat_enabled ?? true);
        setScheduleEnabled((data as any).posting_schedule_enabled ?? true);
      }
      setLoading(false);
    });
  }, [campaignId]);

  const handleToggle = async (field: string, value: boolean) => {
    setSaving(true);
    const update: any = {};
    update[field] = value;
    await supabase.from("campaigns").update(update).eq("id", campaignId);
    toast({ title: "Setting updated" });
    setSaving(false);
  };

  const handleEndCampaign = async () => {
    setEnding(true);
    await supabase.from("campaigns").update({ status: "ended" }).eq("id", campaignId);
    toast({ title: "Campaign ended", description: "This campaign has been marked as ended." });
    setEnding(false);
    navigate("/brand/campaigns");
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground">Group Chat</Label>
                <p className="text-xs text-muted-foreground">When off, only private messages between you and each creator are available</p>
              </div>
            </div>
            <Switch
              checked={groupChatEnabled}
              onCheckedChange={(v) => {
                setGroupChatEnabled(v);
                handleToggle("group_chat_enabled", v);
              }}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground">Posting Schedule</Label>
                <p className="text-xs text-muted-foreground">Show a posting schedule calendar to accepted creators</p>
              </div>
            </div>
            <Switch
              checked={scheduleEnabled}
              onCheckedChange={(v) => {
                setScheduleEnabled(v);
                handleToggle("posting_schedule_enabled", v);
              }}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-foreground">End Campaign</Label>
                <p className="text-xs text-muted-foreground">Permanently end this campaign. This cannot be undone.</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={ending}>
                  {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : "End Campaign"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently end the campaign. All creators will be notified and no new applications will be accepted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    End Campaign
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignSettings;
