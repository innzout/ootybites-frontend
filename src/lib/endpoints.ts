// Typed endpoint helpers over the api client — keeps pages free of URL strings.
import { api } from "@/lib/api";
import type { Product, Order, CouponPreview, CartItem, Banner, Address, Notification, Area } from "@/types";

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

// --- Serviceable cities (public) — for the delivery-address city picker ---
export const listCities = () => api.get<{ cities: string[] }>("/cities");

// --- Store settings (public read) — admin-editable storefront config ---
export interface StoreSettings {
  store_name: string;
  tagline: string;
  support_email: string;
  support_phone: string;
  store_address: string;
  standard_delivery_text: string;
  express_delivery_text: string;
  cod_note: string;
  order_number_prefix: string;
}
export const listSettings = () => api.get<StoreSettings>("/settings");

// --- CMS content pages (public read by slug) ---
export interface Page {
  id: string;
  slug: string;
  title: string;
  body: string;
  is_published: boolean;
  updated_at: string;
}
export const getPage = (slug: string) => api.get<Page>(`/pages/${slug}`);

// --- 24-hour express (public): serviceable areas + in-stock products per area ---
export const listExpressAreas = () => api.get<{ areas: Area[] }>("/express/areas");
export const listExpressProducts = (areaId: string) =>
  api.get<{ products: Product[]; hub_name: string | null }>(
    `/express/products?area_id=${encodeURIComponent(areaId)}`,
  );

// --- 24h express availability (public) ---
export const expressCheck = (pincode: string, items: CartItem[]) =>
  api.post<{ express: boolean; hub_name?: string | null }>("/express-check", {
    pincode,
    items: items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
  });

// --- Categories (public) ---
export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}
export const listCategories = () => api.get<{ categories: Category[] }>("/categories");

// --- Catalog (public) ---
export interface ProductQuery {
  q?: string;
  category?: string; // category id
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  page?: number;
  limit?: number;
}
export const listProducts = (p: ProductQuery = {}) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  const qs = q.toString();
  return api.get<{ products: Product[]; total: number }>(`/products${qs ? `?${qs}` : ""}`);
};

export const getProduct = (slug: string) => api.get<Product>(`/products/${slug}`);

// Paginated + searchable product lookup (used by the admin coupon picker).
export const searchProducts = (q: string, page: number, limit: number) =>
  api.get<{ products: Product[]; total: number }>(
    `/products?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
  );

// --- Notifications (customer) ---
export interface NotificationFeed {
  notifications: Notification[];
  unread: number;
}
export const listNotifications = () => api.get<NotificationFeed>("/notifications", true);
export const markNotificationsRead = () => api.post<{ ok: boolean }>("/notifications/read", {}, true);

// --- Profile (customer) ---
export interface CustomerProfile {
  id: string;
  phone: string;
  name?: string | null;
}
export const getMe = () => api.get<CustomerProfile>("/me", true);
export const updateMe = (name: string) => api.put<CustomerProfile>("/me", { name }, true);

// --- Saved addresses (customer) ---
export interface AddressInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number | null;
  lng?: number | null;
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
  lat?: number | null;
  lng?: number | null;
}

export const placeOrder = (items: CartItem[], shipping: ShippingInput, couponCode?: string, deliveryNote?: string) =>
  api.post<Order>(
    "/orders",
    { items: toLines(items), coupon_code: couponCode ?? "", shipping, delivery_note: deliveryNote ?? "" },
    true,
  );

export const listOrders = () => api.get<{ orders: Order[] }>("/orders", true);
export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`, true);
// Customer self-cancel (only while the order is still 'placed').
export const cancelOrder = (id: string, reason?: string) =>
  api.post<Order>(`/orders/${id}/cancel`, { reason: reason ?? "" }, true);

// Reorder ("buy again") — returns still-available lines, re-priced live.
export interface ReorderLine {
  variant_id: string;
  product_slug: string;
  product_name: string;
  variant_label: string;
  unit: string;
  unit_value: number;
  price: number;
  qty: number;
  image_url?: string | null;
}
export const reorder = (id: string) => api.get<{ items: ReorderLine[] }>(`/orders/${id}/reorder`, true);

// --- Mini-game: high scores + public league table ---
export const getGameHighScore = () =>
  api.get<{ high_score: number; rank: number }>("/game/highscore", true);
// A run must be opened server-side first: the ticket it returns proves the run
// started here and bounds the score by how long it actually lasted, so the
// league table (which carries a giveaway) cannot be topped with one request.
export const startGameRun = () => api.post<{ ticket: string }>("/game/start", undefined, true);
export const submitGameScore = (score: number, ticket: string) =>
  api.post<{ high_score: number }>("/game/score", { score, ticket }, true);

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
}
export const getLeaderboard = () => api.get<{ leaders: LeaderRow[] }>("/game/leaderboard");

// The league season in progress: what it's called and what you win. `season` is
// null between seasons, so the UI can say so instead of promising a prize that
// isn't running.
export interface GameSeason {
  name: string;
  prize: string | null;
  starts_at: string;
}
export const getGameSeason = () => api.get<{ season: GameSeason | null }>("/game/season");
