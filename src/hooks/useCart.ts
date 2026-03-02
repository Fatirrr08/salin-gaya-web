import { useSyncExternalStore, useCallback } from "react";
import { cart } from "@/lib/cart";
import type { Product } from "@/lib/data";

export function useCart() {
  const items = useSyncExternalStore(cart.subscribe, cart.getItems);
  const count = useSyncExternalStore(cart.subscribe, cart.getCount);
  const total = useSyncExternalStore(cart.subscribe, cart.getTotal);

  const addItem = useCallback((product: Product) => cart.addItem(product), []);
  const removeItem = useCallback((id: string) => cart.removeItem(id), []);
  const updateQuantity = useCallback((id: string, qty: number) => cart.updateQuantity(id, qty), []);

  return { items, count, total, addItem, removeItem, updateQuantity };
}
