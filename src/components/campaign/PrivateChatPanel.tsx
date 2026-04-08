import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send as SendIcon, Loader2, Paperclip, X, FileText, Download, Play, Pause, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { findOrCreatePrivateRoom, getPrivateRoomsForCampaign } from "@/lib/chat";

interface Props {
  campaignId: string;
  isBrandView?: boolean;
}

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
}

interface RoomParticipant {
  user_id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  business_name?: string;
  logo_url?: string;
}

interface PrivateRoom {
  id: string;
  name: string;
  otherUserId: string;
  otherUser: RoomParticipant;
  lastMessage?: { content: string; created_at: string; sender_id: string } | null;
}

const VoiceMessage = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  };
  const formatDur = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  return (
    <div className={cn("flex items-center gap-2.5 mt-1 px-3 py-2 rounded-2xl min-w-[200px] max-w-[260px]", isMe ? "bg-primary-foreground/10" : "bg-secondary/80")}>
      <audio ref={audioRef} src={url} preload="metadata" onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onTimeUpdate={() => { const a = audioRef.current; if (a && a.duration) setProgress((a.currentTime / a.duration) * 100); }} onEnded={() => { setPlaying(false); setProgress(0); }} />
      <button onClick={toggle} className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors", isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary/10 hover:bg-primary/20")}>
        {playing ? <Pause className={cn("h-4 w-4", isMe ? "text-primary-foreground" : "text-primary")} /> : <Play className={cn("h-4 w-4 ml-0.5", isMe ? "text-primary-foreground" : "text-primary")} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={cn("h-1.5 rounded-full w-full", isMe ? "bg-primary-foreground/20" : "bg-border")}><div className={cn("h-full rounded-full transition-all duration-100", isMe ? "bg-primary-foreground/60" : "bg-primary")} style={{ width: `${progress}%` }} /></div>
        <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>{duration > 0 ? formatDur(playing ? (audioRef.current?.currentTime || 0) : duration) : "0:00"}</p>
      </div>
    </div>
  );
};

