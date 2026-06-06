const fs = require('fs');
let code = fs.readFileSync('src/frontend/pages/Checkout.tsx', 'utf8');

// 1. Add Firestore imports
code = code.replace(
  'import { db } from "@/backend/config/firebase";',
  'import { db, dbFirestore } from "@/backend/config/firebase";\nimport { collection, addDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore";'
);

// 2. Update COURIERS
code = code.replace(
  /const COURIERS = \[\s*\{ id: "JNE"[\s\S]*?\s\];/,
  `const COURIERS = [
  { id: "JNE", label: "JNE Reguler", logo: "/images/JNE.png", rate: 15000 },
  { id: "J&T", label: "J&T Express", logo: "/images/J&T.png", rate: 18000 },
  { id: "SiCepat", label: "SiCepat HALU", logo: "/images/Sicepat Ekspres.png", rate: 12000 },
];`
);

// 3. Remove shippingDetails state and calculate total weight instead
code = code.replace(
  /const \[shippingDetails, setShippingDetails\][\s\S]*?setIsCalculatingShipping\(false\);\n  \}, \[courier, buyerCity, buyerLat, buyerLng, sellerAddresses, itemsBySeller\]\);/g,
  `const totalWeightGrams = React.useMemo(() => {
    return items.reduce((total, item) => total + ((item as any).weight || 300) * item.quantity, 0);
  }, [items]);
  
  const totalWeightKg = Math.ceil(totalWeightGrams / 1000);`
);

// 4. Update shippingCost calculation
code = code.replace(
  /const shippingCost = React.useMemo\(\(\) => \{[\s\S]*?\}, \[shippingDetails\]\);/,
  `const shippingCost = React.useMemo(() => {
    const selectedCourier = COURIERS.find(c => c.id === courier);
    if (!selectedCourier) return 0;
    return totalWeightKg * selectedCourier.rate;
  }, [courier, totalWeightKg]);`
);

// 5. Update processOrder for Firestore and requested fields
code = code.replace(
  /const processOrder = async \(overridePaymentStatus = "unpaid"\) => \{[\s\S]*?try \{[\s\S]*?const ordersRef = dbRef\(db, "orders"\);\n\s*const newOrderRef = push\(ordersRef\);[\s\S]*?const orderData = \{[\s\S]*?createdAt: serverTimestamp\(\),\n\s*\};[\s\S]*?await set\(newOrderRef, orderData\);/,
  `const processOrder = async (overridePaymentStatus = "unpaid") => {
    setIsProcessing(true);

    try {
      const orderData = {
        userId: currentUser.uid,
        buyerUid: currentUser.uid,
        items: items,
        shippingAddress: {
          street: address,
          city: buyerCity,
          province: buyerProvince,
        },
        shippingMethod: courier,
        shippingCost: shippingCost,
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

      await addDoc(collection(dbFirestore, "orders"), orderData);`
);

// 6. Update "Rute Pengiriman" UI
code = code.replace(
  /\{\/\* Routes Summary \*\/\}[\s\S]*?\{\/\* Courier Selection \*\/\}/,
  `{/* Shipping Summary */}
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

            {/* Courier Selection */}`
);

// 7. Update Courier Selection description text
code = code.replace(
  /Ongkir dihitung berdasarkan jarak dari lokasi penjual dan berat\s*paket \(Aktual\/Volumetrik\) demi keadilan harga./,
  "Ongkir dihitung secara dinamis: Total Berat (dibulatkan ke atas) dikali Tarif Dasar Kurir."
);

fs.writeFileSync('src/frontend/pages/Checkout.tsx', code);
console.log('Patched Checkout.tsx');
