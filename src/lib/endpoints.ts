// Typed endpoint helpers over the api client — keeps pages free of URL strings.
import { api } from "@/lib/api";
import type { Product, Order, CouponPreview, CartItem, Banner, Address } from "@/types";

// --- Auth ---
export const requestOTP = (phone: string) =>
  api.post<{ sent: boolean; dev_otp?: string }>("/auth/otp/request", { phone });

export const verifyOTP = (phone: string, otp: string) =>
  api.post<{ token: string; customer: { id: string; phone: string; name?: string } }>(
    "/auth/otp/verify",
    { phone, otp },
  );

// --- Banners (public) ---
export const listBanners = () => api.get<{ banners: Banner[] }>("/banners");

// --- Catalog (public) ---
export const listProducts = (q = "") =>
  api.get<{ products: Product[]; total: number }>(
    `/products${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );

export const getProduct = (slug: string) => api.get<Product>(`/products/${slug}`);

// --- Saved addresses (customer) ---
export interface AddressInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
}
export const listAddresses = () => api.get<{ addresses: Address[] }>("/addresses", true);
export const createAddress = (b: AddressInput) => api.post<Address>("/addresses", b, true);
export const updateAddress = (id: string, b: AddressInput) => api.put<Address>(`/addresses/${id}`, b, true);
export const deleteAddress = (id: string) => api.del<{ deleted: boolean }>(`/addresses/${id}`, true);

// --- Coupons + orders (customer) ---
type LineInput = { variant_id: string; qty: number };

const toLines = (items: CartItem[]): LineInput[] =>
  items.map((i) => ({ variant_id: i.variantId, qty: i.qty }));

export const validateCoupon = (items: CartItem[], code: string) =>
  api.post<CouponPreview & { subtotal: number }>(
    "/coupons/validate",
    { items: toLines(items), code },
    true,
  );

export interface ShippingInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export const placeOrder = (items: CartItem[], shipping: ShippingInput, couponCode?: string) =>
  api.post<Order>(
    "/orders",
    { items: toLines(items), coupon_code: couponCode ?? "", shipping },
    true,
  );

export const listOrders = () => api.get<{ orders: Order[] }>("/orders", true);
export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`, true);
