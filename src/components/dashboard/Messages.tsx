import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ChatRoom {
  id: string;
  type: string;
  campaign_id: string | null;
  name: string | null;
  created_at: string;
}

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface RoomMeta {
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageTime: string;
  isGroup: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomMeta, setRoomMeta] = useState<Record<string, RoomMeta>>({});
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch rooms + metadata (other user name for private chats, last message)
  useEffect(() => {
    if (!user) return;
    const fetchRooms = async () => {
      const { data: participantData } = await supabase
        .from("chat_participants")
        .select("chat_room_id")
        .eq("user_id", user.id);

      if (!participantData || participantData.length === 0) {
        setLoading(false);
        return;
      }

      const roomIds = participantData.map((p: any) => p.chat_room_id);
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", roomIds)
        .order("created_at", { ascending: false });

      const fetchedRooms = (roomsData as any) || [];
      setRooms(fetchedRooms);

      // Build metadata for each room
      const meta: Record<string, RoomMeta> = {};
      for (const room of fetchedRooms) {
        // Get last message
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("chat_room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = lastMsgs?.[0];

        if (room.type === "private") {
          // Get the other participant's profile
          const { data: parts } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("chat_room_id", room.id);
          const otherUserId = parts?.find((p: any) => p.user_id !== user.id)?.user_id;
          let displayName = "Chat";
          let avatarUrl: string | null = null;
          if (otherUserId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("user_id", otherUserId)
              .maybeSingle();
            if (profile) {
              displayName = profile.display_name || profile.username || "User";
              avatarUrl = profile.avatar_url;
            }
          }
          meta[room.id] = {
            displayName,
            avatarUrl,
            lastMessage: lastMsg?.content?.replace(/\[CAMPAIGN_INVITE:[^\]]+\]/, "").trim() || "No messages yet",
            lastMessageTime: lastMsg?.created_at || room.created_at,
            isGroup: false,
          };
        } else {
          meta[room.id] = {
            displayName: room.name || "Group Chat",
            avatarUrl: null,
            lastMessage: lastMsg?.content || "No messages yet",
            lastMessageTime: lastMsg?.created_at || room.created_at,
            isGroup: true,
          };
        }
      }

      // Sort rooms by last message time
      fetchedRooms.sort((a: ChatRoom, b: ChatRoom) => {
        const timeA = new Date(meta[a.id]?.lastMessageTime || a.created_at).getTime();
        const timeB = new Date(meta[b.id]?.lastMessageTime || b.created_at).getTime();
        return timeB - timeA;
      });

      setRoomMeta(meta);
      setRooms([...fetchedRooms]);
      setLoading(false);
    };
    fetchRooms();
  }, [user]);

  useEffect(() => {
    if (!selectedRoom || !user) return;

    const fetchMessages = async () => {
      const [msgsRes, partRes] = await Promise.all([
        supabase.from("messages").select("*").eq("chat_room_id", selectedRoom.id).order("created_at", { ascending: true }),
        supabase.from("chat_participants").select("user_id").eq("chat_room_id", selectedRoom.id),
      ]);
      setMessages((msgsRes.data as any) || []);

      if (partRes.data) {
        const userIds = partRes.data.map((p: any) => p.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds);
        if (profiles) {
          const map: Record<string, any> = {};
          profiles.forEach((p: any) => { map[p.user_id] = p; });
          setParticipants(map);
        }
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_room_id=eq.${selectedRoom.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedRoom) return;
    setSending(true);
    await supabase.from("messages").insert({
      chat_room_id: selectedRoom.id,
      sender_id: user.id,
      content: newMessage.trim(),
    } as any);
    setNewMessage("");
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const shouldShowDateSeparator = (idx: number) => {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].created_at).toDateString();
    const curr = new Date(messages[idx].created_at).toDateString();
    return prev !== curr;
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-12rem)]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <MessageCircle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No messages yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Messages will appear here once you're part of a campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] border border-border/50 rounded-xl overflow-hidden bg-card/30">
      {/* Conversation List - left sidebar */}
      <div className={cn(
        "w-80 border-r border-border/50 flex flex-col bg-card/50",
        selectedRoom ? "hidden md:flex" : "flex w-full md:w-80"
      )}>
        <div className="p-4 border-b border-border/30">
          <h2 className="text-lg font-heading font-semibold text-foreground">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => {
            const meta = roomMeta[room.id];
            if (!meta) return null;
            const isSelected = selectedRoom?.id === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                  isSelected && "bg-secondary/80"
                )}
              >
                {meta.isGroup ? (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={meta.avatarUrl || undefined} />
                    <AvatarFallback className="bg-secondary text-sm font-medium">
                      {meta.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{meta.displayName}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                      {formatTime(meta.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{meta.lastMessage}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel - right side */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3 bg-card/50">
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={() => setSelectedRoom(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {roomMeta[selectedRoom.id]?.isGroup ? (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
            ) : (
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={roomMeta[selectedRoom.id]?.avatarUrl || undefined} />
                <AvatarFallback className="bg-secondary text-sm">
                  {(roomMeta[selectedRoom.id]?.displayName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {roomMeta[selectedRoom.id]?.displayName || "Chat"}
              </p>
              <p className="text-xs text-muted-foreground">
                {roomMeta[selectedRoom.id]?.isGroup ? "Campaign group" : "Direct message"}
              </p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" }}>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const sender = participants[msg.sender_id];
              const inviteMatch = msg.content.match(/\[CAMPAIGN_INVITE:([^\]]+)\]/);
              const displayContent = msg.content.replace(/\[CAMPAIGN_INVITE:[^\]]+\]/, "").trim();
              const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id);
              const isConsecutive = idx > 0 && messages[idx - 1].sender_id === msg.sender_id && !shouldShowDateSeparator(idx);

              return (
                <div key={msg.id}>
                  {shouldShowDateSeparator(idx) && (
                    <div className="flex justify-center my-4">
                      <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">
                        {formatDateSeparator(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "flex gap-2 max-w-[85%]",
                    isMe ? "ml-auto justify-end" : "mr-auto",
                    isConsecutive ? "mt-0.5" : "mt-3"
                  )}>
                    {!isMe && (
                      <div className="w-8 shrink-0 flex items-end">
                        {showAvatar ? (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={sender?.avatar_url} />
                            <AvatarFallback className="text-[10px] bg-secondary">
                              {(sender?.display_name || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    )}
                    <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      {!isMe && !isConsecutive && selectedRoom.type === "group" && (
                        <span className="text-[11px] text-primary font-medium mb-0.5 ml-1">
                          {sender?.display_name || sender?.username || "User"}
                        </span>
                      )}
                      <div className={cn(
                        "px-3 py-2 text-sm leading-relaxed max-w-full",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-secondary text-foreground rounded-2xl rounded-bl-md"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{displayContent}</p>
                        {inviteMatch && !isMe && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2 gap-1 text-xs h-7"
                            onClick={() => navigate("/dashboard")}
                          >
                            View Campaign & Apply →
                          </Button>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3 border-t border-border/30 bg-card/50 flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message..."
              className="rounded-full bg-secondary/50 border-border/30 focus-visible:ring-primary/30"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button
              size="icon"
              className="rounded-full h-10 w-10 shrink-0"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground">
          <div className="h-20 w-20 rounded-full border-2 border-border/50 flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8" />
          </div>
          <p className="text-sm font-medium">Select a conversation</p>
          <p className="text-xs mt-1">Choose from your existing chats</p>
        </div>
      )}
    </div>
  );
};

export default Messages;
