import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPin,
  Truck,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, CartItem } from "@/frontend/contexts/CartContext";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { formatPrice, getValidImageUrl } from "@/lib/utils";
import {
  getHaversineDistance,
  getBilledWeight,
  calculateShipping,
  ShippingResult,
} from "@/lib/shippingCalculator";
import Navbar from "@/frontend/components/layout/Navbar";
import Footer from "@/frontend/components/layout/Footer";
import MapModal from "@/frontend/components/ui/MapModal";
import { toast } from "sonner";
import { db, dbFirestore } from "@/backend/config/firebase";
import { collection, addDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore";
import {
  ref as dbRef,
  get,
  child,
} from "firebase/database";

const COURIERS = [
  { id: "JNE", label: "JNE Reguler", logo: "/images/JNE.png", rate: 15000 },
  { id: "J&T", label: "J&T Express", logo: "/images/J&T.png", rate: 18000 },
  { id: "SiCepat", label: "SiCepat HALU", logo: "/images/Sicepat Ekspres.png", rate: 12000 },
];

const PAYMENT_CATEGORIES = [
  {
    id: "qris",
    title: "Pembayaran Instan",
    methods: [{ id: "QRIS", label: "QRIS", logo: "/images/QRIS LOGO.png" }],
  },
  {
    id: "ewallet",
    title: "E-Wallet",
    methods: [
      { id: "GOPAY", label: "GoPay", logo: "/images/Gopay (Alt).png" },
      { id: "OVO", label: "OVO", logo: "/images/ovo.png" },
      { id: "DANA", label: "DANA", logo: "/images/dana.png" },
    ],
  },
  {
    id: "va",
    title: "Transfer Bank (Virtual Account)",
    methods: [
      { id: "BCA", label: "BCA", logo: "/images/BCA.png" },
      { id: "MANDIRI", label: "Mandiri", logo: "/images/Mandiri.png" },
      { id: "BNI", label: "BNI", logo: "/images/BNI.png" },
      { id: "BRI", label: "BRI", logo: "/images/BRI.png" },
    ],
  },
];
const PLATFORM_FEE = 1000;
const PAYMENT_FEE = 2000;

export default function Checkout() {
  const { clearCart } = useCart();
  const cartContext = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  // Sync Keranjang (fallback to session storage to prevent "Keranjang kosong" on refresh)
  useEffect(() => {
    let currentItems: CartItem[] = [];
    if (location.state?.items) {
      currentItems = location.state.items;
      sessionStorage.setItem("checkout_items", JSON.stringify(currentItems));
    } else {
      const sessionItems = sessionStorage.getItem("checkout_items");
      if (sessionItems) {
        currentItems = JSON.parse(sessionItems);
      } else {
        currentItems = cartContext.items;
      }
    }
    setItems(currentItems);
    setSubtotal(
      currentItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
    );
  }, [location.state, cartContext.items]);

  const [address, setAddress] = useState("");
  const [buyerCity, setBuyerCity] = useState("");
  const [buyerProvince, setBuyerProvince] = useState("");
  const [sellerAddresses, setSellerAddresses] = useState<Record<string, any>>(
    {},
  );


  const [courier, setCourier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Inject Midtrans Snap Script
  useEffect(() => {
    const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    
    if (!clientKey) {
      console.warn("Midtrans Client Key is missing in environment variables.");
    }

    const script = document.createElement("script");
    script.src = snapScript;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const [buyerLat, setBuyerLat] = useState<number | null>(null);
  const [buyerLng, setBuyerLng] = useState<number | null>(null);


  // Fetch Buyer and Seller Addresses
  React.useEffect(() => {
    const fetchAddresses = async () => {
      if (!currentUser) return;
      
      try {
        const rootRef = dbRef(db);

        // 1. Fetch Buyer Address
        const buyerSnap = await get(
          child(rootRef, `users/${currentUser.uid}/address`),
        );
        if (buyerSnap.exists()) {
          const bAddress = buyerSnap.val();
          setAddress(bAddress.street || "");
          setBuyerCity(bAddress.city || "");
          setBuyerProvince(bAddress.province || "");
          if (bAddress.lat && bAddress.lng) {
            setBuyerLat(bAddress.lat);
            setBuyerLng(bAddress.lng);
          }
        }

        // 2. Fetch Seller Addresses (unique sellers)
        const uniqueSellerUids = Array.from(
          new Set(items?.map((i) => i.sellerUid || "admin")),
        );
        const sellerData: Record<string, any> = {};

        await Promise.all(
          uniqueSellerUids?.map(async (uid) => {
            if (uid === "admin") {
              sellerData[uid] = {
                city: "Jakarta",
                province: "DKI Jakarta",
                lat: -6.2088,
                lng: 106.8456,
              }; // Mock admin address
              return;
            }
            const sellerSnap = await get(
              child(rootRef, `users/${uid}/address`),
            );
            if (sellerSnap.exists()) {
              const data = sellerSnap.val();
              sellerData[uid] = {
                ...data,
                lat: data.lat || -6.2088,
                lng: data.lng || 106.8456,
              };
              if (!data.lat || !data.lng) {
                toast.warning(
                  `Penjual belum mengatur lokasi pengiriman. Menggunakan koordinat default (Jakarta) untuk ongkir.`,
                );
              }
            } else {
              sellerData[uid] = {
                city: "Tidak diketahui",
                province: "Tidak diketahui",
                lat: -6.2088,
                lng: 106.8456,
              };
              toast.warning(
                `Penjual belum mengatur lokasi pengiriman. Menggunakan koordinat default (Jakarta) untuk ongkir.`,
              );
            }
          }),
        );

        setSellerAddresses(sellerData);
      } catch (error) {
        console.error("Error fetching addresses", error);
      } finally {
        
      }
    };

    fetchAddresses();
  }, [currentUser, items]);

  // Group items by seller for UI
  const itemsBySeller = React.useMemo(() => {
    const groups: Record<string, typeof items> = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const sid = item.sellerUid || "admin";
      if (!groups[sid]) groups[sid] = [];
      groups[sid].push(item);
    });
    return groups;
  }, [items]);

  // State for shipping and weights
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  const { totalWeightKg, totalWeightGrams } = React.useMemo(() => {
    let grams = 0;
    (Array.isArray(items) ? items : []).forEach((item) => {
      const wGram = (item as any).weight ? Number((item as any).weight) : 1000;
      grams += wGram * (item.quantity || 1);
    });
    return { totalWeightGrams: grams, totalWeightKg: Math.ceil(grams / 1000) };
  }, [items]);

  // Calculate Dynamic Shipping Cost
  React.useEffect(() => {
    if (
      !courier ||
      !buyerCity ||
      buyerLat === null ||
      buyerLng === null ||
      Object.keys(sellerAddresses).length === 0
    ) {
      return;
    }

    setIsCalculatingShipping(true);

    // Simulate slight delay to show skeleton
    const timeout = setTimeout(() => {
      const details: Record<
        string,
        ShippingResult & { distanceKm: number; weightKg: number }
      > = {};

      Object.keys(itemsBySeller).forEach((sellerUid) => {
        const sAddr = sellerAddresses[sellerUid] || {};
        const sLat = sAddr.lat || -6.2088;
        const sLng = sAddr.lng || 106.8456;

        // 1. Calculate Distance
        const distanceKm = getHaversineDistance(sLat, sLng, buyerLat, buyerLng);

        // 2. Calculate Total Billed Weight for this seller
        const items = itemsBySeller[sellerUid];
        let totalWeightKg = 0;
        let totalActualKg = 0;
        let totalVolumetricKg = 0;

        items.forEach((item) => {
          const wGram = (item as any).weight ? Number((item as any).weight) : 1000; // Fallback 1000 gram
          const actualW = wGram / 1000;

          const l = (item as any).length ? Number((item as any).length) : 30; // Fallback 30cm
          const w = (item as any).width ? Number((item as any).width) : 20; // Fallback 20cm
          const h = (item as any).height ? Number((item as any).height) : 10; // Fallback 10cm

          const { billedWeight, actualWeight, volumetricWeight } =
            getBilledWeight(actualW, l, w, h);
          totalWeightKg += billedWeight * item.quantity;
          totalActualKg += actualWeight * item.quantity;
          totalVolumetricKg += volumetricWeight * item.quantity;
        });

        // 3. Calculate shipping
        const shippingRes = calculateShipping(
          distanceKm,
          totalWeightKg,
          courier,
        );

        details[sellerUid] = {
          ...shippingRes,
          distanceKm,
          weightKg: totalWeightKg,
        };
      });

      setIsCalculatingShipping(false);
    }, 600);

    return () => clearTimeout(timeout);
  }, [courier, buyerCity, buyerLat, buyerLng, sellerAddresses, itemsBySeller]);

  const shippingCost = React.useMemo(() => {
    const selectedCourier = COURIERS.find(c => c.id === courier);
    if (!selectedCourier) return 0;
    return totalWeightKg * selectedCourier.rate;
  }, [courier, totalWeightKg]);

  const grandTotal = subtotal + shippingCost + (courier ? PLATFORM_FEE + PAYMENT_FEE : 0);

  const handleCheckout = async () => {
    if (!currentUser) {
      toast.error("Anda belum masuk", {
        description: "Silakan masuk untuk melanjutkan pembayaran.",
      });
      navigate("/login");
      return;
    }

    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    if (!address || !buyerCity || !buyerProvince) {
      toast.error("Alamat belum lengkap", {
        description:
          "Mohon lengkapi Nama Jalan, Kota, dan Provinsi pengiriman.",
      });
      return;
    }

    if (buyerLat === null || buyerLng === null) {
      toast.error("Lokasi peta belum ditandai", {
        description:
          "Harap tandai lokasi pengiriman di peta untuk kalkulasi ongkos kirim.",
      });
      return;
    }

    if (!courier) {
      toast.error("Ekspedisi belum dipilih", {
        description: "Harap pilih metode pengiriman (JNE, J&T, dll).",
      });
      return;
    }

    if (!paymentMethod) {
      toast.error("Metode pembayaran belum dipilih", {
        description:
          "Harap pilih salah satu cara pembayaran (QRIS, E-Wallet, atau Bank Transfer).",
      });
      return;
    }

    // Jalur Manual / Gambar Statis Jika Memilih QRIS Non-Automated bawaan tokomu
    if (paymentMethod === "QRIS") {
      setShowQrisModal(true);
      return;
    }

    // ─── JALUR INTEGRASI AUTOMATED MIDTRANS SNAP ───
    setIsProcessingPayment(true);

    try {
      // Membuat ID Pesanan Unik berprefix SG (Salin Gaya)
      const orderId = `SG-${Math.floor(100000 + Math.random() * 900000)}-${Date.now()}`;

      // Menembak endpoint backend Node.js (/api/charge) yang telah disesuaikan
      const response = await fetch("http://localhost:5000/api/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId,
          grossAmount: Math.round(grandTotal), // Midtrans mewajibkan angka bulat integer
          customerDetails: {
            first_name: currentUser.displayName || "Pembeli",
            email: currentUser.email || "",
          },
          itemDetails: items.map((item: any) => ({
            id: item.id,
            price: Math.round(item.price),
            quantity: Number(item.quantity) || 1,
            name:
              item.name.length > 50
                ? item.name.slice(0, 47) + "..."
                : item.name,
          })),
        }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();

        if (data.token) {
          const globalWindow = window as any;
          if (globalWindow.snap) {
            globalWindow.snap.pay(data.token, {
              onSuccess: async function (_result: any) {
                toast.success("Pembayaran Berhasil Diverifikasi Midtrans!");
                await processOrder("paid"); // Simpan ke Firestore dengan status lunas
              },
              onPending: async function (_result: any) {
                toast.info("Menunggu pembayaran diselesaikan pembeli.");
                await processOrder("unpaid"); // Simpan dengan status menunggu transfer
              },
              onError: function (_result: any) {
                toast.error("Transaksi ditolak atau gagal diproses oleh bank.");
              },
              onClose: function () {
                toast.warning(
                  "Anda menutup pop-up Midtrans sebelum menyelesaikan transaksi.",
                );
              },
            });
          } else {
            toast.error("Gagal memuat script pop-up Midtrans Snap di browser.");
          }
        } else {
          toast.error(
            "Gagal mendapatkan token: " +
              (data.error || "Kesalahan internal backend."),
          );
        }
      } else {
        // Fallback Mode Demo jika server backend Node.js belum kamu nyalakan
        toast.info(
          "Mode Demo: Server pembayaran offline, memproses via simulasi antrean.",
        );
        setTimeout(async () => {
          await processOrder("pending_verification");
        }, 1500);
      }
    } catch (error: unknown) {
      toast.error(
        "Terjadi galat koneksi pembayaran: " + (error as Error).message,
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const processOrder = async (overridePaymentStatus = "unpaid") => {
    setIsProcessing(true);

    try {
      const orderData = {
        userId: currentUser.uid,
        buyerUid: currentUser.uid,
        items: items,
        sellerUids: Array.from(new Set(items.map((item: any) => item.sellerUid || "admin"))),
        trackingNumbers: {},
        shippingAddress: {
          street: address,
          city: buyerCity,
          province: buyerProvince,
        },
        shippingMethod: courier,
        shippingCost: shippingCost,
        platformFee: PLATFORM_FEE,
        paymentFee: PAYMENT_FEE,
        totalWeight: totalWeightGrams,
        courier: courier,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        totalAmount: grandTotal,
        paymentStatus: overridePaymentStatus,
        paymentProofUrl: null,
        orderStatus: "pending",
        createdAt: firestoreTimestamp(),
      };

      await addDoc(collection(dbFirestore, "orders"), orderData);

      clearCart();
      toast.success("Pesanan Berhasil Dibuat!", {
        description: overridePaymentStatus === "pending_verification" 
          ? "Pembayaran sedang diverifikasi admin." 
          : "Mohon segera selesaikan pembayaran Anda.",
      });

      setTimeout(() => {
        navigate("/order-success");
      }, 2000);
    } catch (error: unknown) {
      toast.error("Gagal memproses pesanan", { description: (error as Error).message });
      setIsProcessing(false);
    }
  };

  const handleQrisPaid = async () => {
    setShowQrisModal(false);
    await processOrder("pending_verification");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">
          Checkout
        </h1>

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
                  <label className="text-sm font-medium mb-1.5 block">
                    Detail Alamat Lengkap
                  </label>
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
                    <label className="text-sm font-medium mb-1.5 block">
                      Kota Tujuan
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Kota..."
                      value={buyerCity}
                      onChange={(e) => setBuyerCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Provinsi
                    </label>
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
                  onClick={() => setIsMapOpen(true)}
                  className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium border border-border hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Pilih Lokasi di Peta
                </button>
                <AnimatePresence>
                  {(!address || !buyerCity) && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-blue-600 bg-blue-50 mt-3 p-3 rounded-lg border border-blue-100 flex items-center gap-2"
                    >
                      💡 Ayo lengkapi alamatmu agar kami bisa menghitung ongkos
                      kirim terbaik untukmu!
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Shipping Summary */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" /> Ringkasan Berat Pengiriman
              </h2>
              <div className="flex flex-col gap-2 p-4 bg-secondary/50 rounded-lg border border-border/50">
                <div className="flex items-start justify-between">
                  <div>
                     <p className="text-sm font-medium text-foreground">Total Item</p>
                     <p className="text-xs text-muted-foreground">{items.length} barang</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-medium text-foreground">Total Berat</p>
                     <p className="text-xs text-muted-foreground">{totalWeightGrams} gram</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-between">
                   <p className="text-sm font-bold text-foreground">Berat Ditagih (Pembulatan)</p>
                   <p className="text-sm font-bold text-primary">{totalWeightKg} Kg</p>
                </div>
              </div>
            </section>

            {/* Courier Selection */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" /> Ekspedisi
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Ongkir dihitung secara dinamis: Total Berat (dibulatkan ke atas) dikali Tarif Dasar Kurir.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COURIERS?.map((c) => (
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={c.id}
                    className={`relative border rounded-xl px-4 py-2 cursor-pointer flex items-center justify-center text-center transition-all h-16 ${courier === c.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50 bg-white"}`}
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
                    <div className="h-12 w-full flex items-center justify-center">
                      <img
                        src={c.logo}
                        alt={c.label}
                        className="max-h-10 max-w-[90%] object-contain mix-blend-multiply"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          if (e.currentTarget.parentElement) {
                            e.currentTarget.parentElement.innerHTML = `<span class='font-bold text-sm text-foreground'>${c.id}</span>`;
                          }
                        }}
                      />
                    </div>
                    {courier === c.id && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                        <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </motion.label>
                ))}
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" /> Metode
                Pembayaran
              </h2>
              <div className="space-y-6">
                {PAYMENT_CATEGORIES?.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.title}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {category.methods?.map((method) => (
                        <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={method.id}
                          className={`relative border rounded-xl px-4 py-2 cursor-pointer flex items-center justify-center text-center transition-all h-16 ${paymentMethod === method.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50 bg-white"}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            className="hidden"
                            checked={paymentMethod === method.id}
                            onChange={() => setPaymentMethod(method.id)}
                            disabled={isProcessing}
                          />
                          <div className="h-12 w-full flex items-center justify-center">
                            <img
                              src={method.logo}
                              alt={method.label}
                              className="max-h-7 max-w-[75%] object-contain mix-blend-multiply transition-all"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML = `<span class='font-bold text-sm text-foreground'>${method.label}</span>`;
                                }
                              }}
                            />
                          </div>
                          {paymentMethod === method.id && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </motion.label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* KANAN: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                {!items || items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keranjang kosong
                  </p>
                ) : (
                  items?.map((item: any) => (
                    <div key={item.id as string} className="flex gap-3">
                      <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0 border border-border/50">
                        <img
                          src={getValidImageUrl(item)}
                          alt={item.name as string}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.quantity} x {formatPrice(item.price)}
                        </p>
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
                  <span className="text-muted-foreground">Total Harga ({items.length} Barang)</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Ongkos Kirim</span>
                  {isCalculatingShipping ? (
                    <span className="font-medium text-foreground animate-pulse">
                      ...
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">
                      {courier ? formatPrice(shippingCost) : "-"}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Layanan Aplikasi</span>
                  <span className="font-medium text-foreground">
                    {courier ? formatPrice(PLATFORM_FEE) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Biaya Penanganan</span>
                  <span className="font-medium text-foreground">
                    {courier ? formatPrice(PAYMENT_FEE) : "-"}
                  </span>
                </div>
                
                <div className="flex justify-between pt-3 border-t border-border mt-3">
                  <span className="font-bold text-base text-foreground">
                    Total Tagihan
                  </span>
                  <span className="font-bold text-lg text-primary">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                disabled={isProcessing || isProcessingPayment || items.length === 0}
                className="w-full mt-6 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isProcessing || isProcessingPayment ? "Memproses..." : "Bayar Sekarang"}{" "}
                <ChevronRight className="w-5 h-5" />
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] text-center text-muted-foreground mt-4 flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3 h-3 text-green-500" />
                Seluruh transaksi di Salin Gaya dilindungi oleh sistem enkripsi
                aman.
              </motion.p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      {/* Map Modal */}
      <MapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={(addr, city, prov, lat, lng) => {
          setAddress(addr);
          setBuyerCity(city);
          setBuyerProvince(prov);
          setBuyerLat(lat);
          setBuyerLng(lng);
        }}
        sellerLocations={Object.values(sellerAddresses).map((addr) => ({
          lat: addr.lat || -6.2088,
          lng: addr.lng || 106.8456,
        }))}
      />

      {/* QRIS Modal */}
      <AnimatePresence>
        {showQrisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-2xl p-6 shadow-xl border border-border relative text-center"
            >
              <h3 className="text-xl font-bold mb-2">Pembayaran QRIS</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pindai kode QR di bawah ini menggunakan aplikasi M-Banking atau E-Wallet Anda.
              </p>
              
              <div className="bg-white p-4 rounded-xl inline-block mb-4 border border-border shadow-sm">
                <img 
                  src="/images/Qris.jpeg" 
                  alt="QRIS Fatir" 
                  className="w-64 h-64 mx-auto object-contain rounded-md" 
                />
              </div>

              <div className="bg-secondary/50 p-3 rounded-lg border border-border mb-6">
                <p className="text-xs text-muted-foreground mb-1">Total yang harus dibayar:</p>
                <p className="text-xl font-bold text-primary">{formatPrice(grandTotal)}</p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleQrisPaid}
                  disabled={isProcessing}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isProcessing ? "Memproses..." : "Saya Sudah Transfer"}
                </button>
                <button
                  onClick={() => setShowQrisModal(false)}
                  disabled={isProcessing}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
