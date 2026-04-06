import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Video, FileText, Flame, BookOpen, ExternalLink, Download } from "lucide-react";

const categories = [
  { key: "example_video", label: "Example Videos", icon: Video, color: "text-pink-500", bg: "bg-pink-500/10" },
  { key: "script", label: "Scripts / Briefs", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "warmup_instructions", label: "Account Warmup Instructions", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "other", label: "Other Resources", icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" },
];

interface Props {
  campaignId: string;
}

const CreatorResources = ({ campaignId }: Props) => {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("campaign_resources" as any)
        .select("*")
        .eq("campaign_id", campaignId)
        .order("display_order");
      setResources((data as any) || []);
      setLoading(false);
    };
    load();
  }, [campaignId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (resources.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <BookOpen className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No resources uploaded by the brand yet.</p>
        </CardContent>
      </Card>
    );
  }

  const grouped = categories.map(cat => ({
    ...cat,
    items: resources.filter(r => r.type === cat.key),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(cat => {
        const Icon = cat.icon;
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`h-8 w-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${cat.color}`} />
              </div>
              <h3 className="font-heading font-bold text-foreground text-sm">{cat.label}</h3>
              <span className="text-xs text-muted-foreground">({cat.items.length})</span>
            </div>
            <div className="space-y-2 pl-[42px]">
              {cat.items.map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-4">
                    <p className="font-medium text-sm text-foreground">{r.title}</p>
                    {r.content && (
                      <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">{r.content}</p>
                    )}
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline font-medium"
                      >
                        {r.type === "example_video" ? (
                          <><Video className="h-3 w-3" /> Watch Video</>
                        ) : (
                          <><Download className="h-3 w-3" /> Download File</>
                        )}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreatorResources;
