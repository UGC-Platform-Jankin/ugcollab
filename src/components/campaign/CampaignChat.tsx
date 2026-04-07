import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send as SendIcon, Loader2, Paperclip, Image, Mic, X, FileText, Download, Play, Pause, Users, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Check as CheckIcon, CheckCheck } from "lucide-react";

interface Props {
  campaignId: string;
  roomType: "group" | "private";
  isBrandView?: boolean;
  specificCreatorId?: string | null;
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
  pinned?: boolean;
}

interface Participant {
  user_id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  business_name?: string;
  logo_url?: string;
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

const CampaignChat = ({ campaignId, roomType, isBrandView = false, specificCreatorId = null }: Props) => {
  const { user } = useAuth();
  const [room, setRoom] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user || !campaignId) return;
    loadRoom();
  }, [user, campaignId, roomType, specificCreatorId]);

  const loadRoom = async () => {
    setLoading(true);
    let { data: roomData } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("type", roomType)
      .maybeSingle();

    // Auto-create room + add user as participant
    if (!roomData) {
      if (roomType === "group") {
        const { data: camp } = await supabase.from("campaigns").select("title, brand_user_id").eq("id", campaignId).maybeSingle();
        const { data: newRoom } = await supabase.from("chat_rooms").insert({ type: "group", campaign_id: campaignId, name: camp?.title || "Group Chat" } as any).select().single();
        roomData = newRoom;
        if (roomData) {
          await supabase.from("chat_participants").insert({ chat_room_id: roomData.id, user_id: user.id } as any);
          if (camp?.brand_user_id && user.id !== camp.brand_user_id) {
            await supabase.from("chat_participants").insert({ chat_room_id: roomData.id, user_id: camp.brand_user_id } as any);
          }
          await supabase.from("messages").insert({ chat_room_id: roomData.id, sender_id: user.id, content: `✅ ${user.id === camp?.brand_user_id ? "Brand" : "Creator"} joined the chat!`, pinned: false } as any);
        }
      }
    } else {
      // Ensure current user is a participant in existing room
      const { data: existingPart } = await supabase.from("chat_participants").select("id").eq("chat_room_id", roomData.id).eq("user_id", user.id).maybeSingle();
      if (!existingPart) {
        await supabase.from("chat_participants").insert({ chat_room_id: roomData.id, user_id: user.id } as any);
        await supabase.from("messages").insert({ chat_room_id: roomData.id, sender_id: user.id, content: `✅ User joined the chat!` } as any);
      }
    }

    // For private chats: find or create a per-creator private room
    if (roomType === "private") {
      if (!user) { setLoading(false); return; }
      console.log("[loadRoom] PRIVATE — campaignId:", campaignId, "specificCreatorId:", specificCreatorId, "user.id:", user.id);

      // Get campaign and all accepted creators
      const { data: camp } = await supabase
        .from("campaigns")
        .select("brand_user_id, title")
        .eq("id", campaignId)
        .maybeSingle();
      console.log("[loadRoom] camp:", camp);

      if (!camp) { setLoading(false); return; }

      // Find the other user's ID (the conversation partner)
      let otherUserId: string | null = null;
      if (specificCreatorId) {
        otherUserId = specificCreatorId;
        console.log("[loadRoom] using specificCreatorId:", otherUserId);
      } else if (user.id === camp.brand_user_id) {
        // Brand viewing: pick first accepted creator
        const { data: apps } = await supabase
          .from("campaign_applications")
          .select("creator_user_id")
          .eq("campaign_id", campaignId)
          .eq("status", "accepted")
          .limit(1);
        otherUserId = apps?.[0]?.creator_user_id || null;
      } else {
        // Creator viewing: the other party is the brand
        otherUserId = camp.brand_user_id;
      }

      if (!otherUserId) { setLoading(false); return; }
      console.log("[loadRoom] otherUserId:", otherUserId);

      // Look for existing private room that has both participants
      const { data: existingRooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("type", "private")
        .limit(10);

      // Find room where both current user and other user are participants
      let targetRoom = null;
      if (existingRooms && existingRooms.length > 0) {
        for (const room of existingRooms) {
          const { data: parts } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("chat_room_id", room.id);
          const userIds = (parts || []).map((p: any) => p.user_id);
          if (userIds.includes(user.id) && userIds.includes(otherUserId)) {
            targetRoom = room;
            break;
          }
        }
      }

      if (!targetRoom) {
        // Get creator display name for room name
        let roomName = "Private Chat";
        if (user.id === camp.brand_user_id && otherUserId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", otherUserId)
            .maybeSingle();
          roomName = `Chat with ${profile?.display_name || "Creator"}`;
        } else {
          const { data: brand } = await supabase
            .from("brand_profiles")
            .select("business_name")
            .eq("user_id", camp.brand_user_id)
            .maybeSingle();
          roomName = `Chat with ${brand?.business_name || "Brand"}`;
        }

        const { data: newRoom } = await supabase
          .from("chat_rooms")
          .insert({
            campaign_id: campaignId,
            type: "private",
            name: roomName,
          } as any)
          .select()
          .single();

        targetRoom = newRoom;

        if (targetRoom) {
          // Add participants
          await supabase.from("chat_participants").insert([
            { chat_room_id: targetRoom.id, user_id: user.id },
            { chat_room_id: targetRoom.id, user_id: otherUserId },
          ]);

          // Auto-send welcome message from the brand if creator just joined
          if (user.id === camp.brand_user_id) {
            // Brand created the room - send brand's welcome
            const { data: brandProfile } = await supabase
              .from("brand_profiles")
              .select("business_name")
              .eq("user_id", user.id)
              .maybeSingle();
            await supabase.from("messages").insert({
              chat_room_id: targetRoom.id,
              sender_id: user.id,
              content: `👋 Welcome! This is your private chat for the campaign "${camp.title}". Feel free to discuss details here.`,
            } as any);
          } else {
            // Creator joined - send a friendly auto message from brand
            await supabase.from("messages").insert({
              chat_room_id: targetRoom.id,
              sender_id: camp.brand_user_id,
              content: `👋 Welcome to the campaign "${camp.title}"! Excited to work with you. Feel free to ask any questions here.`,
            } as any);
          }
        }
      }

      roomData = targetRoom;
      console.log("[loadRoom] roomData set to:", roomData);
    }

    console.log("[loadRoom] final roomData:", roomData);
    if (!roomData) { setLoading(false); return; }
    setRoom(roomData);

    // Load messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_room_id", roomData.id)
      .order("created_at", { ascending: true });
    setMessages((msgs as any[]) || []);

    // Load participants
    const { data: parts } = await supabase.from("chat_participants").select("user_id").eq("chat_room_id", roomData.id);
    const userIds = (parts || []).map((p: any) => p.user_id);
    if (userIds.length > 0) {
      const [profiles, brands] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds),
        supabase.from("brand_profiles").select("user_id, business_name, logo_url").in("user_id", userIds),
      ]);
      const pMap: Record<string, Participant> = {};
      (profiles.data || []).forEach((p: any) => { pMap[p.user_id] = p; });
      (brands.data || []).forEach((b: any) => { if (pMap[b.user_id]) pMap[b.user_id] = { ...pMap[b.user_id], ...b }; else pMap[b.user_id] = b; });
      setParticipants(pMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!room) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`campaign-chat-${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${room.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id !== user?.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room, user]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !attachmentFile || !room || !user) return;
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
    const { error } = await supabase.from("messages").insert({
      chat_room_id: room.id,
      sender_id: user.id,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    } as any);
    if (!error) setNewMessage("");
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

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No group chat yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isBrandView
            ? "The group chat will appear here once creators join your campaign."
            : "The group chat will appear here once you join the campaign."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-border/50 bg-card/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3 bg-card/50">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{(room.name || "G")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{room.name || (roomType === "group" ? "Group Chat" : "Chat")}</p>
          <p className="text-xs text-muted-foreground">{roomType === "group" ? `${Object.keys(participants).length} members` : "Direct message"}</p>
        </div>
        {roomType === "group" && (
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setMembersOpen(true)}>
            <Users className="h-3.5 w-3.5" /> Members
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)" }}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, idx) => {
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
                  {!isMe && !isConsecutive && roomType === "group" && (
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
        })}
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

      {/* Members Sheet */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[360px]">
          <SheetHeader>
            <SheetTitle className="text-base">Group Members</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {Object.entries(participants).map(([uid, p]) => {
              const isMe = uid === user?.id;
              const isBrand = !!(p as any).business_name;
              return (
                <div key={uid} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={p.avatar_url || (p as any).logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {(p.display_name || (p as any).business_name || "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.display_name || (p as any).business_name || "User"}
                      {isMe && <span className="text-primary ml-1 text-xs">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isBrand ? "Brand" : "Creator"}
                    </p>
                  </div>
                </div>
              );
            })}
            {Object.keys(participants).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CampaignChat;
