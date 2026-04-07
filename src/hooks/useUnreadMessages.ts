import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UnreadCounts {
  total: number;
  byRoom: Record<string, number>;
}

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState<UnreadCounts>({ total: 0, byRoom: {} });

  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      // Get all rooms user is in
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("chat_room_id")
        .eq("user_id", user.id);

      if (!parts || parts.length === 0) return;

      const roomIds = parts.map((p: any) => p.chat_room_id);

      // Get all messages in those rooms NOT sent by me
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, chat_room_id")
        .in("chat_room_id", roomIds)
        .neq("sender_id", user.id);

      if (!msgs || msgs.length === 0) {
        setUnread({ total: 0, byRoom: {} });
        return;
      }

      const msgIds = msgs.map((m: any) => m.id);

      // Get which of those I've already read
      const { data: reads } = await supabase
        .from("message_reads" as any)
        .select("message_id")
        .eq("user_id", user.id)
        .in("message_id", msgIds);

      const readSet = new Set((reads || []).map((r: any) => r.message_id));

      const byRoom: Record<string, number> = {};
      let total = 0;
      for (const msg of msgs as any[]) {
        if (!readSet.has(msg.id)) {
          byRoom[msg.chat_room_id] = (byRoom[msg.chat_room_id] || 0) + 1;
          total++;
        }
      }

      setUnread({ total, byRoom });
    };

    fetchUnread();

    // Listen for new messages to update count
    const channelName = `unread-counter-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id !== user.id) {
          setUnread((prev) => ({
            total: prev.total + 1,
            byRoom: { ...prev.byRoom, [msg.chat_room_id]: (prev.byRoom[msg.chat_room_id] || 0) + 1 },
          }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reads" }, (payload) => {
        const read = payload.new as any;
        if (read.user_id === user.id) {
          // Refetch to get accurate counts
          fetchUnread();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return unread;
};
