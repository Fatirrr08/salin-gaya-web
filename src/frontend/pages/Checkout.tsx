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
import { db } from "@/backend/config/firebase";
import {
  ref as dbRef,
  push,
  set,
  serverTimestamp,
  get,
  child,
} from "firebase/database";

const COURIERS = [
  { id: "JNE", label: "JNE Regular", logo: "/images/JNE.png" },
  { id: "J&T", label: "J&T Express", logo: "/images/J&T.png" },
  { id: "SiCepat", label: "SiCepat REG", logo: "/images/Sicepat Ekspres.png" },
  { id: "Ninja", label: "Ninja Xpress", logo: "/images/Ninja Xpress.png" },
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
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  const [courier, setCourier] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [buyerLat, setBuyerLat] = useState<number | null>(null);
  const [buyerLng, setBuyerLng] = useState<number | null>(null);
  const [shippingDetails, setShippingDetails] = useState<
    Record<
      string,
      ShippingResult & {
        distanceKm: number;
        weightKg: number;
        actualWeightKg: number;
        volumetricWeightKg: number;
      }
    >
  >({});
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

  // Fetch Buyer and Seller Addresses
  React.useEffect(() => {
    const fetchAddresses = async () => {
      if (!currentUser) return;
      setIsLoadingAddresses(true);
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
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [currentUser, items]);

  // Group items by seller for UI
  const itemsBySeller = React.useMemo(() => {
    const groups: Record<string, typeof items> = {};
    items.forEach((item) => {
      const sid = item.sellerUid || "admin";
      if (!groups[sid]) groups[sid] = [];
      groups[sid].push(item);
    });
    return groups;
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
      setShippingDetails({});
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
          const wGram = (item as any).weight || 1000; // Fallback 1000 gram
          const actualW = wGram / 1000;

          const l = (item as any).length || 30; // Fallback 30cm
          const w = (item as any).width || 20; // Fallback 20cm
          const h = (item as any).height || 10; // Fallback 10cm

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
          actualWeightKg: totalActualKg,
          volumetricWeightKg: totalVolumetricKg,
        };
      });

      setShippingDetails(details);
      setIsCalculatingShipping(false);
    }, 600);

    return () => clearTimeout(timeout);
  }, [courier, buyerCity, buyerLat, buyerLng, sellerAddresses, itemsBySeller]);

  const shippingCost = React.useMemo(() => {
    return Object.values(shippingDetails).reduce(
      (sum, detail) => sum + detail.totalCost,
      0,
    );
  }, [shippingDetails]);

  const grandTotal = subtotal + shippingCost;

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

    if (paymentMethod === "QRIS") {
      const orderData = {
        buyerUid: currentUser.uid,
        items: items,
        shippingAddress: {
          street: address,
          city: buyerCity,
          province: buyerProvince,
        },
        senderAddresses: sellerAddresses,
        shippingCost: shippingCost,
        courier: courier,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        totalAmount: grandTotal,
      };

      navigate("/payment/qris", { state: { orderData, grandTotal } });
      return;
    }

    await processOrder();
  };

  const processOrder = async () => {
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
          province: buyerProvince,
        },
        senderAddresses: sellerAddresses,
        shippingCost: shippingCost,
        courier: courier,
        paymentMethod: paymentMethod,
        subtotal: subtotal,
        totalAmount: grandTotal,
        paymentStatus: "unpaid",
        paymentProofUrl: null,
        orderStatus: "pending",
        createdAt: serverTimestamp(),
      };

      await set(newOrderRef, orderData);

      clearCart();
      toast.success("Pesanan Berhasil Dibuat!", {
        description: "Mohon segera selesaikan pembayaran Anda.",
      });

      // Simulasi pindah ke halaman invoice/dashboard
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast.error("Gagal memproses pesanan", { description: error.message });
      setIsProcessing(false);
    }
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

            {/* Routes Summary */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-primary" /> Rute Pengiriman
              </h2>
              {isLoadingAddresses ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Menghitung rute...
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.keys(itemsBySeller).map((sellerUid, index) => {
                    const sCity =
                      sellerAddresses[sellerUid]?.city || "Kota Penjual";
                    const itemCount = itemsBySeller[sellerUid].length;
                    const detail = shippingDetails[sellerUid];

                    return (
                      <div
                        key={sellerUid}
                        className="flex flex-col gap-2 p-3 bg-secondary/50 rounded-lg border border-border/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="font-bold text-primary text-xs">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Pengiriman dari{" "}
                              <span className="text-primary font-bold">
                                {sCity}
                              </span>{" "}
                              menuju{" "}
                              <span className="text-primary font-bold">
                                {buyerCity || "(Isi Kota)"}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Memuat {itemCount} barang
                            </p>
                          </div>
                        </div>

                        {detail && (
                          <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground bg-card p-2 rounded-md">
                            <div>
                              Jarak:{" "}
                              <span className="font-bold text-foreground">
                                {detail.distanceKm} KM
                              </span>
                            </div>
                            <div>
                              Berat Aktual:{" "}
                              <span className="font-bold text-foreground">
                                {detail.actualWeightKg?.toFixed(2)} Kg
                              </span>
                            </div>
                            <div>
                              Berat Volumetrik:{" "}
                              <span className="font-bold text-foreground">
                                {detail.volumetricWeightKg?.toFixed(2)} Kg
                              </span>
                            </div>
                            <div>
                              Berat Tagih:{" "}
                              <span className="font-bold text-primary">
                                {detail.weightKg} Kg
                              </span>
                            </div>
                            <div>
                              Estimasi:{" "}
                              <span className="font-bold text-foreground">
                                {detail.estimatedDays}
                              </span>
                            </div>
                            <div className="w-full mt-1">
                              Tarif Rute:{" "}
                              <span className="font-bold text-primary">
                                {formatPrice(detail.totalCost)}
                              </span>
                            </div>
                          </div>
                        )}
                        {isCalculatingShipping && courier && !detail && (
                          <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                            Memuat Kalkulasi...
                          </div>
                        )}
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
              <p className="text-xs text-muted-foreground mb-4">
                Ongkir dihitung berdasarkan jarak dari lokasi penjual dan berat
                paket (Aktual/Volumetrik) demi keadilan harga.
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
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keranjang kosong
                  </p>
                ) : (
                  items?.map((item: any) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded bg-muted overflow-hidden shrink-0 border border-border/50">
                        <img
                          src={getValidImageUrl(item)}
                          alt={item.name}
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
                  <span className="text-muted-foreground">Subtotal Produk</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkos Kirim</span>
                  {isCalculatingShipping ? (
                    <span className="font-medium text-foreground animate-pulse">
                      ...
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">
                      {formatPrice(shippingCost)}
                    </span>
                  )}
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
                disabled={isProcessing || items.length === 0}
                className="w-full mt-6 py-3.5 bg-primary text-primary-foreground font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {isProcessing ? "Memproses..." : "Bayar Sekarang"}{" "}
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
    </div>
  );
}