const PrivateChatPanel = ({ campaignId, isBrandView = false }: Props) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<PrivateRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [participants, setParticipants] = useState<Record<string, RoomParticipant>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all private rooms for this campaign using single RPC call
  const loadRooms = async () => {
    if (!user) return;
    setLoadingRooms(true);
    try {
      const rooms = await getPrivateRoomsForCampaign(campaignId, user.id);
      setRooms(rooms);
    } catch (e) {
      console.error("[PrivateChatPanel] loadRooms error:", e);
      setRooms([]);
    }
    setLoadingRooms(false);
  };

  // Load messages for a specific room
  const loadMessages = async (roomId: string) => {
    if (!user || !roomId) return;
    setLoadingMessages(true);

    const { data: roomData } = await supabase.from("chat_rooms").select("*").eq("id", roomId).maybeSingle();
    setActiveRoom(roomData);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_room_id", roomId)
      .order("created_at", { ascending: true });
    setMessages((msgs as any[]) || []);

    const { data: parts } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", roomId);
    const userIds = (parts || []).map((p: any) => p.user_id);
    if (userIds.length > 0) {
      const [profiles, brands] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds),
        supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", userIds),
      ]);
      const pMap: Record<string, RoomParticipant> = {};
      (profiles.data || []).forEach((p: any) => { pMap[p.user_id] = p; });
      (brands.data || []).forEach((b: any) => { if (pMap[b.user_id]) pMap[b.user_id] = { ...pMap[b.user_id], ...b }; else pMap[b.user_id] = b; });
      setParticipants(pMap);
    }

    setLoadingMessages(false);
  };

  useEffect(() => {
    if (!user || !campaignId) return;
    loadRooms();
  }, [user, campaignId]);

  // Auto-open a room when creator query param is present (brand view only)
  useEffect(() => {
    if (!user || !campaignId || !isBrandView) return;
    const creatorId = searchParams.get("creator");
    if (!creatorId) return;

    const openRoom = async () => {
      try {
        const roomId = await findOrCreatePrivateRoom(campaignId, user.id, creatorId);
        setActiveRoomId(roomId);
        setSearchParams({}, { replace: true });
      } catch (e) {
        console.error("[PrivateChatPanel] auto-open failed:", e);
      }
    };

    openRoom();
  }, [user, campaignId, isBrandView]);

  // Load messages when active room changes
  useEffect(() => {
    if (!user || !activeRoomId) return;
    loadMessages(activeRoomId);
  }, [user, activeRoomId]);

  // Realtime subscription for the active room
  useEffect(() => {
    if (!activeRoom || !user) return;
    const channel = supabase
      .channel(`private-chat-${activeRoom.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${activeRoom.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id !== user?.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRoom, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!activeRoomId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeRoomId]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachmentFile || !activeRoom || !user) return;
    setSending(true);
    let attachmentUrl: string | null = null;
    let attachmentType: string | null = null;
    let attachmentName: string | null = null;
    if (attachmentFile) {
      const ext = attachmentFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("attachments").upload(path, attachmentFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
        attachmentUrl = urlData.publicUrl;
        attachmentType = attachmentFile.type.startsWith("image/") ? "image" : attachmentFile.type.startsWith("audio/") ? "voice" : "file";
        attachmentName = attachmentFile.name;
      }
    }
    const content = newMessage.trim() || (attachmentFile ? `Sent a file: ${attachmentFile.name}` : "");
    await supabase.from("messages").insert({
      chat_room_id: activeRoom.id,
      sender_id: user.id,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    } as any);
    setNewMessage("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;
    const isMe = msg.sender_id === user?.id;
    if (msg.attachment_type === "image") {
      return <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"><img src={msg.attachment_url} alt={msg.attachment_name || "Image"} className="rounded-lg max-w-[240px] max-h-[200px] object-cover mt-1" /></a>;
    }
    if (msg.attachment_type === "voice") return <VoiceMessage url={msg.attachment_url} isMe={isMe} />;
    return (
      <div className={cn("flex items-center gap-3 mt-1 px-3 py-2.5 rounded-xl text-sm min-w-[200px]", isMe ? "bg-primary-foreground/10" : "bg-secondary/80")}>
        <FileText className={cn("h-5 w-5 shrink-0", isMe ? "text-primary-foreground" : "text-primary")} />
        <p className={cn("text-xs truncate flex-1", isMe ? "text-primary-foreground" : "text-foreground")}>{msg.attachment_name || "File"}</p>
        <a href={msg.attachment_url} download={msg.attachment_name || "file"} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors", isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" : "bg-primary/10 hover:bg-primary/20 text-primary")}>
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  };

  const renderContent = (text: string) => {
    const boldRegex = /\*\*(.+?)\*\*/g;
    const processed = text.replace(boldRegex, (_match, content) => `<strong>${content}</strong>`);
    return <span dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDateSeparator = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const shouldShowDateSeparator = (idx: number) => {
    if (idx === 0) return true;
    const prev = new Date(messages[idx - 1].created_at).toDateString();
    const curr = new Date(messages[idx].created_at).toDateString();
    return prev !== curr;
  };

  return (
    <div className="flex h-[580px] rounded-xl overflow-hidden border border-border/50 bg-card/30">
      {/* Left sidebar — room list */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-border/30">
        <div className="px-3 py-3 border-b border-border/30 bg-card/50">
          <h3 className="text-sm font-semibold text-foreground">Direct Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet. Click Message on a creator to start one.</p>
            </div>
          ) : (
            rooms.map(room => {
              const isActive = room.id === activeRoomId;
              const otherUser = room.otherUser;
              const displayName = otherUser?.display_name || otherUser?.business_name || room.name || "Unknown";
              const lastMsg = room.lastMessage;
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-secondary/50 transition-colors", isActive && "bg-secondary/60")}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={otherUser?.avatar_url || otherUser?.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">{(displayName || "?")[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {new Date(lastMsg.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.content.slice(0, 50)}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — active chat */}
      {activeRoomId ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3 bg-card/50">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">{(activeRoom?.name || "C")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{activeRoom?.otherUser?.display_name || activeRoom?.otherUser?.business_name || activeRoom?.name || "Chat"}</p>
              <p className="text-xs text-muted-foreground">Direct message</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" }}>
            {loadingMessages ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const sender = participants[msg.sender_id];
                const displayContent = msg.content.replace(/\[CAMPAIGN_INVITE:[^\]]+\]/, "").replace(/\[CAMPAIGN_APPLICATION:[^\]]+\]/, "").replace(/\[CAMPAIGN_AGREED:[^\]]+\]/, "").replace(/\[CAMPAIGN_COUNTER:[^\]]+\]/, "").trim();
                const showAvatar = !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id);
                const isConsecutive = idx > 0 && messages[idx - 1].sender_id === msg.sender_id && !shouldShowDateSeparator(idx);
                const isSystemMsg = msg.content.startsWith("📥 ") || msg.content.startsWith("📤 ");

                if (isSystemMsg) {
                  return (
                    <div key={msg.id}>
                      {shouldShowDateSeparator(idx) && (
                        <div className="flex justify-center my-4">
                          <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">{formatDateSeparator(msg.created_at)}</span>
                        </div>
                      )}
                      <div className="flex justify-center my-2">
                        <span className="text-[11px] text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">{msg.content}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id}>
                    {shouldShowDateSeparator(idx) && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">{formatDateSeparator(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn("flex gap-2 max-w-[85%]", isMe ? "ml-auto justify-end" : "mr-auto", isConsecutive ? "mt-0.5" : "mt-3")}>
                      {!isMe && (
                        <div className="w-8 shrink-0 flex items-end">
                          {showAvatar ? (
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={sender?.avatar_url || sender?.logo_url || undefined} />
                              <AvatarFallback className="text-[10px] bg-secondary">{(sender?.display_name || sender?.business_name || "?")[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                          ) : null}
                        </div>
                      )}
                      <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                        {!isMe && !isConsecutive && (
                          <span className="text-[11px] text-primary font-medium mb-0.5 ml-1">{sender?.display_name || sender?.business_name || "User"}</span>
                        )}
                        <div className={cn("px-3 py-2 text-sm leading-relaxed max-w-full", isMe ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md" : "bg-muted text-foreground rounded-2xl rounded-bl-md")}>
                          {displayContent && <p className="whitespace-pre-wrap break-words">{renderContent(displayContent)}</p>}
                          {renderAttachment(msg)}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">{formatTime(msg.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment preview */}
          {attachmentFile && (
            <div className="px-4 py-2 border-t border-border/30 bg-secondary/30 flex items-center gap-3">
              {attachmentPreview ? <img src={attachmentPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center"><FileText className="h-5 w-5 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0"><p className="text-xs text-foreground truncate">{attachmentFile.name}</p></div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setAttachmentFile(null); setAttachmentPreview(null); }}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border/30 bg-card/50 flex items-end gap-2">
            <div className="flex items-center gap-1">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAttachmentFile(file);
                if (file.type.startsWith("image/")) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="rounded-full"
              />
            </div>
            <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={sendMessage} disabled={sending || (!newMessage.trim() && !attachmentFile)}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Select a conversation</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Choose a conversation from the list, or click Message on a creator to start a new chat.</p>
        </div>
      )}
    </div>
  );
};

export default PrivateChatPanel;
