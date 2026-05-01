import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Truck, CreditCard, ChevronRight, CheckCircle2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { ref as dbRef, push, set, serverTimestamp, get, child } from "firebase/database";

// Base rates will be dynamically calculated
const COURIERS = [
  { id: "JNE", label: "JNE Regular" },
  { id: "J&T", label: "J&T Express" },
  { id: "SiCepat", label: "SiCepat REG" },
];

const PAYMENT_METHODS = [
  { id: "BCA", label: "Transfer BCA", type: "bank" },
  { id: "MANDIRI", label: "Transfer Mandiri", type: "bank" },
  { id: "GOPAY", label: "GoPay", type: "ewallet" },
  { id: "OVO", label: "OVO", type: "ewallet" },
];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerProvince, setBuyerProvince] = useState("");
  const [sellerAddresses, setSellerAddresses] = useState<Record<string, any>>({});
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  
  const [courier, setCourier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Buyer and Seller Addresses
  React.useEffect(() => {
    const fetchAddresses = async () => {
      if (!currentUser) return;
      setIsLoadingAddresses(true);
      try {
        const rootRef = dbRef(db);
        
        // 1. Fetch Buyer Address
        const buyerSnap = await get(child(rootRef, `users/${currentUser.uid}/address`));
        if (buyerSnap.exists()) {
          const bAddress = buyerSnap.val();
          setAddress(bAddress.street || "");
          setBuyerCity(bAddress.city || "");
          setBuyerProvince(bAddress.province || "");
        }

        // 2. Fetch Seller Addresses (unique sellers)
        const uniqueSellerUids = Array.from(new Set(items.map(i => i.sellerUid || 'admin')));
        const sellerData: Record<string, any> = {};
        
        await Promise.all(uniqueSellerUids.map(async (uid) => {
          if (uid === 'admin') {
            sellerData[uid] = { city: "Jakarta", province: "DKI Jakarta" }; // Mock admin address
            return;
          }
          const sellerSnap = await get(child(rootRef, `users/${uid}/address`));
          if (sellerSnap.exists()) {
            sellerData[uid] = sellerSnap.val();
          } else {
            sellerData[uid] = { city: "Tidak diketahui", province: "Tidak diketahui" };
          }
        }));
        
        setSellerAddresses(sellerData);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [currentUser, items]);

  // Group items by seller for UI
  const itemsBySeller = React.useMemo(() => {
    const groups: Record<string, typeof items> = {};
    items.forEach(item => {
      const sid = item.sellerUid || 'admin';
      if (!groups[sid]) groups[sid] = [];
      groups[sid].push(item);
    });
    return groups;
  }, [items]);

  // Calculate Dynamic Shipping Cost
  const shippingCost = React.useMemo(() => {
    if (!courier || !buyerCity) return 0;
    
    let totalShipping = 0;
    
    // Calculate shipping per seller
    Object.keys(itemsBySeller).forEach(sellerUid => {
      const sAddr = sellerAddresses[sellerUid] || {};
      const sCity = sAddr.city || "";
      const sProv = sAddr.province || "";
      
      let baseRate = 10000; // Base rate
      
      // Courier modifier
      if (courier === "JNE") baseRate += 2000;
      if (courier === "J&T") baseRate += 1000;
      
      // Distance mock logic
      if (sProv.toLowerCase() !== buyerProvince.toLowerCase()) {
        baseRate += 15000; // Beda provinsi
      } else if (sCity.toLowerCase() !== buyerCity.toLowerCase()) {
        baseRate += 5000; // Beda kota, provinsi sama
      }
      
      totalShipping += baseRate;
    });
    
    return totalShipping;
  }, [courier, buyerCity, buyerProvince, sellerAddresses, itemsBySeller]);

  const grandTotal = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (!currentUser) {
      toast.error("Anda belum masuk", { description: "Silakan masuk untuk melanjutkan pembayaran." });
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    if (!address || !courier || !paymentMethod) {
      toast.error("Data belum lengkap", { description: "Mohon lengkapi alamat, ekspedisi, dan metode pembayaran." });
      return;
    }

    setIsProcessing(true);

    try {
      const ordersRef = dbRef(db, "orders");
      const newOrderRef = push(ordersRef);
      
      const orderData = {
        buyerUid: currentUser.uid,
        items: items,
        shippingAddress: {
          street: address,
          city: buyerCity,
          province: buyerProvince
        },
        senderAddresses: sellerAddresses,
        shippingCost: shippingCost,
        courier: courier,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        totalAmount: grandTotal,
        status: "UNPAID",
        createdAt: serverTimestamp(),
      };

      await set(newOrderRef, orderData);

      clearCart();
      toast.success("Pesanan Berhasil Dibuat!", { description: "Mohon segera selesaikan pembayaran Anda." });
      
      // Simulasi pindah ke halaman invoice/dashboard
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Gagal memproses pesanan", { description: error.message });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KIRI: Form Pengiriman & Pembayaran */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Shipping Address */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" /> Alamat Pengiriman
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Detail Alamat Lengkap</label>
                  <textarea 
                    rows={2} 
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Jl. Sudirman No. 123, RT 01/RW 02..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Kota Tujuan</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Kota..."
                      value={buyerCity}
                      onChange={(e) => setBuyerCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Provinsi</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Provinsi..."
                      value={buyerProvince}
                      onChange={(e) => setBuyerProvince(e.target.value)}
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium border border-border hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Pilih Lokasi di Peta (Mockup)
                </button>
              </div>
            </section>

            {/* Routes Summary */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" /> Rute Pengiriman
              </h2>
              {isLoadingAddresses ? (
                <p className="text-sm text-muted-foreground animate-pulse">Menghitung rute...</p>
              ) : (
                <div className="space-y-4">
                  {Object.keys(itemsBySeller).map((sellerUid, index) => {
                    const sCity = sellerAddresses[sellerUid]?.city || "Kota Penjual";
                    const itemCount = itemsBySeller[sellerUid].length;
                    return (
                      <div key={sellerUid} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-bold text-primary text-xs">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Pengiriman dari <span className="text-primary font-bold">{sCity}</span> menuju <span className="text-primary font-bold">{buyerCity || "(Isi Kota)"}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Memuat {itemCount} barang</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Courier Selection */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" /> Ekspedisi
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Ongkos kirim akan dihitung per toko berdasarkan kota asal dan tujuan.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {COURIERS.map((c) => (
                  <label 
                    key={c.id} 
                    className={`border rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center text-center transition-all ${courier === c.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <input 
                      type="radio" 
                      name="courier" 
                      value={c.id} 
                      className="hidden" 
                      checked={courier === c.id}
                      onChange={() => setCourier(c.id)}
                      disabled={isProcessing}
                    />
                    <span className="font-bold text-foreground mb-1">{c.id}</span>
                    <span className="text-xs text-muted-foreground">{c.label}</span>
                    {courier === c.id && <CheckCircle2 className="w-4 h-4 text-primary mt-2" />}
                  </label>
                ))}
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" /> Metode Pembayaran
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label 
                    key={method.id} 
                    className={`border rounded-xl p-4 cursor-pointer flex items-center justify-between transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value={method.id} 
                        className="hidden" 
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        disabled={isProcessing}
                      />
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {method.id}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{method.label}</p>
                        <p className="text-xs text-muted-foreground capitalize">{method.type}</p>
                      </div>
                    </div>
                    {paymentMethod === method.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </label>
                ))}
              </div>
            </section>

          </div>

          {/* KANAN: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Keranjang kosong</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0">
                        <img src={item.images?.[0] || "https://via.placeholder.com/100"} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                      <div className="font-bold text-sm text-foreground shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal Produk</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkos Kirim</span>
                  <span className="font-medium text-foreground">{formatPrice(shippingCost)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border mt-3">
                  <span className="font-bold text-base text-foreground">Total Tagihan</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
                className="w-full mt-6 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? "Memproses..." : "Bayar Sekarang"} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
