const fs = require('fs');
let code = fs.readFileSync('src/frontend/pages/AdminDashboard.tsx', 'utf8');

// 1. Update imports
code = code.replace(
  'import React, { useState, useEffect } from "react";',
  'import React, { useState, useEffect, useRef } from "react";'
);
code = code.replace(
  'import { collection, getDocs, orderBy, query, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";',
  'import { collection, getDocs, orderBy, query, updateDoc, doc, addDoc, serverTimestamp, onSnapshot, setDoc } from "firebase/firestore";'
);
code = code.replace(
  'import { Loader2, Plus, ShieldAlert, Eye, Package, Image as ImageIcon } from "lucide-react";',
  'import { Loader2, Plus, ShieldAlert, Eye, Package, Image as ImageIcon, MessageSquare, Send } from "lucide-react";'
);

// 2. Add states for Chat inside AdminDashboard
code = code.replace(
  /const \[selectedReceipt, setSelectedReceipt\] = useState<string \| null>\(null\);/,
  `const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Chat States
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState("");
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);`
);

// 3. Add useEffects for fetching active chats and selected chat messages
code = code.replace(
  /const openReceipt = \(url: string\) => \{/,
  `// Fetch Active Chats
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(dbFirestore, "chats"), orderBy("lastUpdatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats: any[] = [];
      snapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
      setActiveChats(chats);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Messages for Selected Chat
  useEffect(() => {
    if (!selectedChat) return;
    const messagesRef = collection(dbFirestore, "chats", selectedChat.uid, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      setChatMessages(msgs);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [selectedChat]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !selectedChat || isSendingReply) return;
    
    setIsSendingReply(true);
    const text = adminReply.trim();
    setAdminReply("");

    try {
      await setDoc(doc(dbFirestore, "chats", selectedChat.uid), {
        lastMessage: text,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });

      await addDoc(collection(dbFirestore, "chats", selectedChat.uid, "messages"), {
        text,
        senderId: currentUser?.uid,
        createdAt: serverTimestamp()
      });
    } catch(err) {
      console.error(err);
      toast.error("Gagal mengirim balasan.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const openReceipt = (url: string) => {`
);

// 4. Add Live Chat Tab
code = code.replace(
  /<TabsTrigger value="products">Manajemen Produk<\/TabsTrigger>/,
  '<TabsTrigger value="products">Manajemen Produk</TabsTrigger>\n            <TabsTrigger value="chat">Live Chat</TabsTrigger>'
);

// 5. Add Live Chat Content
code = code.replace(
  /\{\/\* Add Product Modal \*\/\}/,
  `{/* LIVE CHAT TAB */}
          <TabsContent value="chat">
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex h-[600px]">
              {/* Sidebar: Active Chats */}
              <div className="w-1/3 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border bg-card">
                  <h2 className="font-bold text-foreground">Daftar Percakapan</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {activeChats.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Belum ada pesan masuk.
                    </div>
                  ) : (
                    activeChats.map(chat => (
                      <div 
                        key={chat.id} 
                        onClick={() => setSelectedChat(chat)}
                        className={\`p-4 border-b border-border cursor-pointer transition-colors \${selectedChat?.uid === chat.uid ? "bg-[#A67B5B]/10 border-l-4 border-l-[#A67B5B]" : "hover:bg-muted"}\`}
                      >
                        <h4 className="font-semibold text-sm truncate">{chat.displayName || chat.email || "Unknown User"}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-1">{chat.lastMessage || "Pesan baru..."}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="w-2/3 flex flex-col bg-[#F9F6F0]">
                {selectedChat ? (
                  <>
                    {/* Header */}
                    <div className="p-4 bg-white border-b border-border shadow-sm flex items-center gap-3 z-10">
                       <div className="w-10 h-10 bg-[#A67B5B]/20 rounded-full flex items-center justify-center text-[#A67B5B]">
                         <MessageSquare className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-bold text-foreground">{selectedChat.displayName || "Customer"}</h3>
                         <p className="text-xs text-muted-foreground">{selectedChat.email}</p>
                       </div>
                    </div>
                    
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map(msg => {
                        const isAdmin = msg.senderId === currentUser?.uid;
                        return (
                          <div key={msg.id} className={\`flex \${isAdmin ? "justify-end" : "justify-start"}\`}>
                            <div className={\`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm \${isAdmin ? "bg-[#A67B5B] text-white rounded-br-none" : "bg-white border border-border text-foreground rounded-bl-none"}\`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    {/* Input Reply */}
                    <div className="p-4 bg-white border-t border-border">
                      <form onSubmit={handleSendAdminReply} className="flex gap-2">
                        <input
                          type="text"
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Balas pesan customer..."
                          className="flex-1 px-4 py-2 bg-muted/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-[#A67B5B]/50 transition-all text-sm"
                        />
                        <button
                          type="submit"
                          disabled={!adminReply.trim() || isSendingReply}
                          className="w-10 h-10 rounded-full bg-[#A67B5B] text-white flex items-center justify-center hover:bg-[#8C674C] disabled:opacity-50 transition-colors"
                        >
                          {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                    <p>Pilih percakapan untuk mulai membalas</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Add Product Modal */}`
);

fs.writeFileSync('src/frontend/pages/AdminDashboard.tsx', code);
console.log('Patched AdminDashboard.tsx');
