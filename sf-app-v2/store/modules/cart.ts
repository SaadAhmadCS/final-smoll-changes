import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartItem, CartItemType, CartState } from "../types/cart";
import api from "@/utils/api";

/** Cart expires after 3 days (in milliseconds). */
const CART_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function computeItemTotal(item: CartItem): number {
  const base = item.unitPrice * item.quantity;
  const addonsTotal =
    item.addons?.reduce((sum, addon) => sum + addon.price * item.quantity, 0) ?? 0;
  return base + addonsTotal;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      schedule: null,
      cartUpdatedAt: null,
      discount: 0,
      promoCode: null,
      travelFee: 79,
      shippingFee: 0,

      fetchAppConfig: async () => {
        try {
          const res = await api.get("/config");
          const data = res.data;
          if (data) {
            if (data.travelFee !== undefined) {
              set({ travelFee: data.travelFee });
            }
            if (data.shippingFee !== undefined) {
              set({ shippingFee: data.shippingFee });
            }
          }
        } catch (e) {
          console.error("Failed to fetch app config", e);
        }
      },

      addOrUpdateItem: (itemInput) => {
        const { items } = get();
        const quantity = itemInput.quantity ?? 1;
        const keyMatches = (it: CartItem) =>
          it.id === itemInput.id &&
          it.type === itemInput.type &&
          it.packageId === itemInput.packageId;

        const existingIndex = items.findIndex(keyMatches);

        // If adding a product, clear any existing schedule (products don't need scheduling)
        if (itemInput.type === "product") {
          set({ schedule: null });
        }

        if (existingIndex === -1) {
          const newItem: CartItem = {
            ...itemInput,
            quantity,
            addons: itemInput.addons ?? [],
          };
          set({ items: [...items, newItem], cartUpdatedAt: Date.now() });
        } else {
          const next = [...items];
          const existing = next[existingIndex];
          next[existingIndex] = {
            ...existing,
            ...itemInput,
            quantity: quantity,
            addons: itemInput.addons ?? existing.addons ?? [],
          };
          set({ items: next, cartUpdatedAt: Date.now() });
        }
      },

      removeItem: (id, type, packageId) => {
        const { items } = get();
        const filtered = items.filter(
          (it) =>
            !(
              it.id === id &&
              it.type === type &&
              (packageId === undefined ? it.packageId == null : it.packageId === packageId)
            )
        );
        set({
          items: filtered,
          // If cart is now empty, reset the timestamp
          cartUpdatedAt: filtered.length > 0 ? Date.now() : null,
        });
      },

      updateQuantity: (id, type, quantity, packageId) => {
        if (quantity <= 0) {
          const { removeItem } = get();
          removeItem(id, type, packageId);
          return;
        }

        const { items } = get();
        const matches = (it: CartItem) =>
          it.id === id &&
          it.type === type &&
          (packageId === undefined ? it.packageId == null : it.packageId === packageId);
        set({
          items: items.map((it) => (matches(it) ? { ...it, quantity } : it)),
          cartUpdatedAt: Date.now(),
        });
      },

      clearCart: () => {
        set({ items: [], cartUpdatedAt: null });
      },

      setSchedule: (schedule) => {
        set({ schedule, cartUpdatedAt: Date.now() });
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + computeItemTotal(item), 0);
      },
      canAdd: (type) => {
        const { items } = get();
        if (items.length === 0) return true;
        // Strict isolation: all items must have the same type
        return items.every((it) => it.type === type);
      },
    }),
    {
      name: "smoll-cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data fields, not functions
      partialize: (state) => ({
        items: state.items,
        schedule: state.schedule,
        cartUpdatedAt: state.cartUpdatedAt,
        discount: state.discount,
        promoCode: state.promoCode,
        travelFee: state.travelFee,
        shippingFee: state.shippingFee,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.log("Cart rehydration error:", error);
            return;
          }
          if (state && state.cartUpdatedAt) {
            const elapsed = Date.now() - state.cartUpdatedAt;
            if (elapsed > CART_EXPIRY_MS) {
              // Cart is older than 3 days — clear it
              console.log("Cart expired after 3 days, clearing...");
              state.items = [];
              state.schedule = null;
              state.cartUpdatedAt = null;
            }
          }
        };
      },
    }
  )
);
