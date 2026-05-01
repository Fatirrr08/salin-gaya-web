import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, ShoppingCart, MessageCircle, Shield, ArrowLeft, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { ref as dbRef, get, child, onValue, push, set, serverTimestamp } from "firebase/database";
import { toast } from "sonner";
import { RTDBProduct } from "@/components/ProductCard";
import { formatPrice } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: number;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { currentUser } = useAuth();
  
  const [product, setProduct] = useState<RTDBProduct | null>(null);
  const [sellerName, setSellerName] = useState("Penjual");
  const [isLoading, setIsLoading] = useState(true);
  
  // Review states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const snapshot = await get(child(dbRef(db), `products/${id}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setProduct({ id, ...data });
          
          // Fetch seller name if sellerUid exists
          if (data.sellerUid) {
            const sellerSnap = await get(child(dbRef(db), `users/${data.sellerUid}`));
            if (sellerSnap.exists() && sellerSnap.val().name) {
              setSellerName(sellerSnap.val().name);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();

    // Listen for reviews
    const reviewsRef = dbRef(db, `reviews/${id}`);
    const unsubscribe = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedReviews: Review[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        loadedReviews.sort((a, b) => b.createdAt - a.createdAt);
        setReviews(loadedReviews);
      } else {
        setReviews([]);
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      toast.success("Masuk Keranjang", { description: `${product.name} ditambahkan.` });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Silakan login untuk memberikan ulasan");
      navigate("/login");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Ulasan tidak boleh kosong");
      return;
    }
    if (!id) return;

    setIsSubmittingReview(true);
    try {
      const reviewRef = push(dbRef(db, `reviews/${id}`));
      await set(reviewRef, {
        rating: newRating,
        comment: newComment,
        reviewerName: currentUser.displayName || "Pengguna",
        createdAt: serverTimestamp()
      });
      
      toast.success("Ulasan berhasil dikirim");
      setNewComment("");
      setNewRating(5);
    } catch (error) {
      console.error("Failed to submit review", error);
      toast.error("Gagal mengirim ulasan");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center flex-1">
          <p className="text-muted-foreground">Produk tidak ditemukan.</p>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Kembali ke Home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-xl overflow-hidden bg-muted border border-border"
          >
            <img 
              src={product.images?.[0] || "https://via.placeholder.com/600"} 
              alt={product.name} 
              className="w-full h-full object-cover" 
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            <div>
              {product.aiEligibilityScore === "LAYAK" && (
                <span className="inline-block bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase">
                  Verified by AI
                </span>
              )}
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < Math.floor(Number(averageRating)) ? "fill-orange-400 text-orange-400" : "text-border"}`} 
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">{averageRating}</span>
                <span className="text-sm text-muted-foreground">({reviews.length} ulasan)</span>
              </div>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              </div>

              <div className="mt-8">
                <h3 className="font-medium text-foreground mb-2">Deskripsi Produk</h3>
                <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">{product.description}</p>
              </div>

              <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  Dijual oleh: <span className="font-bold text-foreground">{sellerName}</span>
                </p>
              </div>
            </div>

            <div className="mt-auto pt-8 flex gap-3">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" /> Masukkan Keranjang
              </button>
              <Link 
                to={`/chat/${product.sellerUid || 'admin'}`}
                className="px-6 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <MessageCircle className="w-5 h-5" /> Chat
              </Link>
            </div>

            <div className="mt-6 p-4 bg-card rounded-lg border border-border flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Transaksi Aman</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pembayaran dilindungi oleh sistem escrow. Dana diteruskan ke penjual setelah barang Anda terima.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* REVIEWS SECTION */}
        <div className="border-t border-border pt-10">
          <h2 className="text-2xl font-bold text-foreground mb-6">Ulasan Pembeli</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Review Form */}
            <div className="md:col-span-1 bg-card border border-border p-6 rounded-xl h-fit">
              <h3 className="font-bold text-lg mb-4">Tulis Ulasan</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star className={`w-8 h-8 ${star <= newRating ? 'fill-orange-400 text-orange-400' : 'text-border'} hover:scale-110 transition-transform`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ulasan Anda</label>
                  <textarea 
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Bagaimana kualitas barang ini?"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmittingReview || !newComment.trim()}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kirim Ulasan
                </button>
              </form>
            </div>

            {/* Reviews List */}
            <div className="md:col-span-2 space-y-4">
              {reviews.length === 0 ? (
                <div className="p-8 text-center bg-secondary/30 rounded-xl border border-border border-dashed">
                  <p className="text-muted-foreground">Belum ada ulasan untuk produk ini. Jadilah yang pertama!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="p-5 bg-card border border-border rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center font-bold text-muted-foreground uppercase">
                          {review.reviewerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{review.reviewerName}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-orange-400 text-orange-400" : "text-border"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('id-ID') : 'Baru saja'}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-3 leading-relaxed">{review.comment}</p>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
