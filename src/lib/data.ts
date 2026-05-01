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

export const products: Product[] = [
  {
    id: "1",
    name: "Tas Luna Luca",
    price: 10000000,
    originalPrice: 20000000,
    imageUrl: "/images/product-1.jpg",
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
    imageUrl: "/images/product-2.jpg",
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
    imageUrl: "/images/product-3.jpg",
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
    imageUrl: "/images/product-4.jpg",
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
    imageUrl: "/images/product-5.jpg",
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
    imageUrl: "/images/product-6.jpg",
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
    imageUrl: "/images/product-7.jpg",
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
    imageUrl: "/images/product-8.jpg",
    rating: 4.8,
    reviews: 20,
    category: "fashion",
    condition: "A",
    seller: "Salin Gaya",
    description: "Hoodie Gru M8 keren.",
  },
];

export const testimonials = [
  {
    name: "Rina Susanti",
    rating: 5,
    comment: "Barangnya original dan kondisinya sangat bagus! Pengiriman juga cepat. Puas banget belanja di Salin Gaya.",
    avatar: "RS",
  },
  {
    name: "Dimas Pratama",
    rating: 5,
    comment: "Platform thrifting terbaik! Kurasi produknya premium banget, ga perlu khawatir soal kualitas.",
    avatar: "DP",
  },
  {
    name: "Ayu Lestari",
    rating: 4,
    comment: "Suka banget sama koleksinya. Harga terjangkau tapi barangnya berkualitas tinggi. Recommended!",
    avatar: "AL",
  },
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}
