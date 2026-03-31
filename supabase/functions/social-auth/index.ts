import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const platform = url.searchParams.get("platform");
    const redirectUri = url.searchParams.get("redirect_uri");

    const userId = url.searchParams.get("user_id");

    if (!platform || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing platform or redirect_uri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the base URL for the callback
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    const callbackUrl = `${supabaseUrl}/functions/v1/social-callback`;

    // Encode state with platform and frontend redirect
    const state = btoa(JSON.stringify({ platform, redirect_uri: redirectUri, user_id: userId }));

    let authUrl: string;

    if (platform === "instagram") {
      const instaAppId = Deno.env.get("INSTAGRAM_APP_ID");
      if (!instaAppId) {
        return new Response(
          JSON.stringify({ error: "INSTAGRAM_APP_ID not configured." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const scopes = "instagram_business_basic,instagram_business_manage_messages";
      authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${instaAppId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=${scopes}&state=${state}`;
    } else if (platform === "facebook") {
      const metaAppId = Deno.env.get("META_APP_ID");
      if (!metaAppId) {
        return new Response(
          JSON.stringify({ error: "META_APP_ID not configured." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const scopes = "public_profile,pages_show_list,pages_read_engagement";
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scopes}&state=${state}&response_type=code`;
    } else if (platform === "tiktok") {
      const tiktokClientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
      if (!tiktokClientKey) {
        return new Response(
          JSON.stringify({ error: "TIKTOK_CLIENT_KEY not configured. Please add your TikTok Client Key as a secret." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scopes = "user.info.basic,user.info.stats,video.list";
      const csrfState = crypto.randomUUID();
      authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokClientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported platform" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ auth_url: authUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in social-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
