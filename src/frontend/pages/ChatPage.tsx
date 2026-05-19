import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { onSnapshot, collection, query, where, orderBy, getDoc, doc } from "firebase/firestore";
import { useAuth } from "@/frontend/contexts/AuthContext";
import Navbar from "@/frontend/components/layout/Navbar";
import { db, dbFirestore } from "@/backend/config/firebase";
import { ref as dbRef, get, child, onValue } from "firebase/database";
import { Send, ChevronRight, MessageCircle, Search, MoreVertical, User, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ChatMessage,
  ChatSession,
  getChatRoomId,
  subscribeToMessages,
  sendMessage,
  createOrOpenChatSession,
  markChatAsRead,
} from "@/backend/services/chatService";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/frontend/components/ui/dialog";
import { Badge } from "@/frontend/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";

// Helper for Initials
const getInitials = (name?: string) => {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

export default function ChatPage() {
  const { targetUid } = useParams<{ targetUid: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser, role } = useAuth();
  
  // URL Parameter Catching
  useEffect(() => {
    if (!currentUser) return;
    const chatIdParam = searchParams.get('chatId');
    const cUid = role === "Admin" ? "admin" : currentUser.uid;
    if (chatIdParam) {
      const parts = chatIdParam.split('_');
      const opponentId = parts.find(p => p !== cUid);
      if (opponentId && opponentId !== targetUid) {
        navigate(`/chat/${opponentId}`, { replace: true });
      }
    }
  }, [searchParams, currentUser, role, targetUid, navigate]);
  
  const [chats, setChats] = useState<ChatSession[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  
  const [inputText, setInputText] = useState("");
  const [receiverName, setReceiverName] = useState("Memuat...");
  const [receiverRole, setReceiverRole] = useState("");
  const [receiverPhoto, setReceiverPhoto] = useState<string | null>(null);
  const [receiverStatus, setReceiverStatus] = useState("Online");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Admin Filter Tab State
  const [adminFilter, setAdminFilter] = useState<"Semua" | "Belum Dibaca" | "Komplain">("Semua");
  
  // Cache for user details
  const [usersCache, setUsersCache] = useState<Record<string, any>>({});
  const [allUsersArray, setAllUsersArray] = useState<any[]>([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Guard
  useEffect(() => {
    if (currentUser === null) {
      toast.error("Silakan masuk untuk menggunakan fitur chat");
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const currentUid = role === "Admin" ? "admin" : currentUser?.uid;

  // Global Fetch Users (JOIN logic)
  useEffect(() => {
    const usersRef = dbRef(db, "users");
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        setUsersCache(usersObj);
        
        // Buat array untuk keperluan Search
        const usersList = Object.keys(usersObj).map(key => ({
          uid: key,
          ...usersObj[key]
        })).filter(u => u.uid !== currentUser?.uid && u.uid !== "admin");
        
        setAllUsersArray(usersList);
      }
      setIsFetchingUsers(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Sidebar Chats (Real-time listener on "chats" collection)
  useEffect(() => {
    if (!currentUid) return;

    // Admin sees ALL active chats. Others only see their own.
    // DANGER: Using where() with orderBy() requires a composite index in Firestore.
    // To prevent infinite skeleton loading due to missing index, we remove orderBy from the query
    // and perform sorting manually in memory.
    const q = role === "Admin" 
      ? query(collection(dbFirestore, "chats"))
      : query(collection(dbFirestore, "chats"), where("participants", "array-contains", currentUid));

    try {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activeChats: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          activeChats.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
        });
        
        // Manual sorting to prevent Missing Index Error
        activeChats.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        setChats(activeChats);
      }, (error) => {
        console.error("Sidebar Chat Error:", error);
        setChats([]); // stop skeleton loading on error
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Fetch chats error:", e);
      setChats([]); // stop skeleton loading on error
    }
  }, [currentUid, role]);

  // Filtered Chats based on Role / Admin Tab
  const getFilteredChats = () => {
    if (!chats) return null;
    let filtered = chats;
    
    if (role === "Admin") {
      if (adminFilter === "Belum Dibaca") {
        filtered = filtered.filter(c => c?.unreadCount?.["admin"] && c.unreadCount["admin"] > 0);
      } else if (adminFilter === "Komplain") {
        // Implementasi dummy komplain (misal nama role = komplain, atau isi chat ada kata komplain)
        filtered = filtered.filter(c => c?.lastMessage?.toLowerCase().includes("komplain"));
      }
    } else if (role === "Pembeli") {
      // Pembeli hanya tampilkan dengan Penjual/Admin
      filtered = filtered.filter(c => {
        const opps = Object.values(c?.participantDetails || {}).filter(p => p?.role === "Penjual" || p?.role === "Admin");
        return opps.length > 0;
      });
    }
    
    return filtered;
  };

  const filteredChatsList = getFilteredChats();

  // Fetch Active Conversation
  const chatId = currentUid && targetUid ? getChatRoomId(currentUid, targetUid) : null;

  useEffect(() => {
    if (!currentUser) return;
    
    if (!currentUid || !targetUid || !chatId) {
      setMessages(null);
      setReceiverName("Pusat Pesan");
      setReceiverRole("");
      setReceiverPhoto(null);
      return;
    }

    const initializeChat = async () => {
      try {
        let opponentName = "Pengguna";
        let opponentRole = "Pengguna";
        let opponentPhoto = null;

        if (targetUid === "admin") {
          opponentName = "Admin Salin Gaya";
          opponentRole = "Admin";
          setReceiverStatus("Online (Support)");
        } else {
          // Fallback to cache if available
          if (usersCache?.[targetUid]) {
             opponentName = usersCache[targetUid]?.fullName || usersCache[targetUid]?.name || "Pengguna";
             opponentRole = usersCache[targetUid]?.role || "Pengguna";
             opponentPhoto = usersCache[targetUid]?.photoURL || null;
             setReceiverStatus("Terakhir aktif baru-baru ini");
          } else {
             const snapshot = await get(child(dbRef(db), `users/${targetUid}`));
             if (snapshot.exists()) {
               const data = snapshot.val();
               opponentName = data?.fullName || data?.name || "Pengguna";
               opponentRole = data?.role || "Pengguna";
               opponentPhoto = data?.photoURL || null;
               setReceiverStatus("Terakhir aktif baru-baru ini");
             }
          }
        }
        
        setReceiverName(opponentName);
        setReceiverRole(opponentRole);
        setReceiverPhoto(opponentPhoto);

        const currentName = currentUser?.displayName || "Pengguna";
        const currentAvatar = currentUser?.photoURL || null;
        const currentRole = role || "Pengguna";

        await createOrOpenChatSession(
          chatId,
          currentUid,
          currentName,
          currentAvatar,
          currentRole,
          targetUid,
          opponentName,
          opponentPhoto,
          opponentRole
        );
      } catch (e) {
        console.error("Failed initializing chat:", e);
      }
    };
    
    initializeChat();

    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      if (msgs && msgs.length > 0) {
        // Tandai sudah dibaca jika kita menerima pesan (pengirim terakhir bukan kita)
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.senderId !== currentUid) {
          markChatAsRead(chatId, currentUid);
        }
      }
    }, (error) => {
      setMessages([]);
    });

    return () => unsubscribe();
  }, [currentUid, targetUid, chatId, currentUser, role, usersCache]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !chatId || !currentUid || !targetUid) return;

    const messageText = inputText.trim();
    setInputText("");

    try {
      await sendMessage(
        chatId,
        currentUid,
        currentUser.displayName || "Pengguna",
        messageText,
        targetUid
      );
    } catch (error) {
      toast.error("Gagal mengirim pesan");
    }
  };

  const handleInitiateChat = (uid: string) => {
    setIsModalOpen(false);
    navigate(`/chat/${uid}`);
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-80px)]">
        <div className="bg-card border border-border shadow-sm rounded-2xl flex flex-1 overflow-hidden">
          
          {/* Kolom Kiri: Sidebar List Chat */}
          <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${targetUid ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border bg-[#F9F6F0] flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg text-[#5C3A21]">
                  {role === "Admin" ? "Pusat Bantuan Salin Gaya" : "Pesan Anda"}
                </h2>
                {role === "Admin" && (
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <button className="bg-[#5C3A21] hover:bg-[#8C674C] text-white flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold" title="Search User">
                        <Search className="w-4 h-4" />
                        Search
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Mulai Chat Baru</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-2 mt-4">
                        {allUsersArray?.map(user => (
                          <button
                            key={user?.uid}
                            onClick={() => handleInitiateChat(user?.uid)}
                            className="flex items-center gap-3 p-3 hover:bg-[#F9F6F0] rounded-lg transition-colors border border-border text-left"
                          >
                            <div className="w-10 h-10 bg-[#5C3A21] text-white rounded-full flex items-center justify-center font-bold overflow-hidden">
                              {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : getInitials(user?.fullName || user?.name)}
                            </div>
                            <div>
                              <p className="font-bold text-[#5C3A21]">{user?.fullName || user?.name}</p>
                              <Badge variant="outline" className="text-[10px] uppercase mt-1">{user?.role}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              {/* Admin Tabs */}
              {role === "Admin" && (
                <div className="flex gap-2">
                  {(["Semua", "Belum Dibaca", "Komplain"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdminFilter(tab)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${adminFilter === tab ? "bg-[#5C3A21] text-white" : "bg-white text-[#5C3A21] border border-[#5C3A21]/20 hover:bg-[#5C3A21]/10"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1">
              {!chats || isFetchingUsers ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((skeleton) => (
                    <div key={skeleton} className="flex gap-3 animate-pulse">
                      <div className="w-12 h-12 bg-stone-200 rounded-full shrink-0"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-stone-200 rounded w-2/3"></div>
                        <div className="h-3 bg-stone-200 rounded w-1/3"></div>
                        <div className="h-3 bg-stone-200 rounded w-1/2 mt-2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChatsList?.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                  <MessageCircle className="w-12 h-12 text-stone-300 mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada percakapan dimulai. Kirim pesan pertama Anda sekarang!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChatsList?.map((chat) => {
                    if (!chat) return null;
                    
                    // Gunakan ?. secara ekstensif
                    const opponentId = chat?.participants?.find((p) => p !== currentUid) || chat?.participants?.[0] || "unknown";
                    const opponentDetail = chat?.participantDetails?.[opponentId];
                    
                    let opponentName = opponentDetail?.name || "Pengguna";
                    let opponentRole = opponentDetail?.role || "Pengguna";
                    let opponentPhoto = opponentDetail?.avatar || null;
                    
                    // Inter-user logic for Admin
                    if (role === "Admin" && !chat?.participants?.includes("admin") && chat?.participants?.length >= 2) {
                        const userA = chat?.participantDetails?.[chat.participants[0]];
                        const userB = chat?.participantDetails?.[chat.participants[1]];
                        const nameA = userA?.name || "Pengguna";
                        const nameB = userB?.name || "Pengguna";
                        opponentName = `${nameA} & ${nameB}`;
                        opponentRole = "Inter-User";
                        opponentPhoto = null;
                    }

                    const unreadCount = currentUid ? chat?.unreadCount?.[currentUid] || 0 : 0;
                    const isUnread = unreadCount > 0;
                    const isActive = targetUid === opponentId;

                    return (
                      <Link
                        key={chat?.id}
                        to={`/chat/${opponentId}`}
                        className={`flex items-start gap-3 p-4 hover:bg-[#F9F6F0]/50 transition-colors ${isActive ? "bg-[#F9F6F0] border-l-4 border-l-[#5C3A21]" : "border-l-4 border-l-transparent"} ${isUnread ? "bg-[#F9F6F0]/30" : ""}`}
                      >
                        <div className="w-12 h-12 bg-[#5C3A21] text-white font-bold rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {opponentPhoto ? (
                            <img src={opponentPhoto} alt={opponentName} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(opponentName)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h3 className={`font-semibold text-sm truncate ${isUnread ? "text-[#5C3A21] font-bold" : "text-[#5C3A21]"}`}>
                              {opponentName}
                            </h3>
                            {chat?.updatedAt?.seconds && (
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {formatDistanceToNow(new Date(chat.updatedAt.seconds * 1000), { addSuffix: true, locale: localeId })}
                              </span>
                            )}
                          </div>
                          
                          {/* Role Badge */}
                          <div className="mb-1.5">
                            {opponentRole === "Admin" ? (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-bold tracking-wider border-[#A67B5B] text-[#A67B5B]">
                                {role === "Admin" ? "ADMIN" : "CUSTOMER SERVICE"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 text-muted-foreground uppercase font-bold tracking-wider">
                                {opponentRole}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <p className={`text-xs truncate ${isUnread ? "text-[#5C3A21] font-medium" : "text-muted-foreground"}`}>
                              {chat?.lastSenderId === currentUid ? "Anda: " : ""}{chat?.lastMessage || "Mulai obrolan..."}
                            </p>
                            {isUnread && (
                              <div className="min-w-[1.25rem] h-5 bg-red-500 rounded-full shrink-0 flex items-center justify-center px-1 text-[10px] text-white font-bold animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Kolom Kanan: Area Percakapan */}
          <div className={`flex-1 flex flex-col bg-white ${!targetUid ? 'hidden md:flex' : 'flex'}`}>
            {!targetUid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-[#F9F6F0] rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-[#A67B5B]" />
                </div>
                <h3 className="text-xl font-bold text-[#5C3A21] mb-2">Pusat Pesan Salin Gaya</h3>
                <p className="text-muted-foreground max-w-sm">
                  Pilih percakapan dari panel di sebelah kiri untuk mulai membaca atau mengirim pesan.
                </p>
              </div>
            ) : (
              <>
                {/* Header Percakapan */}
                <div className="p-4 border-b border-border bg-white flex items-center gap-4 shadow-sm z-10 justify-between">
                  <div className="flex items-center gap-4">
                    <Link to="/inbox" className="md:hidden p-2 bg-[#F9F6F0] rounded-full text-[#5C3A21] hover:bg-stone-200 transition-colors">
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </Link>

                    <div className="w-10 h-10 bg-[#5C3A21] text-white font-bold rounded-full flex items-center justify-center relative shrink-0 shadow-sm overflow-hidden">
                      {receiverPhoto ? (
                         <img src={receiverPhoto} alt={receiverName} className="w-full h-full object-cover" />
                      ) : (
                         getInitials(receiverName)
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#5C3A21] text-base leading-tight flex items-center gap-2">
                        {receiverName}
                        {receiverRole === "Admin" ? (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-bold tracking-wider border-[#A67B5B] text-[#A67B5B]">
                            {role === "Admin" ? "ADMIN" : "CUSTOMER SERVICE"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 text-muted-foreground uppercase font-bold tracking-wider">
                            {receiverRole}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-green-600 font-medium">{receiverStatus}</p>
                    </div>
                  </div>
                  
                  {/* Dropdown Menu Aksi Tambahan */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 hover:bg-[#F9F6F0] rounded-full transition-colors text-[#5C3A21]">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => toast.info("Fitur Lihat Profil belum tersedia.")} className="cursor-pointer flex items-center gap-2">
                        <User className="w-4 h-4" /> Lihat Profil Pengguna
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Laporan pengguna telah dikirim.")} className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600">
                        <AlertTriangle className="w-4 h-4" /> Laporkan Pengguna
                      </DropdownMenuItem>
                      {(role === "Admin" || role === "Penjual") && (
                        <DropdownMenuItem onClick={() => toast.success("Tiket telah ditandai selesai.")} className="cursor-pointer flex items-center gap-2 text-green-600 focus:text-green-600 mt-1 border-t border-border pt-2">
                          <CheckCircle className="w-4 h-4" /> Tandai Tiket Selesai
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Area Pesan */}
                <ScrollArea className="flex-1 p-4 bg-[#F9F6F0]/50">
                  <div className="flex flex-col gap-4 pb-4">
                  {!messages ? (
                    <div className="flex-1 flex flex-col justify-end space-y-4 animate-pulse">
                       <div className="self-end w-2/3 h-12 bg-stone-200 rounded-2xl rounded-tr-sm"></div>
                       <div className="self-start w-1/2 h-12 bg-stone-200 rounded-2xl rounded-tl-sm"></div>
                       <div className="self-end w-3/4 h-12 bg-stone-200 rounded-2xl rounded-tr-sm"></div>
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
                      <div className="px-4 py-2 bg-white text-sm text-[#A67B5B] rounded-lg font-medium border border-[#EBE5D9] shadow-sm">
                        Belum ada percakapan dimulai. Kirim pesan pertama Anda sekarang!
                      </div>
                    </div>
                  ) : (
                    messages?.map((msg) => {
                      if (!msg) return null;
                      const isMe = msg?.senderId === currentUid;
                      return (
                        <div key={msg?.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm border flex flex-col ${
                              isMe
                                ? "bg-[#5C3A21] text-white border-[#5C3A21] rounded-tr-sm"
                                : "bg-[#F9F6F0] text-[#5C3A21] border-[#EBE5D9] rounded-tl-sm"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg?.text}</p>
                            <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? "text-white/70" : "text-[#5C3A21]/50"}`}>
                              <span className="text-[10px]">
                                {msg?.createdAt?.seconds
                                  ? format(new Date(msg.createdAt.seconds * 1000), "HH:mm")
                                  : "Mengirim..."}
                              </span>
                              {isMe && (
                                <span className="text-[10px] ml-1 flex items-center">
                                  {/* Dummy status: always showing "Terkirim" if false, we can hook it up with msg.isRead later if needed */}
                                  {msg?.isRead ? <span className="text-green-300">Dibaca</span> : <span>Terkirim</span>}
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

                {/* Area Input */}
                <div className="p-4 bg-white border-t border-border z-10">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ketik pesan Anda..."
                      className="flex-1 bg-[#F9F6F0] border border-[#EBE5D9] text-[#5C3A21] text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A67B5B]/50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="bg-[#A67B5B] text-white p-3 rounded-xl hover:bg-[#8C674C] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

