import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { ref as dbRef, onValue, push, set, serverTimestamp, get, child } from "firebase/database";
import { Send, ArrowLeft, Store, User } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  timestamp: number;
}

export default function ChatPage() {
  const { sellerUid } = useParams<{ sellerUid: string }>();
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [receiverName, setReceiverName] = useState("Pengguna");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Jika tidak login, kembalikan
  useEffect(() => {
    if (currentUser === null) {
      toast.error("Silakan masuk untuk menggunakan fitur chat");
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const buyerUid = role === "Penjual" ? sellerUid : currentUser?.uid;
  const theSellerUid = role === "Penjual" ? currentUser?.uid : sellerUid;
  
  // Create consistent chat ID: buyerUid_sellerUid
  const chatId = `${buyerUid}_${theSellerUid}`;

  useEffect(() => {
    if (!currentUser || !sellerUid) return;

    // Fetch opponent name
    const fetchOpponentName = async () => {
      try {
        const opponentUid = role === "Penjual" ? buyerUid : theSellerUid;
        const snapshot = await get(child(dbRef(db), `users/${opponentUid}`));
        if (snapshot.exists()) {
          setReceiverName(snapshot.val().name || "Pengguna");
        }
      } catch (error) {
        console.error("Error fetching opponent name:", error);
      }
    };
    fetchOpponentName();

    // Listen for messages
    const messagesRef = dbRef(db, `chats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedMessages: ChatMessage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        
        // Sort by timestamp
        loadedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(loadedMessages);
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [currentUser, sellerUid, role, buyerUid, theSellerUid, chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser) return;

    const messageText = inputText.trim();
    setInputText(""); // Optimistic clear

    try {
      const messagesRef = dbRef(db, `chats/${chatId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        senderUid: currentUser.uid,
        text: messageText,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Gagal mengirim pesan");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-3xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-64px)]">
        
        {/* Chat Header */}
        <div className="bg-card border border-border rounded-t-xl p-4 flex items-center gap-4 shadow-sm z-10">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shrink-0">
            {role === "Pembeli" ? <Store className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h2 className="font-bold text-foreground line-clamp-1">{receiverName}</h2>
            <p className="text-xs text-muted-foreground">{role === "Pembeli" ? "Penjual" : "Pembeli"}</p>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 bg-card border-x border-border overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <MessageCircle className="w-12 h-12 mb-2" />
              <p>Belum ada pesan. Mulai percakapan sekarang!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderUid === currentUser.uid;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                      isMine 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-secondary text-secondary-foreground rounded-tl-sm border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.timestamp && (
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="bg-card border border-border rounded-b-xl p-3 shadow-sm">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis pesan..."
              className="flex-1 bg-secondary border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="bg-primary text-primary-foreground p-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}

// Needed because it's used in empty state above
import { MessageCircle } from "lucide-react";
