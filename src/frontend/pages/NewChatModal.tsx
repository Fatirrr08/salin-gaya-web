import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";
import { Input } from "@/frontend/components/ui/input";
import { ScrollArea } from "@/frontend/components/ui/scroll-area";
import { Search, Loader2, MessageCircle } from "lucide-react";
import { getAllUsers } from "@/backend/services/authService";
import { UserData } from "@/backend/types";

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string, userName: string, userRole: string, userPhotoURL?: string | null) => void;
  currentUserId: string;
}

export default function NewChatModal({
  open,
  onOpenChange,
  onSelectUser,
  currentUserId,
}: NewChatModalProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    } else {
      setSearchQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await getAllUsers();
      // Filter out the current user
      const others = allUsers.filter((u) => u.uid && u.uid !== currentUserId);
      setUsers(others);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    );
  });

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayClassName="bg-black/10 backdrop-blur-none" className="sm:max-w-md bg-[#F9F6F0] p-0 overflow-hidden border-[#EBE5D9]">
        <DialogHeader className="p-4 border-b border-[#EBE5D9] bg-white">
          <DialogTitle className="text-[#5C3A21] font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#A67B5B]" />
            Mulai Pesan Baru
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email..."
              className="pl-9 bg-[#F9F6F0] border-[#EBE5D9] focus-visible:ring-[#A67B5B]"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="h-[300px] px-2 pb-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 text-[#A67B5B] animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <p className="text-sm text-stone-500">
                {searchQuery
                  ? "Tidak ada pengguna yang cocok."
                  : "Mulai ketik untuk mencari..."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => onSelectUser(user.uid, user.name || "Pengguna", user.role || "Pembeli", user.photoURL)}
                  className="flex items-center gap-3 p-3 text-left hover:bg-white rounded-xl transition-colors border border-transparent hover:border-[#EBE5D9] group"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EBE5D9]" />
                  ) : (
                    <img src={`https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(user.name || "User")}&backgroundColor=f9f6f0`} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#EBE5D9]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 text-sm truncate group-hover:text-[#5C3A21] transition-colors">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-500 truncate max-w-[120px]">{user.email}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#A67B5B]/10 text-[#5C3A21] font-medium text-[9px] uppercase tracking-wider">
                        {user.role || "Pembeli"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
