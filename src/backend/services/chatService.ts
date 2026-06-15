// ============================================================
// Chat Service — Firebase Firestore operations for chat messages
// All chat-related Firebase calls are centralized here.
// ============================================================

import {
  collection,
  doc,
  setDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  increment,
} from "firebase/firestore";
import {
  ref as rtdbRef,
  set,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp
} from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import { dbFirestore, db, storage } from "@/backend/config/firebase";

export interface ParticipantDetail {
  name: string;
  avatar: string | null;
  role: string;
}

export interface ChatSession {
  id: string; // userA_userB
  participants: string[];
  participantDetails: Record<string, ParticipantDetail>;
  lastMessage?: string;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  updatedAt?: any | number | null;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string; // Menambahkan support gambar
  isRead: boolean;
  createdAt: any | number | null;
  isEdited?: boolean;
  isDeleted?: boolean;
}

/**
 * Generate a consistent chat room ID from userA and userB
 * Sorted alphabetically to prevent duplication.
 */
export function getChatRoomId(userA: string, userB: string): string {
  return `chat_${[userA, userB].sort().join('_')}`;
}

/**
 * Start or open a chat session.
 * Creates the session document if it doesn't exist.
 */
export async function createOrOpenChatSession(
  roomId: string,
  userA: string,
  userAName: string,
  userAAvatar: string | null,
  userARole: string,
  userB: string,
  userBName: string,
  userBAvatar: string | null,
  userBRole: string
): Promise<void> {
  const chatRef = doc(dbFirestore, "chats", roomId);
  await setDoc(chatRef, {
    id: roomId,
    participants: [userA, userB],
    participantDetails: {
      [userA]: { name: userAName, avatar: userAAvatar, role: userARole },
      [userB]: { name: userBName, avatar: userBAvatar, role: userBRole }
    },
    // Note: we don't set updatedAt here to avoid overriding the latest message time
    // It will be set when a message is sent.
  }, { merge: true });
}

/**
 * Send a message in a chat room.
 */
