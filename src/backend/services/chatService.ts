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
  getDoc,
  where,
  increment,
} from "firebase/firestore";
import { dbFirestore } from "@/backend/config/firebase";

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
  updatedAt?: any;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  isRead: boolean;
  createdAt: any;
}

/**
 * Generate a consistent chat room ID from userA and userB
 * Sorted alphabetically to prevent duplication.
 */
export function getChatRoomId(userA: string, userB: string): string {
  return [userA, userB].sort().join('_');
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
  try {
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        id: roomId,
        participants: [userA, userB],
        participantDetails: {
          [userA]: { name: userAName, avatar: userAAvatar, role: userARole },
          [userB]: { name: userBName, avatar: userBAvatar, role: userBRole }
        },
        unreadCount: {
          [userA]: 0,
          [userB]: 0
        },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error("Error creating/opening chat session:", err);
  }
}

/**
 * Send a message in a chat room.
 */
export async function sendMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  text: string,
  receiverId: string
): Promise<void> {
  try {
    const batch = writeBatch(dbFirestore);

    // Add message to subcollection
    const messagesRef = collection(dbFirestore, "chats", roomId, "messages");
    const newMessageRef = doc(messagesRef);
    batch.set(newMessageRef, {
      senderId,
      senderName,
      text,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // Update session document
    const chatRef = doc(dbFirestore, "chats", roomId);
    batch.set(
      chatRef,
      {
        lastMessage: text,
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
 * Subscribe to real-time messages in a chat room.
 */
export function subscribeToMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
  onError?: (error: any) => void
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
