import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error, url.searchParams.get("error_description"));
      const state = stateParam ? JSON.parse(atob(stateParam)) : {};
      const redirectUri = state.redirect_uri || "/";
      return Response.redirect(`${redirectUri}?error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 });
    }

    const state = JSON.parse(atob(stateParam));
    const { platform, redirect_uri } = state;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const callbackUrl = `${supabaseUrl}/functions/v1/social-callback`;

    let accessToken: string;
    let userData: {
      platform_username: string;
      platform_user_id: string;
      followers_count: number;
      following_count: number;
      average_views: number;
      video_count: number;
      profile_picture_url: string;
    };

    if (platform === "instagram") {
      // Exchange code for short-lived token
      const metaAppId = Deno.env.get("META_APP_ID")!;
      const metaAppSecret = Deno.env.get("META_APP_SECRET")!;

      const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: metaAppId,
          client_secret: metaAppSecret,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Instagram token exchange failed:", tokenData);
        return Response.redirect(`${redirect_uri}?error=token_exchange_failed`, 302);
      }

      accessToken = tokenData.access_token;

      // Exchange for long-lived token
      const longLivedRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${metaAppSecret}&access_token=${accessToken}`
      );
      const longLivedData = await longLivedRes.json();
      if (longLivedRes.ok && longLivedData.access_token) {
        accessToken = longLivedData.access_token;
      }

      // Fetch user profile
      const profileRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=user_id,username,profile_picture_url,followers_count,follows_count,media_count&access_token=${accessToken}`
      );
      const profile = await profileRes.json();

      userData = {
        platform_username: profile.username || "",
        platform_user_id: profile.user_id?.toString() || tokenData.user_id?.toString() || "",
        followers_count: profile.followers_count || 0,
        following_count: profile.follows_count || 0,
        average_views: 0, // Not available from basic API
        video_count: profile.media_count || 0,
        profile_picture_url: profile.profile_picture_url || "",
      };

    } else if (platform === "facebook") {
      const metaAppId = Deno.env.get("META_APP_ID")!;
      const metaAppSecret = Deno.env.get("META_APP_SECRET")!;

      const tokenRes = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${metaAppSecret}&code=${code}`
      );
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Facebook token exchange failed:", tokenData);
        return Response.redirect(`${redirect_uri}?error=token_exchange_failed`, 302);
      }

      accessToken = tokenData.access_token;

      // Fetch user profile
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,picture.type(large),friends&access_token=${accessToken}`
      );
      const profile = await profileRes.json();

      userData = {
        platform_username: profile.name || "",
        platform_user_id: profile.id || "",
        followers_count: profile.friends?.summary?.total_count || 0,
        following_count: 0,
        average_views: 0,
        video_count: 0,
        profile_picture_url: profile.picture?.data?.url || "",
      };

    } else if (platform === "tiktok") {
      const tiktokClientKey = Deno.env.get("TIKTOK_CLIENT_KEY")!;
      const tiktokClientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET")!;

      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: tiktokClientKey,
          client_secret: tiktokClientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error) {
        console.error("TikTok token exchange failed:", tokenData);
        return Response.redirect(`${redirect_uri}?error=token_exchange_failed`, 302);
      }

      accessToken = tokenData.access_token;
      const openId = tokenData.open_id;

      // Fetch user info
      const profileRes = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,video_count,likes_count",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const profileData = await profileRes.json();
      const profile = profileData.data?.user || {};

      userData = {
        platform_username: profile.display_name || "",
        platform_user_id: openId || profile.open_id || "",
        followers_count: profile.follower_count || 0,
        following_count: profile.following_count || 0,
        average_views: 0,
        video_count: profile.video_count || 0,
        profile_picture_url: profile.avatar_url || "",
      };

    } else {
      return Response.redirect(`${redirect_uri}?error=unsupported_platform`, 302);
    }

    // We need the user's auth token to know who to store this for
    // The state should include the user's JWT or we use a temp token approach
    // For now, we'll store with a pending status and the frontend will claim it
    const tempId = crypto.randomUUID();

    // Store in a temporary way - we'll use the access token to verify ownership
    // The frontend will call an endpoint to claim this connection
    const { error: dbError } = await supabase
      .from("social_connections")
      .upsert({
        id: tempId,
        user_id: state.user_id, // We'll pass this in state
        platform,
        platform_username: userData.platform_username,
        platform_user_id: userData.platform_user_id,
        access_token: accessToken,
        followers_count: userData.followers_count,
        following_count: userData.following_count,
        average_views: userData.average_views,
        video_count: userData.video_count,
        profile_picture_url: userData.profile_picture_url,
      }, { onConflict: "user_id,platform" });

    if (dbError) {
      console.error("DB error:", dbError);
      return Response.redirect(`${redirect_uri}?error=db_error`, 302);
    }

    return Response.redirect(`${redirect_uri}?success=true&platform=${platform}`, 302);

  } catch (error) {
    console.error("Callback error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
