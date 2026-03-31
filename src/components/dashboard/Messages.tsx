import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, Users, ArrowLeft } from "lucide-react";

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

const Messages = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      setRooms((roomsData as any) || []);
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

      // Fetch profiles of participants
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

    // Realtime subscription
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

  const getRoomDisplayName = (room: ChatRoom) => {
    if (room.type === "group") return `📢 ${room.name || "Group Chat"}`;
    return `💬 ${room.name || "Private Chat"}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (rooms.length === 0) {
    return (
      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No messages yet</h3>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Messages will appear here once you're part of a campaign.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Room List */}
      <div className={`w-72 shrink-0 space-y-1 overflow-y-auto ${selectedRoom ? "hidden md:block" : ""}`}>
        <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Conversations</h3>
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => setSelectedRoom(room)}
            className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
              selectedRoom?.id === room.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
            }`}
          >
            <p className="font-medium truncate">{getRoomDisplayName(room)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{room.type === "group" ? "Campaign group" : "Direct message"}</p>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col border border-border/50 rounded-lg overflow-hidden bg-card/50">
          <div className="p-3 border-b border-border/50 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedRoom(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="font-medium text-foreground text-sm">{getRoomDisplayName(selectedRoom)}</p>
              <p className="text-xs text-muted-foreground">{selectedRoom.type === "group" ? <><Users className="h-3 w-3 inline" /> Group</> : "Private"}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              const sender = participants[msg.sender_id];
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : ""}`}>
                  {!isMe && (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={sender?.avatar_url} />
                      <AvatarFallback className="text-xs bg-secondary">{(sender?.display_name || "?").charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${isMe ? "text-right" : ""}`}>
                    {!isMe && <p className="text-xs text-muted-foreground mb-0.5">{sender?.display_name || "User"}</p>}
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border/50 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground text-sm">
          Select a conversation
        </div>
      )}
    </div>
  );
};

export default Messages;
