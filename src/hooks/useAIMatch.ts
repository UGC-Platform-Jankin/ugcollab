import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MatchResult {
  id: string;
  match: number;
}

export const useAIMatch = (
  type: "creator_to_campaigns" | "campaign_to_creators",
  profile: any,
  items: any[],
  enabled: boolean = true
) => {
  const [matches, setMatches] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !profile || items.length === 0) return;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-match", {
          body: { type, profile, items },
        });

        if (error) {
          console.error("AI match error:", error);
          setLoading(false);
          return;
        }

        const matchMap: Record<string, number> = {};
        (data?.matches || []).forEach((m: MatchResult) => {
          matchMap[m.id] = m.match;
        });
        setMatches(matchMap);
      } catch (e) {
        console.error("AI match error:", e);
      }
      setLoading(false);
    };

    fetchMatches();
  }, [type, enabled, items.length]);

  return { matches, loading };
};
