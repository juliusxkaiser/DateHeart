import { Capacitor } from "@capacitor/core";

import type { IError, Product } from "capacitor-plugin-cdv-purchase";

export const STORE_PRODUCTS = {
  noAds: import.meta.env.VITE_IAP_NO_ADS_PRODUCT_ID?.trim() || "dateheart_no_ads",
  proMonthly: import.meta.env.VITE_IAP_PRO_MONTHLY_PRODUCT_ID?.trim() || "dateheart_pro_monthly",
  proYearly: import.meta.env.VITE_IAP_PRO_YEARLY_PRODUCT_ID?.trim() || "dateheart_pro_yearly",
} as const;

export type StoreProductId = (typeof STORE_PRODUCTS)[keyof typeof STORE_PRODUCTS];

export type StoreEntitlement = "no_ads" | "pro";

export type StorePurchaseStatus = {
  error?: string;
  products: Partial<Record<StoreProductId, { available: boolean; price?: string; title?: string }>>;
  ready: boolean;
};

type StorePurchaseCallbacks = {
  onEntitlement: (entitlement: StoreEntitlement, productId: StoreProductId) => void;
  onStatus: (status: StorePurchaseStatus) => void;
};

let initialized = false;
let initializePromise: Promise<StorePurchaseStatus> | undefined;
let currentStatus: StorePurchaseStatus = { products: {}, ready: false };

export function canUseStorePurchases() {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function entitlementForProduct(productId: string): StoreEntitlement | undefined {
  if (productId === STORE_PRODUCTS.noAds) return "no_ads";
  if (productId === STORE_PRODUCTS.proMonthly || productId === STORE_PRODUCTS.proYearly) return "pro";
  return undefined;
}

function productIds() {
  return [STORE_PRODUCTS.noAds, STORE_PRODUCTS.proMonthly, STORE_PRODUCTS.proYearly] as StoreProductId[];
}

function emitStatus(callbacks: StorePurchaseCallbacks, next: StorePurchaseStatus) {
  currentStatus = next;
  callbacks.onStatus(next);
}

function statusFromProducts(products: Product[], ready: boolean, error?: string): StorePurchaseStatus {
  const productMap: StorePurchaseStatus["products"] = {};

  productIds().forEach((id) => {
    const product = products.find((entry) => entry.id === id);
    productMap[id] = {
      available: Boolean(product),
      price: product?.pricing?.price,
      title: product?.title,
    };
  });

  return { error, products: productMap, ready };
}

function deliverOwnedProducts(
  store: typeof import("capacitor-plugin-cdv-purchase").store,
  callbacks: StorePurchaseCallbacks,
) {
  productIds().forEach((id) => {
    if (!store.owned(id)) return;
    const entitlement = entitlementForProduct(id);
    if (entitlement) callbacks.onEntitlement(entitlement, id);
  });
}

export function storePurchaseStatus() {
  return currentStatus;
}

export async function initializeStorePurchases(callbacks: StorePurchaseCallbacks) {
  if (!canUseStorePurchases()) return currentStatus;
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    try {
      const { Platform, ProductType, store } = await import("capacitor-plugin-cdv-purchase");
      const platform = Capacitor.getPlatform() === "ios" ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

      store.register([
        { id: STORE_PRODUCTS.noAds, platform, type: ProductType.NON_CONSUMABLE },
        { id: STORE_PRODUCTS.proMonthly, group: "dateheart_pro", platform, type: ProductType.PAID_SUBSCRIPTION },
        { id: STORE_PRODUCTS.proYearly, group: "dateheart_pro", platform, type: ProductType.PAID_SUBSCRIPTION },
      ]);

      if (!initialized) {
        initialized = true;
        store
          .when()
          .productUpdated(() => {
            emitStatus(callbacks, statusFromProducts(store.products, store.isReady, currentStatus.error));
          })
          .receiptUpdated(() => {
            deliverOwnedProducts(store, callbacks);
          })
          .approved(async (transaction) => {
            const productId = transaction.products[0]?.id;
            const entitlement = productId ? entitlementForProduct(productId) : undefined;
            if (entitlement) callbacks.onEntitlement(entitlement, productId as StoreProductId);
            await transaction.finish();
          })
          .receiptsReady(() => {
            deliverOwnedProducts(store, callbacks);
          });
      }

      const errors = await store.initialize([platform]);
      await store.update();
      const error = errors[0]?.message;
      const status = statusFromProducts(store.products, store.isReady, error);
      emitStatus(callbacks, status);
      deliverOwnedProducts(store, callbacks);
      return status;
    } catch (error) {
      const status = {
        error: error instanceof Error ? error.message : "Store purchase initialization failed.",
        products: currentStatus.products,
        ready: false,
      };
      emitStatus(callbacks, status);
      return status;
    }
  })();

  return initializePromise;
}

export async function purchaseStoreProduct(productId: StoreProductId) {
  if (!canUseStorePurchases()) return { ok: false, error: "Native store purchases are unavailable on this platform." };

  const { store } = await import("capacitor-plugin-cdv-purchase");
  const product = store.get(productId);
  const offer = product?.getOffer();

  if (!offer) {
    return { ok: false, error: `Store product not available: ${productId}` };
  }

  const error: IError | undefined = await offer.order();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function restoreStorePurchases() {
  if (!canUseStorePurchases()) return { ok: false, error: "Native store purchases are unavailable on this platform." };

  const { store } = await import("capacitor-plugin-cdv-purchase");
  const error: IError | undefined = await store.restorePurchases();
  await store.update();
  return error ? { ok: false, error: error.message } : { ok: true };
}
