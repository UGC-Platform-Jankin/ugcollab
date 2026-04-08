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
 * Atomically find or create a private chat room between two users for a campaign.
 * Returns the room id. Throws on error.
 */
export async function findOrCreatePrivateRoom(
  campaignId: string,
  userId: string,
  otherUserId: string
): Promise<string> {
  // 1. Find all private rooms for this campaign
  const { data: rooms, error: roomsError } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("type", "private");

  if (roomsError) {
    console.error("[findOrCreatePrivateRoom] step1 roomsError:", roomsError);
    throw roomsError;
  }

  // 2. Check each room's participants
  for (const room of rooms ?? []) {
    const { data: participants, error: partError } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("chat_room_id", room.id);

    if (partError) {
      console.error("[findOrCreatePrivateRoom] step2 partError for room", room.id, partError);
      continue;
    }
    const pIds = (participants ?? []).map((p: any) => p.user_id);
    if (pIds.includes(userId) && pIds.includes(otherUserId)) {
      return room.id; // Room already exists with both participants
    }
  }

  // 3. Create new room via SECURITY DEFINER function (bypasses RLS on chat_rooms)
  const { data: newRoom, error: insertError } = await supabase.rpc("create_chat_room", {
    _campaign_id: campaignId,
    _type: "private",
    _name: null,
  });

  if (insertError) {
    console.error("[findOrCreatePrivateRoom] create_chat_room error:", insertError);
    throw insertError;
  }
  if (!newRoom) throw new Error("Failed to create room");

  // 4. Add both participants via SECURITY DEFINER function (bypasses RLS)
  await supabase.rpc("add_chat_participant", { _room_id: newRoom, _user_id: userId });
  await supabase.rpc("add_chat_participant", { _room_id: newRoom, _user_id: otherUserId });

  return newRoom;
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
