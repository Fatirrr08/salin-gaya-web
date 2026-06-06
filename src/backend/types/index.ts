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

export const products: Product[] = [
  {
    id: "1",
    name: "Tas Luna Luca",
    price: 10000000,
    originalPrice: 20000000,
    imageUrl: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?q=80&w=600&auto=format&fit=crop",
    rating: 4.5,
    reviews: 12,
    category: "accessories",
    condition: "A",
    seller: "Salin Gaya",
    description: "Tas Luna Luca original.",
  },
  {
    id: "2",
    name: "Celana Panjang Xsive",
    price: 50000,
    originalPrice: 100000,
    imageUrl: "https://images.unsplash.com/photo-1624378439575-d1ead6bb17f1?q=80&w=600&auto=format&fit=crop",
    rating: 4.8,
    reviews: 47,
    category: "fashion",
    condition: "A",
    seller: "Salin Gaya",
    description: "Celana Panjang Xsive kondisi sangat baik.",
  },
  {
    id: "3",
    name: "Kaos Coolane B1",
    price: 70000,
    originalPrice: 150000,
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop",
    rating: 4.5,
    reviews: 66,
    category: "fashion",
    condition: "A",
    seller: "Salin Gaya",
    description: "Kaos Coolane B1 yang nyaman.",
  },
  {
    id: "4",
    name: "Sepatu Converse J2",
    price: 280000,
    originalPrice: 400000,
    imageUrl: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=600&auto=format&fit=crop",
    rating: 4.7,
    reviews: 88,
    category: "shoes",
    condition: "A",
    seller: "Salin Gaya",
    description: "Sepatu Converse J2 hitam.",
  },
  {
    id: "5",
    name: "Sepatu Adidas KL4",
    price: 200000,
    originalPrice: 700000,
    imageUrl: "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?q=80&w=600&auto=format&fit=crop",
    rating: 5.0,
    reviews: 18,
    category: "shoes",
    condition: "A",
    seller: "Salin Gaya",
    description: "Sepatu Adidas KL4 nyaman dipakai.",
  },
  {
    id: "6",
    name: "Tas Creampy H3",
    price: 100000,
    originalPrice: 200000,
    imageUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=600&auto=format&fit=crop",
    rating: 4.7,
    reviews: 30,
    category: "accessories",
    condition: "A",
    seller: "Salin Gaya",
    description: "Tas Creampy H3 yang cantik.",
  },
  {
    id: "7",
    name: "Baju Numpyy F7",
    price: 80000,
    originalPrice: 250000,
    imageUrl: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop",
    rating: 4.9,
    reviews: 40,
    category: "fashion",
    condition: "A",
    seller: "Salin Gaya",
    description: "Baju Numpyy F7 untuk gaya kasual.",
  },
  {
    id: "8",
    name: "Hoodie Gru M8",
    price: 120000,
    originalPrice: 550000,
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
    rating: 4.8,
    reviews: 20,
    category: "fashion",
    condition: "A",
    seller: "Salin Gaya",
    description: "Hoodie Gru M8 keren.",
  },
];

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
