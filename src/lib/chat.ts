import { supabase } from "@/integrations/supabase/client";

/**
 * Find (without creating) a private chat room between two users for a campaign.
 * Returns room id or null if not found.
 */
export async function findPrivateRoom(
  campaignId: string,
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const { data: rooms, error: roomsError } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("type", "private");

  if (roomsError || !rooms?.length) return null;

  for (const room of rooms) {
    const { data: participants, error: partError } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("chat_room_id", room.id);

    if (partError) continue;
    const pIds = (participants ?? []).map((p: any) => p.user_id);
    if (pIds.includes(userId) && pIds.includes(otherUserId)) {
      return room.id;
    }
  }
  return null;
}

/**
 * Get all private chat rooms for a campaign that the user participates in.
 * Uses SECURITY DEFINER RPC to bypass RLS for both brand and creator.
 */
export async function getPrivateRoomsForCampaign(
  campaignId: string,
  userId: string
): Promise<any[]> {
  const { data, error } = await (supabase.rpc as any)("get_private_rooms", {
    _campaign_id: campaignId,
    _user_id: userId,
  });

  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.room_id,
    name: r.room_name,
    otherUserId: r.other_user_id,
    otherUser: {
      display_name: r.other_display_name,
      avatar_url: r.other_avatar_url,
      business_name: r.other_business_name,
    },
    lastMessage: r.last_msg_content ? {
      content: r.last_msg_content,
      created_at: r.last_msg_at,
    } : null,
  }));
}

/**
 * Atomically find or create a private chat room — name auto-set from other user's profile.
 * Uses a single SECURITY DEFINER RPC call to bypass all RLS issues.
 * Returns the room id. Throws on error.
 */
export async function findOrCreatePrivateRoom(
  campaignId: string,
  userId: string,
  otherUserId: string
): Promise<string> {
  const { data, error } = await (supabase.rpc as any)("find_or_create_private_room", {
    _campaign_id: campaignId,
    _user_id: userId,
    _other_user_id: otherUserId,
  });

  if (error) {
    console.error("[findOrCreatePrivateRoom] error:", error);
    throw error;
  }

  return data as string;
}

/**
 * Send a message to a chat room. Returns the message id.
 */
export async function sendChatMessage(
  roomId: string,
  senderId: string,
  content: string
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    chat_room_id: roomId,
    sender_id: senderId,
    content,
  } as any);

  if (error) throw error;
}

/**
 * Ensure a user is a participant in a room. Idempotent.
 */
export async function ensureRoomParticipant(
  roomId: string,
  userId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("chat_participants")
    .select("id")
    .eq("chat_room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("chat_participants").insert({
      chat_room_id: roomId,
      user_id: userId,
    } as any);
  }
}