export async function sendMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
  receiverId: string,
  imageUrl?: string
): Promise<void> {
  try {
    const batch = writeBatch(dbFirestore);

    // Add message to subcollection
    const messagesRef = collection(dbFirestore, "chats", roomId, "messages");
    const newMessageRef = doc(messagesRef);
    
    const messageData: any = {
      senderId,
      senderName,
      text,
      isRead: false,
      createdAt: serverTimestamp(),
    };
    
    if (imageUrl) {
      messageData.imageUrl = imageUrl;
    }
    
    batch.set(newMessageRef, messageData);

    // Update session document
    const chatRef = doc(dbFirestore, "chats", roomId);
    batch.set(
      chatRef,
      {
        lastMessage: imageUrl ? "📷 Photo" : text,
        lastSenderId: senderId,
        updatedAt: serverTimestamp(),
        [`unreadCount.${receiverId}`]: increment(1)
      },
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.error("Error sending message:", err);
    throw err;
  }
}

/**
 * Edit a message if it was sent within the last 2 minutes.
 */
export async function editMessage(roomId: string, messageId: string, newText: string, createdAtMillis: number): Promise<void> {
  const timeDiff = Date.now() - createdAtMillis;
  // 2 minutes = 120,000 milliseconds
  if (timeDiff > 120000) {
    throw new Error("Pesan ini sudah lebih dari 2 menit dan tidak dapat diedit lagi.");
  }
  
  const messageRef = doc(dbFirestore, "chats", roomId, "messages", messageId);
  await setDoc(messageRef, {
    text: newText,
    isEdited: true
  }, { merge: true });
  
  // Optionally update lastMessage in the session if this was the latest message
  // For simplicity, we can let it be, or update it if we want it completely synced.
}

/**
 * Delete a message (Soft delete: hides content but keeps the bubble).
 */
export async function deleteMessage(roomId: string, messageId: string): Promise<void> {
  const messageRef = doc(dbFirestore, "chats", roomId, "messages", messageId);
  await setDoc(messageRef, {
    isDeleted: true
  }, { merge: true });
}

/**
 * Mark all unread messages from the sender as read.
 */
export async function markMessagesAsRead(roomId: string, currentUserId: string): Promise<void> {
  try {
    const messagesRef = collection(dbFirestore, "chats", roomId, "messages");
    // Get messages not sent by current user that are unread
    const qUnread = query(
      messagesRef,
      where("senderId", "!=", currentUserId)
    );
    
    const snap = await getDocs(qUnread);
    const batch = writeBatch(dbFirestore);
    let count = 0;
    
    snap.forEach((docSnap) => {
      if (docSnap.data().isRead === false) {
        batch.update(docSnap.ref, { isRead: true });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
}

/**
 * Subscribe to real-time messages in a chat room.
 */
export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const messagesRef = collection(dbFirestore, "chats", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  try {
    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      callback(messages);
    }, (error) => {
      console.error("Firestore Error in subscribeToMessages:", error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.error("Sync error in subscribeToMessages:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Mark a chat session as read for a specific user.
 */
export async function markChatAsRead(roomId: string, userId: string): Promise<void> {
  try {
    const chatRef = doc(dbFirestore, "chats", roomId);
    await setDoc(chatRef, { [`unreadCount.${userId}`]: 0 }, { merge: true });
  } catch (err) {
    console.error("Error marking chat as read:", err);
  }
}

/**
 * Subscribe to user chats for ChatModal
 */
export function subscribeToUserChats(
  userId: string,
  callback: (chats: ChatSession[]) => void
): () => void {
  const q = query(
    collection(dbFirestore, "chats"),
    where("participants", "array-contains", userId)
  );

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const chats: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          chats.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
        });
        
        // Manual sort in memory to prevent missing index errors
        chats.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        callback(chats);
      },
      (error) => {
        console.error("subscribeToUserChats Error:", error);
        callback([]);
      }
    );
  } catch (err) {
    console.error("Sync error in subscribeToUserChats:", err);
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to all chats for Admin
 */
export function subscribeToAdminChats(
  callback: (chats: ChatSession[]) => void
): () => void {
  const q = query(collection(dbFirestore, "chats"));

  try {
    return onSnapshot(
      q,
      (snapshot) => {
        const chats: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          chats.push({ id: docSnap.id, ...docSnap.data() } as ChatSession);
        });
        
        chats.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        callback(chats);
      },
      (error) => {
        console.error("subscribeToAdminChats Error:", error);
        callback([]);
      }
    );
  } catch (err) {
    console.error("Sync error in subscribeToAdminChats:", err);
    callback([]);
    return () => {};
  }
}

// ============================================================
// Realtime Database & Storage Methods (WhatsApp Features)
// ============================================================

/**
 * Set status Online/Offline untuk user
 */
export function setOnlineStatus(userId: string) {
  const userStatusRef = rtdbRef(db, `/status/${userId}`);
  const connectedRef = rtdbRef(db, ".info/connected");

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }
    
    // Saat diskonek, ubah jadi offline dan catat waktu
    onDisconnect(userStatusRef).set({
      online: false,
      lastSeen: rtdbServerTimestamp()
    }).then(() => {
      // Saat konek, set online
      set(userStatusRef, {
        online: true,
        lastSeen: rtdbServerTimestamp()
      });
    });
  });
}

/**
 * Dengarkan status online lawan bicara
 */
export function subscribeToOnlineStatus(userId: string, callback: (status: { online: boolean; lastSeen: number | null }) => void) {
  const userStatusRef = rtdbRef(db, `/status/${userId}`);
  return onValue(userStatusRef, (snapshot) => {
    callback(snapshot.val());
  });
}

/**
 * Set status Typing per room
 */
export function setTypingStatus(roomId: string, userId: string, isTyping: boolean) {
  const typingRef = rtdbRef(db, `/typing/${roomId}/${userId}`);
  set(typingRef, isTyping);
  if (isTyping) {
    onDisconnect(typingRef).set(false);
  }
}

/**
 * Dengarkan status Typing lawan bicara di sebuah room
 */
export function subscribeToTypingStatus(roomId: string, callback: (typingUsers: Record<string, boolean>) => void) {
  const typingRef = rtdbRef(db, `/typing/${roomId}`);
  return onValue(typingRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

/**
 * Upload gambar ke Firebase Storage untuk chat
 */
export async function uploadChatImage(file: File, roomId: string, senderId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `chats/${roomId}/${Date.now()}_${senderId}.${fileExt}`;
    const imageRef = storageRef(storage, fileName);
    
    const uploadTask = uploadBytesResumable(imageRef, file);
    
    uploadTask.on(
      "state_changed",
      null,
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

/**
 * Update the user's name and avatar in all their active P2P chats
 */
export async function syncUserProfileToChats(uid: string, newName: string, newAvatar: string | null): Promise<void> {
  try {
    const q = query(collection(dbFirestore, "chats"), where("participants", "array-contains", uid));
    const snap = await getDocs(q);
    const batch = writeBatch(dbFirestore);
    snap.forEach((chatDoc) => {
      batch.update(chatDoc.ref, {
        [`participantDetails.${uid}.name`]: newName,
        [`participantDetails.${uid}.avatar`]: newAvatar
      });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error syncing profile to chats:", err);
  }
}
