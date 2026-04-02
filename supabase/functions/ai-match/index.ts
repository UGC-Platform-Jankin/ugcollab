import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, profile, items } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "creator_to_campaigns") {
      systemPrompt = `You are a matching engine for a UGC creator platform. Given a creator profile and campaigns, return a JSON array of objects with "id" (campaign id) and "match" (integer 50-100).

MATCHING CRITERIA (weight each roughly equally):
1. Bio/Experience alignment: Does the creator's bio, interests, and past collaborations align with the campaign's description and requirements?
2. Platform overlap: Does the creator have accounts on the platforms the campaign targets?
3. Country/Region overlap: Is the creator based in a region the campaign targets?
4. Content style fit: Based on bio and experience, would this creator produce relevant content?

RULES:
- Minimum match is 50%. If there's barely any alignment, return 50.
- Maximum is 95% (never 100%).
- If bio is empty/missing, base score on platform and country overlap — start at 55-65%.
- If platforms overlap AND country matches, minimum 65%.
- Return ONLY a valid JSON array, no markdown, no explanation.`;

      userPrompt = `Creator Profile:
- Name: ${profile.display_name || "Unknown"}
- Bio: ${profile.bio || "No bio provided"}
- Country: ${profile.country || "Unknown"}
- Platforms: ${(profile.platforms || []).join(", ") || "None connected"}
- Followers: ${profile.followers || 0}
- Past collaborations: ${(profile.past_collabs || []).map((c: any) => c.brand_name).join(", ") || "None"}

Campaigns:
${items.map((c: any) => `- ID: ${c.id}, Title: "${c.title}", Description: "${(c.description || "").slice(0, 300)}", Platforms: ${(c.platforms || []).join(", ")}, Regions: ${(c.target_regions || []).join(", ")}, Requirements: "${(c.requirements || "").slice(0, 200)}"`).join("\n")}`;
    } else if (type === "campaign_to_creators") {
      systemPrompt = `You are a matching engine for a UGC brand platform. Given a brand's campaigns and a list of creators, return a JSON array of objects with "id" (creator user_id) and "match" (integer 50-100).

MATCHING CRITERIA:
1. Bio/Experience: Does the creator's bio and past work suggest they'd be a good fit for the brand's campaigns?
2. Platform overlap: Does the creator have accounts on platforms the campaigns target?
3. Country/Region: Is the creator in a relevant region?
4. Follower count: Does the creator have a meaningful audience?

RULES:
- Minimum match is 50%.
- Maximum is 95%.
- If creator has no bio, base on platform + country — start at 55-65%.
- Return ONLY a valid JSON array, no markdown.`;

      userPrompt = `Brand Campaigns:
${(profile.campaigns || []).map((c: any) => `- "${c.title}": ${(c.description || "").slice(0, 200)}, Platforms: ${(c.platforms || []).join(", ")}, Regions: ${(c.target_regions || []).join(", ")}`).join("\n")}

Creators:
${items.map((c: any) => `- ID: ${c.user_id}, Name: "${c.display_name || "Unknown"}", Bio: "${(c.bio || "No bio").slice(0, 200)}", Country: ${c.country || "Unknown"}, Platforms: ${(c.platforms || []).join(", ")}, Followers: ${c.followers || 0}, Past collabs: ${(c.past_collabs || []).join(", ") || "None"}`).join("\n")}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    let matches;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      matches = JSON.parse(cleaned);
      // Enforce minimum 50%
      matches = matches.map((m: any) => ({ ...m, match: Math.max(50, Math.min(95, m.match)) }));
    } catch {
      console.error("Failed to parse AI response:", content);
      matches = [];
    }

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
