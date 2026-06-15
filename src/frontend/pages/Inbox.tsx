import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { dbFirestore, db } from "@/backend/config/firebase";
import { ref as dbRef, get, child } from "firebase/database";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Button } from "@/frontend/components/ui/button";
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Search,
  Paperclip,
  X,
  Plus,
  Headset
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "sonner";
import { 
  getChatRoomId, 
  createOrOpenChatSession,
  ChatSession, 
  ChatMessage, 
  subscribeToMessages, 
  sendMessage, 
  markChatAsRead,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  setOnlineStatus,
  subscribeToOnlineStatus,
  setTypingStatus,
  subscribeToTypingStatus,
  uploadChatImage
} from "@/backend/services/chatService";
import { getAdminUser } from "@/backend/services/authService";
import NewChatModal from "./NewChatModal";

// ────────────────────────────────────────
// Helper: inisial nama (maks 2 huruf)
// ────────────────────────────────────────
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";

// ────────────────────────────────────────
// Helper: Format Terakhir Dilihat ala WhatsApp
// ────────────────────────────────────────
const formatLastSeen = (timestamp: number | null | undefined) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  
  // Hari ini
  if (date.toDateString() === now.toDateString()) {
    return `hari ini pukul ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  }
  
  // Kemarin
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `kemarin pukul ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  }
  
  // Lainnya
  return `${date.toLocaleDateString("id-ID")} pukul ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
};

// ────────────────────────────────────────
// Komponen Avatar
// ────────────────────────────────────────
function Avatar({
  name,
  photo,
  size = "md",
}: {
  name: string;
  photo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
  };
  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-[#5C3A21] text-white font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-sm`}
    >
      {photo ? (
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Halaman Inbox Utama
// ────────────────────────────────────────
export default function Inbox() {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const [chats, setChats] = useState<ChatSession[] | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    paramRoomId || null
  );
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // P2P & Admin Support State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isAdminConnecting, setIsAdminConnecting] = useState(false);

  // Realtime & WhatsApp Features state
  const [peerOnlineData, setPeerOnlineData] = useState<{online: boolean, lastSeen: number | null} | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Edit / Delete features state
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Lightbox feature state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Cache nama lawan bicara
  const [peerCache, setPeerCache] = useState<Record<string, { name: string; photo: string | null; role: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set status Online untuk diri sendiri
  useEffect(() => {
    if (currentUser?.uid) {
      setOnlineStatus(currentUser.uid);
    }
  }, [currentUser?.uid]);

  // Redirect jika belum login
  useEffect(() => {
    if (currentUser === null) {
      toast.error("Silakan masuk untuk menggunakan Inbox");
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // Sync URL param → selected room
  useEffect(() => {
    if (paramRoomId) setSelectedRoomId(paramRoomId);
  }, [paramRoomId]);

  // ── Fetch daftar chat user (sidebar kiri) ──────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(dbFirestore, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatSession[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as ChatSession));
        list.sort((a, b) => {
          const ta = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
          const tb = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
          return tb - ta;
        });
        setChats(list);
      },
      () => setChats([])
    );

    return () => unsub();
  }, [currentUser]);

  // ── Fetch detail lawan bicara (nama, foto) dari RTDB ──────────────
  const fetchPeerDetail = useCallback(
    async (peerId: string) => {
      if (peerCache[peerId]) return;
      try {
        const snap = await get(child(dbRef(db), `users/${peerId}`));
        if (snap.exists()) {
          const data = snap.val();
          setPeerCache((prev) => ({
            ...prev,
            [peerId]: {
              name: data.fullName || data.name || "Pengguna",
              photo: data.photoURL || null,
              role: data.role || "Pengguna",
            },
          }));
        } else {
          setPeerCache((prev) => ({
            ...prev,
            [peerId]: { name: "Pengguna", photo: null, role: "Pengguna" },
          }));
        }
      } catch {
        setPeerCache((prev) => ({
          ...prev,
          [peerId]: { name: "Pengguna", photo: null, role: "Pengguna" },
        }));
      }
    },
    [peerCache]
  );

  // Setiap chat baru → fetch peer detail jika belum di cache
  useEffect(() => {
    if (!chats || !currentUser) return;
    chats.forEach((chat) => {
      const peerId = chat.participants?.find((p) => p !== currentUser.uid);
      if (peerId && !peerCache[peerId]) fetchPeerDetail(peerId);
    });
  }, [chats, currentUser, peerCache, fetchPeerDetail]);

  // ── Subscribe ke pesan aktif (panel kanan) ────────────────────────
  useEffect(() => {
    if (!selectedRoomId || !currentUser) {
      setMessages(null);
      return;
    }

    setMessages(null);

    const unsub = subscribeToMessages(
      selectedRoomId,
      (msgs) => {
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

        // Tandai sudah dibaca
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.senderId !== currentUser.uid) {
          markChatAsRead(selectedRoomId, currentUser.uid);
          markMessagesAsRead(selectedRoomId, currentUser.uid);
        }
      },
      () => setMessages([])
    );

    return () => unsub();
  }, [selectedRoomId, currentUser]);

  // Subscribe ke Realtime Database: Online Status & Typing Status
  useEffect(() => {
    if (!selectedRoomId || !currentUser || !chats) return;
    
    const chat = chats.find((c) => c.id === selectedRoomId);
    const peerId = chat?.participants?.find((p) => p !== currentUser.uid);
    
    if (peerId) {
      const unsubOnline = subscribeToOnlineStatus(peerId, setPeerOnlineData);
      const unsubTyping = subscribeToTypingStatus(selectedRoomId, setTypingUsers);
      return () => {
        unsubOnline();
        unsubTyping();
      };
    }
  }, [selectedRoomId, chats, currentUser]);

  // Set "Typing..." saat mengetik
  useEffect(() => {
    if (!selectedRoomId || !currentUser) return;
    const isTyping = inputText.trim().length > 0;
    setTypingStatus(selectedRoomId, currentUser.uid, isTyping);
  }, [inputText, selectedRoomId, currentUser]);

  // Auto-focus input saat room berganti
  useEffect(() => {
    if (selectedRoomId) setTimeout(() => inputRef.current?.focus(), 150);
  }, [selectedRoomId]);

  // ── Kirim / Update pesan ───────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !imageFile) || isSending || !selectedRoomId || !currentUser) return;

    const chat = chats?.find((c) => c.id === selectedRoomId);
    const receiverId = chat?.participants?.find((p) => p !== currentUser.uid) ?? "";
    const text = inputText.trim();

    setIsSending(true);

    try {
      if (editingMessage) {
        // Mode Edit
        const createdAtMillis = editingMessage.createdAt?.toMillis ? editingMessage.createdAt.toMillis() : (editingMessage.createdAt?.seconds ? editingMessage.createdAt.seconds * 1000 : 0);
        await editMessage(selectedRoomId, editingMessage.id!, text, createdAtMillis);
        setEditingMessage(null);
        setInputText("");
      } else {
        // Mode Kirim Baru
        const fileToUpload = imageFile;
        setInputText("");
        setImageFile(null);
        let imageUrl;
        if (fileToUpload) {
          imageUrl = await uploadChatImage(fileToUpload, selectedRoomId, currentUser.uid);
        }
        await sendMessage(
          selectedRoomId,
          currentUser.uid,
          currentUser.displayName || "Pengguna",
          text,
          receiverId,
          imageUrl
        );
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Gagal memproses pesan");
    } finally {
      setIsSending(false);
      setTypingStatus(selectedRoomId, currentUser.uid, false);
    }
  };

  const startEditing = (msg: ChatMessage) => {
    if (msg.imageUrl) {
      toast.error("Pesan gambar tidak dapat diedit.");
      return;
    }
    const createdAtMillis = msg.createdAt?.toMillis ? msg.createdAt.toMillis() : (msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : 0);
    if (Date.now() - createdAtMillis > 120000) {
      toast.error("Waktu edit (2 menit) sudah habis.");
      return;
    }
    setEditingMessage(msg);
    setInputText(msg.text);
    inputRef.current?.focus();
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedRoomId) return;
    
    // Konfirmasi sebelum menghapus
    if (!window.confirm("Menghapus pesan ini akan menghapusnya untuk semua orang di obrolan ini. Lanjutkan?")) {
      return;
    }

    try {
      await deleteMessage(selectedRoomId, msgId);
      toast.success("Pesan ditarik");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus pesan");
    }
  };

  // ── Pilih room dari sidebar ────────────────────────────────────────
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    navigate(`/inbox/${roomId}`, { replace: true });
  };

  // ── Buat obrolan P2P baru ─────────────────────────────────────────
  const handleStartP2PChat = async (peerId: string, peerName: string, peerRole: string, peerPhotoURL?: string | null) => {
    if (!currentUser) return;
    try {
      setIsNewChatOpen(false);
      const roomId = getChatRoomId(currentUser.uid, peerId);
      
      await createOrOpenChatSession(
        roomId,
        currentUser.uid,
        currentUser.displayName || "Pengguna",
        currentUser.photoURL || null,
        role || "Pembeli",
        peerId,
        peerName,
        peerPhotoURL || null,
        peerRole
      );
      
      handleSelectRoom(roomId);
    } catch (err) {
      console.error("Error creating P2P chat:", err);
      toast.error("Gagal memulai obrolan baru");
    }
  };

  // ── Hubungi Admin ───────────────────────────────────────────────
  const handleContactAdmin = async () => {
    if (!currentUser || isAdminConnecting) return;
    setIsAdminConnecting(true);
    try {
      const admin = await getAdminUser();
      if (!admin || !admin.uid) {
        toast.error("Tidak ada Admin yang tersedia saat ini.");
        return;
      }
      
      const roomId = getChatRoomId(currentUser.uid, admin.uid);
      
      await createOrOpenChatSession(
        roomId,
        currentUser.uid,
        currentUser.displayName || "Pengguna",
        currentUser.photoURL,
        role || "Pembeli",
        admin.uid,
        admin.name || "Admin",
        null,
        "Admin"
      );
      
      handleSelectRoom(roomId);
    } catch (err) {
      console.error("Error contacting admin:", err);
      toast.error("Gagal menghubungi Admin");
    } finally {
      setIsAdminConnecting(false);
    }
  };

  if (!currentUser) return null;

  // ── Computed values ──────────────────────────────────────────────
  const selectedChat = chats?.find((c) => c.id === selectedRoomId) ?? null;
  const selectedPeerId = selectedChat?.participants?.find((p) => p !== currentUser.uid);
  // Get peer info from participantDetails first (fast and reliable), fallback to peerCache
  const selectedPeerRaw = selectedPeerId 
    ? (selectedChat?.participantDetails?.[selectedPeerId] || peerCache[selectedPeerId])
    : null;
  const selectedPeer = selectedPeerRaw ? { ...selectedPeerRaw, photo: selectedPeerRaw.photo || selectedPeerRaw.avatar } : null;

  const filteredChats = (chats ?? []).filter((chat) => {
    if (!searchQuery.trim()) return true;
    const peerId = chat.participants?.find((p) => p !== currentUser.uid);
    const peer = peerId ? (chat.participantDetails?.[peerId] || peerCache[peerId]) : null;
    return peer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-screen bg-[#F9F6F0] font-sans overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-4 pb-4 pt-2 gap-0">
        {/* ── Panel Kiri: Daftar Percakapan ───────────────────────────── */}
        <aside
          className={`
            w-full md:w-[340px] shrink-0 flex flex-col bg-white border border-border rounded-l-2xl overflow-hidden
            ${selectedRoomId ? "hidden md:flex" : "flex"}
          `}
        >
          {/* Header sidebar */}
          <div className="px-4 pt-4 pb-3 border-b border-border bg-[#F9F6F0]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-[#5C3A21]">Pesan</h2>
              <button 
                onClick={() => setIsNewChatOpen(true)}
                className="w-8 h-8 flex items-center justify-center bg-white border border-[#EBE5D9] rounded-full text-[#A67B5B] hover:bg-[#5C3A21] hover:text-white hover:border-[#5C3A21] transition-all shadow-sm"
                title="Mulai Pesan Baru"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#EBE5D9] rounded-xl focus:outline-none focus:border-[#A67B5B] transition shadow-sm"
              />
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1 bg-white">
            {/* Banner Hubungi Admin */}
            <div className="p-3">
              <button
                onClick={handleContactAdmin}
                disabled={isAdminConnecting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[#A67B5B] to-[#5C3A21] hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-70"
              >
                {isAdminConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Headset className="w-4 h-4" />
                    Hubungi Pusat Bantuan
                  </>
                )}
              </button>
            </div>
            {chats === null ? (
              // Skeleton loading
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-stone-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-stone-200 rounded w-2/3" />
                      <div className="h-3 bg-stone-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center px-6">
                <MessageCircle className="w-10 h-10 text-stone-300 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Tidak ada percakapan yang cocok."
                    : 'Belum ada percakapan. Tekan tombol "Chat Penjual" pada produk untuk memulai!'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredChats.map((chat) => {
                  const peerId = chat.participants?.find((p) => p !== currentUser.uid);
                  const peer = peerId ? (chat.participantDetails?.[peerId] || peerCache[peerId]) : null;
                  const peerName = peer?.name ?? "Pengguna";
                  const peerPhoto = peer?.photo ?? peer?.avatar ?? null;
                  const peerRole = peer?.role ?? "";
                  const unread = chat.unreadCount?.[currentUser.uid] ?? 0;
                  const isActive = chat.id === selectedRoomId;
                  const lastMsgTime = chat.updatedAt?.seconds
                    ? formatDistanceToNow(new Date(chat.updatedAt.seconds * 1000), { addSuffix: true, locale: localeId })
                    : "";

                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleSelectRoom(chat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F9F6F0]/70
                        ${isActive ? "bg-[#F9F6F0] border-l-4 border-l-[#5C3A21]" : "border-l-4 border-l-transparent"}
                      `}
                    >
                      <Avatar name={peerName} photo={peerPhoto} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={`text-sm font-semibold truncate ${unread > 0 ? "text-[#5C3A21]" : "text-foreground"}`}>
                            {peerName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {lastMsgTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs truncate flex-1 ${unread > 0 ? "font-medium text-[#5C3A21]" : "text-muted-foreground"}`}>
                            {chat.lastSenderId === currentUser.uid && "Anda: "}
                            {chat.lastMessage ?? "Mulai obrolan..."}
                          </p>
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-[#5C3A21] text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                        {peerRole && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            {peerRole}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ── Panel Kanan: Jendela Percakapan ─────────────────────────── */}
        <section
          className={`
            flex-1 flex flex-col bg-white border border-l-0 border-border rounded-r-2xl overflow-hidden
            ${!selectedRoomId ? "hidden md:flex" : "flex"}
          `}
        >
          {!selectedRoomId ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-[#F9F6F0] rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-9 h-9 text-[#A67B5B]" />
              </div>
              <h3 className="text-lg font-bold text-[#5C3A21] mb-2">Inbox Salin Gaya</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Pilih percakapan di sebelah kiri, atau tekan tombol{" "}
                <strong>"Chat Penjual"</strong> pada halaman produk untuk memulai obrolan baru.
              </p>
            </div>
          ) : (
            <>
              {/* Header percakapan */}
              <div className="px-4 py-3 border-b border-border bg-white flex items-center gap-3 shadow-sm shrink-0">
                {/* Tombol back (mobile) */}
                <button
                  onClick={() => {
                    setSelectedRoomId(null);
                    navigate("/inbox", { replace: true });
                  }}
                  className="md:hidden p-1.5 rounded-full hover:bg-[#F9F6F0] text-[#5C3A21] transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {selectedPeer ? (
                  <>
                    <Avatar name={selectedPeer.name} photo={selectedPeer.photo} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#5C3A21] text-sm leading-tight truncate">{selectedPeer.name}</p>
                      {typingUsers[selectedPeer.id] ? (
                        <p className="text-xs text-[#53bdeb] font-medium animate-pulse">Mengetik...</p>
                      ) : peerOnlineData?.online ? (
                        <p className="text-xs text-[#53bdeb] font-medium">Online</p>
                      ) : peerOnlineData?.lastSeen ? (
                        <p className="text-xs text-muted-foreground">Terakhir dilihat {formatLastSeen(peerOnlineData.lastSeen)}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{selectedPeer.role}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex gap-3 animate-pulse flex-1">
                    <div className="w-11 h-11 rounded-full bg-stone-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-stone-200 rounded w-1/3" />
                      <div className="h-3 bg-stone-200 rounded w-1/4" />
                    </div>
                  </div>
                )}
              </div>

              {/* Area pesan */}
              <ScrollArea className="flex-1 p-4 bg-[#efeae2]">
                <div className="flex flex-col gap-2 pb-2">
                  {messages === null ? (
                    /* Skeleton pesan */
                    <div className="space-y-4 animate-pulse">
                      <div className="flex justify-start"><div className="h-10 w-48 bg-[#dcf8c6]/50 rounded-2xl rounded-tl-sm" /></div>
                      <div className="flex justify-end"><div className="h-10 w-40 bg-[#dcf8c6]/50 rounded-2xl rounded-tr-sm" /></div>
                      <div className="flex justify-start"><div className="h-10 w-56 bg-white/50 rounded-2xl rounded-tl-sm" /></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex justify-center mt-16">
                      <div className="bg-white border border-border text-sm text-[#A67B5B] rounded-xl px-5 py-2.5 font-medium shadow-sm">
                        Belum ada pesan. Kirim pesan pertama Anda!
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser.uid;
                      const time = msg.createdAt?.seconds
                        ? format(new Date(msg.createdAt.seconds * 1000), "HH:mm")
                        : "...";

                      return (
                        <div
                          key={msg.id ?? idx}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1 group`}
                          onMouseEnter={() => setHoveredMessageId(msg.id!)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          <div
                            className={`
                              relative max-w-[75%] md:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm flex flex-col
                              ${isMe
                                ? "bg-[#dcf8c6] text-stone-900 rounded-tr-none"
                                : "bg-white text-stone-900 rounded-tl-none"
                              }
                            `}
                          >
                            {/* Buntut Gelembung (Tail) */}
                            {isMe ? (
                              <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -right-[8px] text-[#dcf8c6]">
                                <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 8 13" width="8" height="13" className="absolute top-0 -left-[8px] text-white">
                                <path fill="currentColor" d="M1.533 2.568L8 11.193V0H2.812C1.042 0 .474 1.156 1.533 2.568z"></path>
                              </svg>
                            )}

                            {/* Menu Aksi (Edit/Hapus) */}
                            {isMe && hoveredMessageId === msg.id && !msg.isDeleted && (
                              <div className="absolute -top-3 right-0 flex gap-1 bg-white border border-border rounded-full shadow-md px-1.5 py-1 z-10 transition-opacity opacity-0 group-hover:opacity-100">
                                <button onClick={() => startEditing(msg)} className="text-[#A67B5B] hover:text-[#5C3A21] p-0.5 rounded-full hover:bg-stone-100 transition-colors" title="Edit Pesan">
                                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDeleteMessage(msg.id!)} className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors" title="Hapus Pesan">
                                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                              </div>
                            )}
                            
                            {/* Konten Pesan */}
                            {msg.isDeleted ? (
                              <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words pr-12 pb-1 text-stone-500 italic flex items-center gap-1">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                                Pesan ini telah dihapus
                              </p>
                            ) : (
                              <>
                                {/* Gambar Lampiran */}
                                {msg.imageUrl && (
                                  <div className="mb-1 rounded-md overflow-hidden bg-black/5 mt-1 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setPreviewImage(msg.imageUrl!)}>
                                    <img src={msg.imageUrl} alt="Lampiran" className="max-w-full h-auto object-cover rounded-md max-h-60" loading="lazy" />
                                  </div>
                                )}
                                {msg.text && (
                                  <p className={`text-[14.5px] leading-relaxed whitespace-pre-wrap break-words pr-12 ${msg.imageUrl ? 'pb-2' : 'pb-1'}`}>
                                    {msg.text}
                                  </p>
                                )}
                                {!msg.text && msg.imageUrl && (
                                  // Berikan ruang kosong di bawah gambar untuk centang dan waktu
                                  <div className="h-4 w-12" />
                                )}
                              </>
                            )}
                            
                            {/* Waktu & Centang (Pojok Kanan Bawah) */}
                            <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                              {msg.isEdited && !msg.isDeleted && <span className="italic mr-0.5 text-[9px] text-stone-400 font-normal">Telah diedit</span>}
                              <span>{time}</span>
                              {isMe && !msg.isDeleted && (
                                <span className={msg.isRead ? "text-[#53bdeb]" : "text-stone-400"}>
                                  {msg.isRead ? (
                                    <svg viewBox="0 0 16 15" width="16" height="15" className="fill-current">
                                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                                    </svg>
                                  ) : (
                                    <svg viewBox="0 0 11 14" width="11" height="14" className="fill-current">
                                      <path d="M10.15 3.328l-.48-.372a.365.365 0 0 0-.51.063L3.805 9.89a.32.32 0 0 1-.484.033L.705 7.427a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.702-8.175a.366.366 0 0 0-.064-.512z"></path>
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input kirim pesan */}
              <div className="px-4 py-3 border-t border-border bg-[#F9F6F0] shrink-0 flex flex-col gap-2 relative">
                
                {/* Mode Edit Banner */}
                {editingMessage && (
                  <div className="flex items-center justify-between bg-white border-l-[3px] border-[#A67B5B] rounded-r-lg p-2.5 mb-1 shadow-sm">
                    <div className="flex flex-col flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-[#A67B5B]"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span className="text-[11px] font-bold text-[#A67B5B] uppercase tracking-wider">Mengedit Pesan</span>
                      </div>
                      <span className="text-[13px] text-stone-500 line-clamp-2 italic leading-snug">{editingMessage.text}</span>
                    </div>
                    <button type="button" onClick={() => { setEditingMessage(null); setInputText(""); }} className="text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-full p-1.5 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Preview Image */}
                {imageFile && (
                  <div className="relative self-start mb-2 bg-white p-1 rounded-xl shadow-sm border border-border">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg" 
                    />
                    <button 
                      onClick={() => setImageFile(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleSend} className="flex gap-2 items-end">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full text-stone-500 hover:bg-stone-200 flex items-center justify-center shrink-0 transition mb-0.5"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <div className="flex-1 bg-white border border-[#EBE5D9] rounded-2xl flex items-center shadow-sm overflow-hidden min-h-[42px]">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ketik pesan..."
                      className="w-full px-4 py-2.5 text-[15px] bg-transparent text-[#3D2010] placeholder-stone-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e as unknown as React.FormEvent);
                        }
                      }}
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={(!inputText.trim() && !imageFile) || isSending}
                    className="w-11 h-11 rounded-full bg-[#5C3A21] hover:bg-[#3D2010] text-white disabled:opacity-40 p-0 flex items-center justify-center shrink-0 transition shadow-sm mb-0.5"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-1" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </section>
      </main>

      {/* New Chat Modal */}
      <NewChatModal 
        open={isNewChatOpen} 
        onOpenChange={setIsNewChatOpen}
        onSelectUser={handleStartP2PChat}
        currentUserId={currentUser.uid}
      />
      {/* Modal Preview Image (Lightbox) */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <button 
            className="absolute top-6 right-6 text-white hover:text-stone-300 transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={previewImage} 
            alt="Preview Fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
        </div>
      )}

    </div>
  );
}
