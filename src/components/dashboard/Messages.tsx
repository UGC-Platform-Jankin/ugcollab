import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, ArrowLeft, Users, Paperclip, Image, Mic, X, FileText, CheckCheck, Check as CheckIcon, Download, Play, Pause } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import ChatProfilePanel from "./ChatProfilePanel";

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
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  pinned?: boolean;
}

interface RoomMeta {
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageTime: string;
  isGroup: boolean;
  unreadCount: number;
}

// WhatsApp-style voice message player
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

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-2.5 mt-1 px-3 py-2 rounded-2xl min-w-[200px] max-w-[260px]",
      isMe ? "bg-primary-foreground/10" : "bg-secondary/80"
    )}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button
        onClick={toggle}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary/10 hover:bg-primary/20"
        )}
      >
        {playing ? (
          <Pause className={cn("h-4 w-4", isMe ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <Play className={cn("h-4 w-4 ml-0.5", isMe ? "text-primary-foreground" : "text-primary")} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div className={cn("h-1.5 rounded-full w-full", isMe ? "bg-primary-foreground/20" : "bg-border")}>
          <div
            className={cn("h-full rounded-full transition-all duration-100", isMe ? "bg-primary-foreground/60" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {duration > 0 ? formatDur(playing ? (audioRef.current?.currentTime || 0) : duration) : "0:00"}
        </p>
      </div>
    </div>
  );
};

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBrandView = location.pathname.startsWith("/brand");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomMeta, setRoomMeta] = useState<Record<string, RoomMeta>>({});
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readReceipts, setReadReceipts] = useState<Record<string, string[]>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Fetch rooms + metadata
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

      // Fetch unread counts: messages not sent by me, not in message_reads
      const { data: allMsgs } = await supabase
        .from("messages")
        .select("id, chat_room_id")
        .in("chat_room_id", roomIds)
        .neq("sender_id", user.id);

      let readMsgIds = new Set<string>();
      if (allMsgs && allMsgs.length > 0) {
        const msgIds = allMsgs.map((m: any) => m.id);
        const { data: reads } = await supabase
          .from("message_reads" as any)
          .select("message_id")
          .eq("user_id", user.id)
          .in("message_id", msgIds);
        (reads || []).forEach((r: any) => readMsgIds.add(r.message_id));
      }

      const unreadByRoom: Record<string, number> = {};
      (allMsgs || []).forEach((m: any) => {
        if (!readMsgIds.has(m.id)) {
          unreadByRoom[m.chat_room_id] = (unreadByRoom[m.chat_room_id] || 0) + 1;
        }
      });

      const meta: Record<string, RoomMeta> = {};
      for (const room of fetchedRooms) {
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("chat_room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = lastMsgs?.[0];

        if (room.type === "private") {
          const { data: parts } = await supabase
            .from("chat_participants")
            .select("user_id")
            .eq("chat_room_id", room.id);

          let displayName = "Chat";
          let avatarUrl: string | null = null;

          // Get ALL other participants (not me)
          const otherUserIds = (parts || []).filter((p: any) => p.user_id !== user.id).map((p: any) => p.user_id);
          
          if (otherUserIds.length > 0) {
            const otherUserId = otherUserIds[0];
            const [{ data: profile }, { data: brand }] = await Promise.all([
              supabase.from("profiles").select("display_name, username, avatar_url").eq("user_id", otherUserId).maybeSingle(),
              supabase.from("brand_profiles").select("business_name, logo_url").eq("user_id", otherUserId).maybeSingle(),
            ]);

            // If I'm a brand viewing this, show the creator's name
            // If I'm a creator viewing this, show the brand's name
            if (isBrandView) {
              displayName = profile?.display_name || profile?.username || "Creator";
              avatarUrl = profile?.avatar_url || null;
            } else {
              displayName = brand?.business_name || profile?.display_name || profile?.username || "User";
              avatarUrl = brand?.logo_url || profile?.avatar_url || null;
            }
          } else if (room.campaign_id) {
            // Fallback: same user testing - resolve via campaign
            const { data: campaign } = await supabase.from("campaigns").select("brand_user_id, title").eq("id", room.campaign_id).maybeSingle();
            if (campaign) {
              if (isBrandView) {
                displayName = room.name || campaign.title || "Chat";
              } else {
                const { data: brand } = await supabase.from("brand_profiles").select("business_name, logo_url").eq("user_id", campaign.brand_user_id).maybeSingle();
                displayName = brand?.business_name || "Brand";
                avatarUrl = brand?.logo_url || null;
              }
            }
          }

          meta[room.id] = {
            displayName,
            avatarUrl,
            lastMessage: lastMsg?.content?.replace(/\[CAMPAIGN_INVITE:[^\]]+\]/, "").trim() || "No messages yet",
            lastMessageTime: lastMsg?.created_at || room.created_at,
            isGroup: false,
            unreadCount: unreadByRoom[room.id] || 0,
          };
        } else {
          meta[room.id] = {
            displayName: room.name || "Group Chat",
            avatarUrl: null,
            lastMessage: lastMsg?.content || "No messages yet",
            lastMessageTime: lastMsg?.created_at || room.created_at,
            isGroup: true,
            unreadCount: unreadByRoom[room.id] || 0,
          };
        }
      }

      fetchedRooms.sort((a: ChatRoom, b: ChatRoom) => {
        const unreadA = meta[a.id]?.unreadCount || 0;
        const unreadB = meta[b.id]?.unreadCount || 0;
        // Unread chats first, then by last message time
        if (unreadA > 0 && unreadB === 0) return -1;
        if (unreadB > 0 && unreadA === 0) return 1;
        const timeA = new Date(meta[a.id]?.lastMessageTime || a.created_at).getTime();
        const timeB = new Date(meta[b.id]?.lastMessageTime || b.created_at).getTime();
        return timeB - timeA;
      });

      setRoomMeta(meta);
      setRooms([...fetchedRooms]);
      setLoading(false);
    };
    fetchRooms();
  }, [isBrandView, user]);

  // Fetch messages + participants + read receipts when room selected
  useEffect(() => {
    if (!selectedRoom || !user) return;

    const fetchMessages = async () => {
      const [msgsRes, partRes] = await Promise.all([
        supabase.from("messages").select("*").eq("chat_room_id", selectedRoom.id).order("created_at", { ascending: true }),
        supabase.from("chat_participants").select("user_id").eq("chat_room_id", selectedRoom.id),
      ]);
      const msgs = (msgsRes.data as any) || [];
      setMessages(msgs);

      if (partRes.data) {
        const userIds = partRes.data.map((p: any) => p.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", userIds);
        if (profiles) {
          const map: Record<string, any> = {};
          profiles.forEach((p: any) => { map[p.user_id] = p; });
          setParticipants(map);
        }
      }

      // Fetch read receipts
      if (msgs.length > 0) {
        const msgIds = msgs.map((m: any) => m.id);
        const { data: reads } = await supabase.from("message_reads" as any).select("message_id, user_id").in("message_id", msgIds);
        if (reads) {
          const readMap: Record<string, string[]> = {};
          (reads as any[]).forEach((r: any) => {
            if (!readMap[r.message_id]) readMap[r.message_id] = [];
            readMap[r.message_id].push(r.user_id);
          });
          setReadReceipts(readMap);
        }
      }

      // Mark unread messages as read
      const unreadMsgs = msgs.filter((m: any) => m.sender_id !== user.id);
      if (unreadMsgs.length > 0) {
        const existingReads = new Set<string>();
        const { data: myReads } = await supabase.from("message_reads" as any).select("message_id").eq("user_id", user.id).in("message_id", unreadMsgs.map((m: any) => m.id));
        (myReads || []).forEach((r: any) => existingReads.add(r.message_id));
        const toInsert = unreadMsgs.filter((m: any) => !existingReads.has(m.id)).map((m: any) => ({ message_id: m.id, user_id: user.id }));
        if (toInsert.length > 0) {
          await supabase.from("message_reads" as any).insert(toInsert);
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
        const newMsg = payload.new as Message;
        setMessages((prev) => [...prev, newMsg]);
        // Auto mark as read if not from me
        if (newMsg.sender_id !== user.id) {
          supabase.from("message_reads" as any).insert({ message_id: newMsg.id, user_id: user.id }).then();
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "message_reads",
      }, (payload) => {
        const read = payload.new as any;
        setReadReceipts((prev) => ({
          ...prev,
          [read.message_id]: [...(prev[read.message_id] || []), read.user_id],
        }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return;
    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setAttachmentPreview(url);
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setAttachmentFile(file);
        setAttachmentPreview(null);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      // Microphone permission denied
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setMediaRecorder(null);
  };

  const uploadAttachment = async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("audio/")) type = "voice";
    return { url: publicUrl, type, name: file.name };
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachmentFile) || !user || !selectedRoom) return;
    setSending(true);

    let attachment: { url: string; type: string; name: string } | null = null;
    if (attachmentFile) {
      attachment = await uploadAttachment(attachmentFile);
    }

    await supabase.from("messages").insert({
      chat_room_id: selectedRoom.id,
      sender_id: user.id,
      content: newMessage.trim() || (attachment?.type === "image" ? "📷 Photo" : attachment?.type === "voice" ? "🎤 Voice message" : `📎 ${attachment?.name || "File"}`),
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      attachment_name: attachment?.name || null,
    } as any);

    setNewMessage("");
    clearAttachment();
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

  const getReadStatus = (msg: Message) => {
    if (msg.sender_id !== user?.id) return null;
    const readers = readReceipts[msg.id] || [];
    const otherReaders = readers.filter((uid) => uid !== user?.id);
    if (otherReaders.length > 0) return "read";
    return "sent";
  };

  const renderAttachment = (msg: Message) => {
    if (!msg.attachment_url) return null;
    const isMe = msg.sender_id === user?.id;

    if (msg.attachment_type === "image") {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
          <img src={msg.attachment_url} alt={msg.attachment_name || "Image"} className="rounded-lg max-w-[240px] max-h-[200px] object-cover mt-1" />
        </a>
      );
    }
    if (msg.attachment_type === "voice") {
      return <VoiceMessage url={msg.attachment_url} isMe={isMe} />;
    }
    // File attachment - downloadable
    const fileSize = msg.attachment_name || "File";
    const ext = fileSize.split(".").pop()?.toUpperCase() || "FILE";
    return (
      <div className={cn(
        "flex items-center gap-3 mt-1 px-3 py-2.5 rounded-xl text-sm min-w-[200px]",
        isMe ? "bg-primary-foreground/10" : "bg-secondary/80"
      )}>
        <div className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          isMe ? "bg-primary-foreground/20" : "bg-primary/10"
        )}>
          <FileText className={cn("h-5 w-5", isMe ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium truncate", isMe ? "text-primary-foreground" : "text-foreground")}>{msg.attachment_name || "File"}</p>
          <p className={cn("text-[10px]", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>{ext}</p>
        </div>
        <a
          href={msg.attachment_url}
          download={msg.attachment_name || "file"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
            isMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" : "bg-primary/10 hover:bg-primary/20 text-primary"
          )}
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  };

  // URL detection and rendering
  const renderContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        urlRegex.lastIndex = 0;
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all hover:opacity-80">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-5rem)]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] text-center">
        <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-4">
          <MessageCircle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-1">No messages yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">Messages will appear here once you're part of a campaign.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] border border-border/50 rounded-xl overflow-hidden bg-card/30">
      {/* Conversation List */}
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
            const hasUnread = meta.unreadCount > 0;
            return (
              <button
                key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  // Clear unread count locally when opening chat
                  if (meta.unreadCount > 0) {
                    setRoomMeta((prev) => ({
                      ...prev,
                      [room.id]: { ...prev[room.id], unreadCount: 0 },
                    }));
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                  isSelected && "bg-secondary/80",
                  hasUnread && !isSelected && "bg-primary/[0.03]"
                )}
              >
                {meta.isGroup ? (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-2 ring-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-12 w-12 shrink-0 ring-2 ring-border/30">
                    <AvatarImage src={meta.avatarUrl || undefined} />
                    <AvatarFallback className="bg-secondary text-sm font-medium">
                      {meta.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm truncate flex items-center gap-1.5",
                      hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"
                    )}>
                      {meta.displayName}
                      {meta.isGroup && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-normal">Group</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={cn("text-[11px]", hasUnread ? "text-primary font-semibold" : "text-muted-foreground")}>
                        {formatTime(meta.lastMessageTime)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={cn(
                      "text-xs truncate",
                      hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>{meta.lastMessage}</p>
                    {hasUnread && (
                      <span className="h-5 min-w-[20px] rounded-full bg-primary text-[11px] font-bold text-primary-foreground flex items-center justify-center px-1.5 shrink-0 ml-2">
                        {meta.unreadCount > 99 ? "99+" : meta.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - clickable */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3 bg-card/50">
            <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8" onClick={() => setSelectedRoom(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity" onClick={() => setProfileOpen(true)}>
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
                  {roomMeta[selectedRoom.id]?.isGroup ? `${Object.keys(participants).length} members · Tap to view` : "Tap to view profile"}
                </p>
              </div>
            </button>
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
              const readStatus = getReadStatus(msg);

              // System messages: join/leave (📥/📤 prefix)
              const isSystemMsg = msg.content.startsWith("📥 ") || msg.content.startsWith("📤 ");

              // Pinned message
              if (msg.pinned) {
                return (
                  <div key={msg.id}>
                    {shouldShowDateSeparator(idx) && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">
                          {formatDateSeparator(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center my-3">
                      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 max-w-[90%] text-center">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">📌 Pinned</span>
                        <p className="text-xs text-foreground mt-1">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              // System join/leave messages
              if (isSystemMsg) {
                return (
                  <div key={msg.id}>
                    {shouldShowDateSeparator(idx) && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-muted-foreground bg-secondary/80 px-3 py-1 rounded-full">
                          {formatDateSeparator(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  </div>
                );
              }

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
                          : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                      )}>
                        {displayContent && (
                          <p className="whitespace-pre-wrap break-words">{renderContent(displayContent)}</p>
                        )}
                        {renderAttachment(msg)}
                        {inviteMatch && !isMe && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1 text-xs h-7"
                              onClick={() => navigate(`/dashboard/gigs`)}
                            >
                              View Gig
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={async () => {
                                if (!user || !inviteMatch[1]) return;
                                // Check if already applied
                                const { data: existing } = await supabase.from("campaign_applications").select("id").eq("campaign_id", inviteMatch[1]).eq("creator_user_id", user.id).maybeSingle();
                                if (existing) {
                                  return;
                                }
                                // Resolve pricing from invite or fall back to campaign defaults
                                const { data: invite } = await supabase.from("campaign_invites").select("proposed_price_per_video, proposed_video_count").eq("campaign_id", inviteMatch[1]).eq("creator_user_id", user.id).single();
                                const { data: camp } = await supabase.from("campaigns").select("brand_user_id, title, price_per_video, expected_video_count, is_free_product").eq("id", inviteMatch[1]).single();
                                const agreedPrice = invite?.proposed_price_per_video ?? camp?.price_per_video ?? null;
                                const agreedVideos = invite?.proposed_video_count ?? camp?.expected_video_count ?? 1;
                                // Auto-accept: create application with accepted status
                                await supabase.from("campaign_applications").insert({
                                  campaign_id: inviteMatch[1],
                                  creator_user_id: user.id,
                                  cover_letter: "Accepted campaign invite",
                                  status: "accepted",
                                  agreed_price_per_video: camp?.is_free_product ? null : agreedPrice,
                                  agreed_video_count: agreedVideos,
                                  pricing_status: "agreed",
                                } as any);
                                // Update invite status
                                await supabase.from("campaign_invites").update({ status: "accepted" } as any).eq("campaign_id", inviteMatch[1]).eq("creator_user_id", user.id);
                                // Add creator to group chat if exists
                                const { data: groupRoom } = await supabase.from("chat_rooms").select("id").eq("campaign_id", inviteMatch[1]).eq("type", "group").maybeSingle();
                                if (groupRoom) {
                                  await supabase.from("chat_participants").insert({ chat_room_id: groupRoom.id, user_id: user.id } as any);
                                  const { data: prof2 } = await supabase.from("profiles").select("display_name, username").eq("user_id", user.id).maybeSingle();
                                  await supabase.from("messages").insert({
                                    chat_room_id: groupRoom.id, sender_id: user.id,
                                    content: `📥 ${prof2?.display_name || prof2?.username || "A creator"} joined the chat`,
                                  } as any);
                                }
                                // Notify brand
                                if (camp) {
                                  const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
                                  await supabase.from("notifications").insert({
                                    user_id: camp.brand_user_id,
                                    type: "invite_accepted",
                                    title: "Invite Accepted!",
                                    body: `${prof?.display_name || "A creator"} accepted your invite to "${camp.title}"`,
                                    link: `/brand/campaigns/${inviteMatch[1]}`,
                                  });
                                }
                                // Send confirmation message in chat
                                if (selectedRoom) {
                                  const priceInfo = agreedPrice ? ` (HK$${agreedPrice}/video × ${agreedVideos} video${agreedVideos > 1 ? 's' : ''})` : '';
                                  await supabase.from("messages").insert({
                                    chat_room_id: selectedRoom.id,
                                    sender_id: user.id,
                                    content: `✅ I've accepted the campaign invite!${priceInfo}`,
                                  } as any);
                                }
                              }}
                            >
                              <CheckIcon className="h-3 w-3" /> Accept Invite
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 mx-1">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isMe && readStatus && (
                          readStatus === "read" ? (
                            <CheckCheck className="h-3 w-3 text-primary" />
                          ) : (
                            <CheckCheck className="h-3 w-3 text-muted-foreground" />
                          )
                        )}
                      </div>
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
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                  {attachmentFile.type.startsWith("audio/") ? <Mic className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{attachmentFile.name}</p>
                <p className="text-xs text-muted-foreground">{(attachmentFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearAttachment}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Message input */}
          <div className="px-4 py-3 border-t border-border/30 bg-card/50 flex items-center gap-2">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 shrink-0", recording && "text-destructive animate-pulse")}
              onClick={recording ? stopRecording : startRecording}
              title={recording ? "Stop recording" : "Voice message"}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={recording ? "Recording..." : "Message..."}
              className="rounded-full bg-secondary/50 border-border/30 focus-visible:ring-primary/30"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={recording}
            />
            <Button
              size="icon"
              className="rounded-full h-10 w-10 shrink-0"
              onClick={handleSend}
              disabled={sending || (!newMessage.trim() && !attachmentFile)}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {selectedRoom && (
            <ChatProfilePanel
              open={profileOpen}
              onOpenChange={setProfileOpen}
              roomType={selectedRoom.type as "private" | "group"}
              roomId={selectedRoom.id}
              currentUserId={user!.id}
              campaignId={selectedRoom.campaign_id}
            />
          )}
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
