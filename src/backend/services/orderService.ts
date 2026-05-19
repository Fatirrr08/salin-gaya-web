// ============================================================
// Order Service — Firebase RTDB operations for orders
// All order-related Firebase calls are centralized here.
// ============================================================

import { ref, set, get, push, onValue, off } from "firebase/database";
import { db } from "@/backend/config/firebase";

export interface Order {
  id: string;
  buyerUid: string;
  sellerUid: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: number;
  shippingAddress?: string;
}

/**
 * Create a new order in RTDB.
 */
export async function createOrder(
  order: Omit<Order, "id" | "createdAt">
): Promise<string> {
  const newRef = push(ref(db, "orders"));
  await set(newRef, {
    ...order,
    createdAt: Date.now(),
  });
  return newRef.key!;
}

/**
 * Get all orders for a specific buyer.
 */
export async function getOrdersByBuyer(buyerUid: string): Promise<Order[]> {
  const snapshot = await get(ref(db, "orders"));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, val]: [string, any]) => ({ id, ...val }))
    .filter((o: Order) => o.buyerUid === buyerUid)
    .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
}

/**
 * Get all orders for a specific seller.
 */
export async function getOrdersBySeller(sellerUid: string): Promise<Order[]> {
  const snapshot = await get(ref(db, "orders"));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.entries(data)
    .map(([id, val]: [string, any]) => ({ id, ...val }))
    .filter((o: Order) => o.sellerUid === sellerUid)
    .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
}

/**
 * Update the status of an order.
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order["status"]
): Promise<void> {
  await set(ref(db, `orders/${orderId}/status`), status);
}

/**
 * Subscribe to real-time order updates for a buyer (returns unsubscribe fn).
 */
export function subscribeToOrdersByBuyer(
  buyerUid: string,
  callback: (orders: Order[]) => void
): () => void {
  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const orders = Object.entries(data)
      .map(([id, val]: [string, any]) => ({ id, ...val }))
      .filter((o: Order) => o.buyerUid === buyerUid)
      .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
    callback(orders);
  });
  return () => off(ordersRef);
}
