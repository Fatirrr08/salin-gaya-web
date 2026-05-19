// ============================================================
// Cart Utilities — In-memory cart state with pub/sub pattern
// Note: This is superseded by CartContext for React components.
//       Kept here for non-React usage or utility imports.
// ============================================================

import type { Product } from "@/backend/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

let cartItems: CartItem[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export const cart = {
  getItems: () => cartItems,
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners?.filter((l) => l !== listener);
    };
  },
  addItem: (product: Product) => {
    const existing = cartItems.find((i) => i.product.id === product.id);
    if (existing) {
      cartItems = cartItems?.map((i) =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      cartItems = [...cartItems, { product, quantity: 1 }];
    }
    notify();
  },
  removeItem: (productId: string) => {
    cartItems = cartItems?.filter((i) => i.product.id !== productId);
    notify();
  },
  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      cart.removeItem(productId);
      return;
    }
    cartItems = cartItems?.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i
    );
    notify();
  },
  getCount: () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
  getTotal: () =>
    cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
};
