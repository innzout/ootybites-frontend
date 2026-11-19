// Typed endpoint helpers over the api client — keeps pages free of URL strings.
import { api, request } from "@/lib/api";
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
// Areas ranked by how close their hub is to a point, for "Use my location".
export interface NearbyArea extends Area {
  distance_km: number;
  in_range: boolean;
}
export const nearestExpressAreas = (lat: number, lng: number) =>
  api.get<{ areas: NearbyArea[]; radius_km: number }>(
    `/express/nearest?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
  );

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
  sort?: "featured" | "newest" | "price_asc" | "price_desc" | "name";
  // Restrict to specific products. Serialises to a comma-separated list, which
  // is what the API expects; used by the wishlist to refresh price and stock.
  ids?: string[];
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

// idempotencyKey identifies one purchase attempt. Sending the same key again
// (a retry after a dropped connection) returns the order already created
// instead of placing a second one.
export const placeOrder = (
  items: CartItem[],
  shipping: ShippingInput,
  couponCode: string | undefined,
  deliveryNote: string | undefined,
  idempotencyKey: string,
) =>
  request<Order>("/orders", {
    method: "POST",
    auth: true,
    headers: { "Idempotency-Key": idempotencyKey },
    body: { items: toLines(items), coupon_code: couponCode ?? "", shipping, delivery_note: deliveryNote ?? "" },
  });

// Filters for the customer's and dealer's own order lists. The owner is taken
// from the session on the server, never from these.
export interface OwnOrdersQuery {
  q?: string;
  status?: string;
  sort?: "placed_at" | "total";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}
export function ownOrdersQS(p: OwnOrdersQuery): string {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  return q.toString();
}
export const listOrders = (p: OwnOrdersQuery = {}) =>
  api.get<{ orders: Order[]; total: number }>(`/orders?${ownOrdersQS(p)}`, true);
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

// ---------------- Reviews ----------------
//
// Signed-in only. There is no anonymous read endpoint, so these calls are made
// solely from authenticated screens; a logged-out visitor is shown a prompt to
// sign in rather than an empty review list.
export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  body: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export interface ProductReviews {
  reviews: Review[];
  average: number;
  count: number;
  // Whether the signed-in customer has a delivered order containing this
  // product, which is what earns the right to review it.
  can_review: boolean;
  // Their existing review, when they have already left one.
  mine: Review | null;
}

export const listProductReviews = (productId: string) =>
  api.get<ProductReviews>(`/reviews?product_id=${encodeURIComponent(productId)}`, true);

export const saveReview = (productId: string, rating: number, body: string) =>
  api.post<Review>("/reviews", { product_id: productId, rating, body }, true);

export const deleteReview = (id: string) => api.del<{ deleted: boolean }>(`/reviews/${id}`, true);
