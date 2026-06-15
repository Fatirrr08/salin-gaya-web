import React, { createContext, useContext, useEffect, useState } from "react";
import { RTDBProduct } from "@/frontend/components/layout/ProductCard";
import { useAuth } from "@/frontend/contexts/AuthContext";
import { dbFirestore } from "@/backend/config/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

export interface CartItem extends RTDBProduct {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: RTDBProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load dari localStorage saat pertama kali dirender
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
           return parsed.filter(item => item !== null && typeof item === 'object');
        }
        return [];
      } catch (error) {
        return [];
      }
    }
    return [];
  });
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync dengan Firebase saat currentUser berubah (Login / Merging)
  useEffect(() => {
    const initFirebaseCart = async () => {
      if (currentUser) {
        try {
          const cartRef = doc(dbFirestore, "carts", currentUser.uid);
          const cartSnap = await getDoc(cartRef);
          
          let firebaseItems: CartItem[] = [];
          if (cartSnap.exists()) {
            const dataItems = cartSnap.data().items;
            firebaseItems = Array.isArray(dataItems) ? dataItems : [];
          }
          
          // Merge local items with firebase items
          const localItems = Array.isArray(items) ? [...items] : [];
          const merged = [...firebaseItems];
          
          localItems.forEach(localItem => {
            if (!localItem || !localItem.id) return;
            const existing = merged.find(fi => fi && fi.id === localItem.id);
            if (!existing) {
              merged.push(localItem);
            }
          });
          
          setItems(merged);
          
          // Hapus cart lokal untuk menghindari penumpukan
          localStorage.removeItem("cart");
          
          // Push merged back to Firebase
          await setDoc(cartRef, {
            userId: currentUser.uid,
            email: currentUser.email || "",
            items: merged,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
        } catch (error) {
          console.error("Gagal sinkronisasi keranjang Firebase:", error);
        }
      }
      setIsInitialized(true);
    };
    
    initFirebaseCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]); // Gunakan uid agar tidak terlalu sering rerender jika object user berubah tanpa disengaja

  // Simpan ke localStorage ATAU Firebase setiap kali state items berubah
  useEffect(() => {
    if (!isInitialized) return;

    if (currentUser) {
      const syncToFirebase = async () => {
        try {
          const cartRef = doc(dbFirestore, "carts", currentUser.uid);
          await setDoc(cartRef, {
            userId: currentUser.uid,
            email: currentUser.email || "",
            items: items,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error updating cart to Firebase:", error);
        }
      };
      
      syncToFirebase();
    } else {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, currentUser, isInitialized]);

  const addToCart = (product: RTDBProduct) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        toast.warning("Barang ini sudah ada di keranjang Anda!", { description: product.name });
        return prevItems;
      }
      toast.success("Barang berhasil dimasukkan ke keranjang!", { description: product.name });
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    if (quantity > 10) {
      toast.warning("Maksimal kuantitas adalah 10 barang");
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const validItems = Array.isArray(items) ? items : [];
  const totalItems = validItems.reduce((total, item) => total + (item?.quantity || 0), 0);
  const subtotal = validItems.reduce(
    (total, item) => total + (item?.price || 0) * (item?.quantity || 0),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items: validItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
