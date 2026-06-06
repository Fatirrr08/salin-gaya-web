// ============================================================
// Product Service — Firebase RTDB operations for products
// All product-related Firebase calls are centralized here.
// ============================================================

import { ref, set, get, push, remove, onValue, off } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/backend/config/firebase";

export interface RTDBProduct {
  id: string;
  sellerUid?: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  aiEligibilityScore: string;
  createdAt: any | number | string | null;
}

/**
 * Fetch all products from RTDB (one-time read).
 */
export async function getAllProducts(): Promise<RTDBProduct[]> {
  const snapshot = await get(ref(db, "products"));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data).map(([id, val]: [string, any]) => ({
    id,
    ...val,
  }));
}

/**
 * Fetch products by a specific seller UID.
 */
export async function getProductsBySeller(sellerUid: string): Promise<RTDBProduct[]> {
  const all = await getAllProducts();
  return all?.filter((p) => p.sellerUid === sellerUid);
}

/**
 * Fetch a single product by ID.
 */
export async function getProductById(productId: string): Promise<RTDBProduct | null> {
  const snapshot = await get(ref(db, `products/${productId}`));
  if (!snapshot.exists()) return null;
  return { id: productId, ...snapshot.val() };
}

/**
 * Upload product images to Firebase Storage and return download URLs.
 */
export async function uploadProductImages(
  files: File[],
  sellerUid: string
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const fileRef = storageRef(storage, `products/${sellerUid}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const url = await getDownloadURL(snapshot.ref);
    urls.push(url);
  }
  return urls;
}

/**
 * Create a new product in RTDB.
 */
export async function createProduct(
  product: Omit<RTDBProduct, "id">,
  sellerUid: string
): Promise<string> {
  const newRef = push(ref(db, "products"));
  await set(newRef, {
    ...product,
    sellerUid,
    createdAt: Date.now(),
  });
  return newRef.key!;
}

/**
 * Delete a product by ID.
 */
export async function deleteProduct(productId: string): Promise<void> {
  await remove(ref(db, `products/${productId}`));
}

/**
 * Subscribe to real-time product updates (returns unsubscribe function).
 */
export function subscribeToProducts(
  callback: (products: RTDBProduct[]) => void
): () => void {
  const productsRef = ref(db, "products");
  onValue(productsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const products = Object.entries(data).map(([id, val]: [string, any]) => ({
      id,
      ...val,
    }));
    callback(products);
  });
  return () => off(productsRef);
}
