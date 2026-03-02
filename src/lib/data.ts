import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";
import product5 from "@/assets/product-5.jpg";
import product6 from "@/assets/product-6.jpg";
import product7 from "@/assets/product-7.jpg";
import product8 from "@/assets/product-8.jpg";

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
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
    name: "Leather Tote Bag - Camel",
    price: 450000,
    originalPrice: 1200000,
    image: product1,
    rating: 4.8,
    reviews: 24,
    category: "accessories",
    condition: "A",
    seller: "VintageByLisa",
    description: "Tas kulit asli premium dengan warna camel yang timeless. Kondisi sangat baik, hanya dipakai beberapa kali.",
  },
  {
    id: "2",
    name: "Classic White Sneakers",
    price: 280000,
    originalPrice: 800000,
    image: product2,
    rating: 4.5,
    reviews: 18,
    category: "shoes",
    condition: "A",
    seller: "SneakerHeaven",
    description: "Sneakers putih klasik yang cocok untuk segala outfit. Masih sangat bersih dan terawat.",
  },
  {
    id: "3",
    name: "Vintage Denim Jacket",
    price: 350000,
    originalPrice: 900000,
    image: product3,
    rating: 4.9,
    reviews: 31,
    category: "fashion",
    condition: "A",
    seller: "DenimCollective",
    description: "Jaket denim vintage dengan wash yang sempurna. Bahan tebal dan kokoh, sangat nyaman dipakai.",
  },
  {
    id: "4",
    name: "Tortoise Shell Sunglasses",
    price: 175000,
    originalPrice: 500000,
    image: product4,
    rating: 4.6,
    reviews: 12,
    category: "accessories",
    condition: "A",
    seller: "OpticStyle",
    description: "Kacamata hitam tortoise shell dengan frame gold. Lensa UV protection, kondisi seperti baru.",
  },
  {
    id: "5",
    name: "Gold Minimalist Watch",
    price: 520000,
    originalPrice: 1500000,
    image: product5,
    rating: 4.7,
    reviews: 9,
    category: "accessories",
    condition: "B",
    seller: "TimeKeepers",
    description: "Jam tangan gold minimalis yang elegan. Masih berfungsi sempurna dengan beberapa goresan kecil.",
  },
  {
    id: "6",
    name: "Floral Summer Dress",
    price: 220000,
    originalPrice: 650000,
    image: product6,
    rating: 4.4,
    reviews: 15,
    category: "fashion",
    condition: "A",
    seller: "FloralBoutique",
    description: "Dress bunga cantik untuk musim panas. Bahan adem dan ringan, cocok untuk acara kasual.",
  },
  {
    id: "7",
    name: "Black Leather Boots",
    price: 380000,
    originalPrice: 1100000,
    image: product7,
    rating: 4.8,
    reviews: 22,
    category: "shoes",
    condition: "B",
    seller: "BootsFactory",
    description: "Boots kulit hitam klasik. Kokoh dan tahan lama, cocok untuk tampilan edgy.",
  },
  {
    id: "8",
    name: "Tan Crossbody Bag",
    price: 295000,
    originalPrice: 750000,
    image: product8,
    rating: 4.3,
    reviews: 20,
    category: "accessories",
    condition: "A",
    seller: "BagLover",
    description: "Tas selempang kulit tan dengan buckle detail. Ukuran pas untuk daily use.",
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
