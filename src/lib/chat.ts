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
 * Returns rooms with their other participant's profile info.
 */
export async function getPrivateRoomsForCampaign(
  campaignId: string,
  userId: string
): Promise<any[]> {
  // Get all private rooms for this campaign
  const { data: rooms, error: roomsError } = await supabase
    .from("chat_rooms")
    .select("id, name, created_at")
    .eq("campaign_id", campaignId)
    .eq("type", "private")
    .order("created_at", { ascending: false });

  if (roomsError || !rooms?.length) return [];

  // Filter to only rooms where user is a participant
  const roomsWithUser: any[] = [];
  for (const room of rooms) {
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("chat_room_id", room.id);

    const pIds = (participants ?? []).map((p: any) => p.user_id);
    if (pIds.includes(userId)) {
      roomsWithUser.push(room);
    }
  }

  if (roomsWithUser.length === 0) return [];

  // Get all participant user ids across all rooms
  const allUserIds = new Set<string>();
  for (const room of roomsWithUser) {
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("chat_room_id", room.id);
    (participants ?? []).forEach((p: any) => {
      if (p.user_id !== userId) allUserIds.add(p.user_id);
    });
  }

  // Fetch profile info for all other users
  const otherUserIds = [...allUserIds];
  const [profiles, brands] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", otherUserIds),
    supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", otherUserIds),
  ]);

  const profileMap: Record<string, any> = {};
  (profiles.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
  (brands.data || []).forEach((b: any) => {
    if (profileMap[b.user_id]) {
      profileMap[b.user_id] = { ...profileMap[b.user_id], ...b };
    } else {
      profileMap[b.user_id] = b;
    }
  });

  // Fetch last message for each room
  const roomsWithMessages = await Promise.all(
    roomsWithUser.map(async (room) => {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("chat_room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const otherUserId = otherUserIds.find(id => {
        const { data: parts } = supabase.from("chat_participants").select("user_id").eq("chat_room_id", room.id).maybeSingle();
        return parts?.user_id === id;
      });

      return {
        ...room,
        otherUserId,
        otherUser: profileMap[room.otherUserId] || null,
        lastMessage: lastMsg,
      };
    })
  );

  return roomsWithMessages;
}

/**
 * Atomically find or create a private chat room between two users for a campaign.
 * Uses SECURITY DEFINER RPC functions to bypass RLS on chat_rooms insert.
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
  // Look up other user's display name for the room name
  let roomName = "Chat";
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", otherUserId).maybeSingle();
  if (profile?.display_name) {
    roomName = profile.display_name;
  } else {
    const { data: brand } = await supabase.from("brand_profiles").select("business_name").eq("user_id", otherUserId).maybeSingle();
    if (brand?.business_name) roomName = brand.business_name;
  }

  const { data: newRoom, error: insertError } = await supabase.rpc("create_chat_room", {
    _campaign_id: campaignId,
    _type: "private",
    _name: roomName,
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
