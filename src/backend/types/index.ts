// ============================================================
// Types & Interfaces — Data models used across the application
// ============================================================

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: "Pembeli" | "Penjual" | "Admin";
  phone?: string;
  photoURL?: string;
  createdAt?: string | number | Date;
  address?: string;
  city?: string;
  province?: string;
  walletBalance?: number;
}

export interface RTDBProduct {
  id: string;
  sellerUid?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category?: string;
  aiEligibilityScore?: string | number;
  createdAt?: string | number | Date;
  stock?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  images?: string[];
  sellerUid?: string;
}

export interface OrderData {
  id?: string;
  orderId?: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  items: OrderItem[];
  totalAmount: number;
  status: "unpaid" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "pending_verification";
  createdAt: string | number | Date;
  shippingAddress?: string;
  shippingCity?: string;
  shippingProvince?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  receiptUrl?: string;
  subtotal?: number;
  shippingCost?: number;
  platformFee?: number;
  paymentFee?: number;
  totalWeight?: number;
  courier?: string;
  paymentProofUrl?: string | null;
  email?: string;
  userId?: string;
  sellerUids?: string[];
  trackingNumbers?: Record<string, string>;
  refundData?: {
    reason: string;
    description: string;
    evidenceImages: string[];
    videoUrl: string;
    requestedAt: any;
    adminDecision?: "approved" | "rejected" | "pending";
    adminNotes?: string;
    returnResi?: string;
  };
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  text: string;
  timestamp: any | number | null;
  isRead: boolean;
  type?: "text" | "image";
}

export interface ChatSession {
  id: string;
  participants: string[];
  participantDetails?: Record<string, {
    name: string;
    photoURL: string | null;
    role: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: any | number | null;
  unreadCount?: Record<string, number>;
  createdAt?: any | number | null;
  updatedAt?: any | number | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating: number;
  reviews: number;
  category: "fashion" | "accessories" | "shoes";
  condition: "A" | "B" | "C";
  seller: string;
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Testimonial {
  name: string;
  rating: number;
  comment: string;
  avatar: string;
}

// ============================================================
// Static Data — Mock/seed data for products and testimonials
// ============================================================



export const testimonials: Testimonial[] = [
  {
    name: "Rina Susanti",
    rating: 5,
    comment:
      "Barangnya original dan kondisinya sangat bagus! Pengiriman juga cepat. Puas banget belanja di Salin Gaya.",
    avatar: "RS",
  },
  {
    name: "Dimas Pratama",
    rating: 5,
    comment:
      "Platform thrifting terbaik! Kurasi produknya premium banget, ga perlu khawatir soal kualitas.",
    avatar: "DP",
  },
  {
    name: "Ayu Lestari",
    rating: 4,
    comment:
      "Suka banget sama koleksinya. Harga terjangkau tapi barangnya berkualitas tinggi. Recommended!",
    avatar: "AL",
  },
];
