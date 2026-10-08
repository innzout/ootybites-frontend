// Typed admin endpoint helpers (all use the admin token via adminApi).
import { adminApi } from "@/lib/api";
import type {
  Product, Variant, Coupon, Order, OrderStatus, Banner, Dealer, Area, Vendor, StockRow, StockMovement, Hub,
} from "@/types";
import type { ShippingInput, StoreSettings, Page, Category } from "@/lib/endpoints";

// --- Auth ---
export const adminLogin = (username: string, password: string) =>
  adminApi.post<{ token: string }>("/admin/auth/login", { username, password });

// --- Dashboard ---
export interface DashboardStats {
  total_orders: number;
  revenue: number;
  counts_by_status: Record<string, number>;
  recent_orders: Order[];
  from: string; // applied range (YYYY-MM-DD); server defaults to today
  to: string;
}
// Omit range → server defaults to the current day.
export const dashboardStats = (range?: { from?: string; to?: string }) => {
  const q = new URLSearchParams();
  if (range?.from) q.set("from", range.from);
  if (range?.to) q.set("to", range.to);
  const qs = q.toString();
  return adminApi.get<DashboardStats>(`/admin/dashboard/stats${qs ? `?${qs}` : ""}`);
};

// --- Store settings (admin) ---
export const adminGetSettings = () => adminApi.get<StoreSettings>("/admin/settings");
export const adminUpdateSettings = (b: StoreSettings) => adminApi.put<StoreSettings>("/admin/settings", b);

// --- CMS content pages (admin) ---
export interface PageInput {
  slug: string;
  title: string;
  body: string;
  is_published: boolean;
}
export const adminListPages = () => adminApi.get<{ pages: Page[] }>("/admin/pages");
export const adminGetPage = (id: string) => adminApi.get<Page>(`/admin/pages/${id}`);
export const adminCreatePage = (b: PageInput) => adminApi.post<Page>("/admin/pages", b);
export const adminUpdatePage = (id: string, b: PageInput) => adminApi.put<Page>(`/admin/pages/${id}`, b);
export const adminDeletePage = (id: string) => adminApi.del<{ deleted: boolean }>(`/admin/pages/${id}`);

// --- Admin users + roles ---
export type AdminRole = "super_admin" | "manager";
export interface AdminUser {
  id: string;
  username: string;
  name?: string | null;
  role: AdminRole;
  created_at: string;
}
export interface AdminUserInput {
  username: string;
  name?: string | null;
  password?: string;
  role: AdminRole;
}
// Current signed-in admin (any role) — used to gate the Admins section.
export const adminMe = () => adminApi.get<AdminUser>("/admin/me");
export const adminListAdmins = () => adminApi.get<{ admins: AdminUser[] }>("/admin/admins");
export const adminGetAdmin = (id: string) => adminApi.get<AdminUser>(`/admin/admins/${id}`);
export const adminCreateAdmin = (b: AdminUserInput) => adminApi.post<AdminUser>("/admin/admins", b);
export const adminUpdateAdmin = (id: string, b: AdminUserInput) => adminApi.put<AdminUser>(`/admin/admins/${id}`, b);
export const adminDeleteAdmin = (id: string) => adminApi.del<{ deleted: boolean }>(`/admin/admins/${id}`);

// --- Notifications (admin) ---
export const adminListNotifications = () =>
  adminApi.get<{ notifications: import("@/types").Notification[]; unread: number }>("/admin/notifications");
export const adminMarkNotificationsRead = () =>
  adminApi.post<{ ok: boolean }>("/admin/notifications/read");

// --- Products ---
export interface ProductListParams {
  q?: string;
  active?: "true" | "false"; // visibility filter
  stock?: "in" | "low" | "out"; // stock filter (over active variants)
  page?: number;
  limit?: number;
  sort?: string; // name | created_at
  order?: "asc" | "desc";
}
// Server-side searched/sorted/paginated. Omit params for the first default page.
export const adminListProducts = (p: ProductListParams = {}) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  const qs = q.toString();
  return adminApi.get<{ products: Product[]; total: number }>(`/admin/products${qs ? `?${qs}` : ""}`);
};
export const adminGetProduct = (id: string) => adminApi.get<Product>(`/admin/products/${id}`);

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  category_id?: string | null;
}

// --- Categories (admin) ---
export interface CategoryInput {
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}
export const adminListCategories = () => adminApi.get<{ categories: Category[] }>("/admin/categories");
export const adminGetCategory = (id: string) => adminApi.get<Category>(`/admin/categories/${id}`);
export const adminCreateCategory = (b: CategoryInput) => adminApi.post<Category>("/admin/categories", b);
export const adminUpdateCategory = (id: string, b: CategoryInput) => adminApi.put<Category>(`/admin/categories/${id}`, b);
export const adminDeleteCategory = (id: string) => adminApi.del<{ deleted: boolean }>(`/admin/categories/${id}`);
export const adminCreateProduct = (b: ProductInput) => adminApi.post<Product>("/admin/products", b);
export const adminUpdateProduct = (id: string, b: ProductInput) =>
  adminApi.put<Product>(`/admin/products/${id}`, b);
export const adminDeleteProduct = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/products/${id}`);

export interface VariantInput {
  label: string;
  unit: string;
  unit_value: number;
  mrp: number;
  price: number;
  stock_qty: number;
  sku?: string;
  is_active?: boolean;
}
export const adminCreateVariant = (productId: string, b: VariantInput) =>
  adminApi.post<Variant>(`/admin/products/${productId}/variants`, b);
export const adminUpdateVariant = (id: string, b: VariantInput) =>
  adminApi.put<Variant>(`/admin/variants/${id}`, b);
export const adminDeleteVariant = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/variants/${id}`);
export const adminAddImage = (productId: string, url: string, isPrimary = false) =>
  adminApi.post(`/admin/products/${productId}/images`, { url, is_primary: isPrimary });

// --- Coupons ---
export const adminListCoupons = () => adminApi.get<{ coupons: Coupon[] }>("/admin/coupons");
export const adminGetCoupon = (id: string) => adminApi.get<Coupon>(`/admin/coupons/${id}`);
export const adminCreateCoupon = (b: Partial<Coupon>) => adminApi.post<Coupon>("/admin/coupons", b);
export const adminUpdateCoupon = (id: string, b: Partial<Coupon>) =>
  adminApi.put<Coupon>(`/admin/coupons/${id}`, b);
export const adminDeleteCoupon = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/coupons/${id}`);

// --- Orders ---
export interface OrderListParams {
  status?: string;
  month?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}
export const adminListOrders = (p: OrderListParams = {}) => {
  const q = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && q.set(k, String(v)));
  return adminApi.get<{ orders: Order[]; total: number }>(`/admin/orders?${q.toString()}`);
};
export const adminGetOrder = (id: string) => adminApi.get<Order>(`/admin/orders/${id}`);
export const adminUpdateOrderStatus = (id: string, status: OrderStatus, note?: string) =>
  adminApi.patch<Order>(`/admin/orders/${id}/status`, { status, note: note ?? "" });
export const adminUpdateOrderAddress = (id: string, shipping: ShippingInput) =>
  adminApi.put<Order>(`/admin/orders/${id}/address`, shipping);
export const adminAddOrderNote = (id: string, note: string) =>
  adminApi.post<Order>(`/admin/orders/${id}/note`, { note });
export const adminAssignOrder = (id: string, dealerId: string | null) =>
  adminApi.patch<Order>(`/admin/orders/${id}/assign`, { dealer_id: dealerId });

// --- Dealers ---
export interface DealerInput {
  name: string;
  mobile: string;
  address?: string | null;
  username: string;
  password?: string;
  is_active: boolean;
}
export const adminListDealers = () => adminApi.get<{ dealers: Dealer[] }>("/admin/dealers");
export const adminGetDealer = (id: string) => adminApi.get<Dealer>(`/admin/dealers/${id}`);
export const adminCreateDealer = (b: DealerInput) => adminApi.post<Dealer>("/admin/dealers", b);
export const adminUpdateDealer = (id: string, b: DealerInput) =>
  adminApi.put<Dealer>(`/admin/dealers/${id}`, b);
export const adminDeleteDealer = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/dealers/${id}`);

// --- Areas (pincode → hub) ---
export interface AreaInput {
  code: string;
  name: string;
  city: string;
  pincode: string;
  hub_id?: string | null;
  is_active: boolean;
}
export const adminListAreas = () => adminApi.get<{ areas: Area[] }>("/admin/areas");
export const adminGetArea = (id: string) => adminApi.get<Area>(`/admin/areas/${id}`);
export const adminCreateArea = (b: AreaInput) => adminApi.post<Area>("/admin/areas", b);
export const adminUpdateArea = (id: string, b: AreaInput) => adminApi.put<Area>(`/admin/areas/${id}`, b);
export const adminDeleteArea = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/areas/${id}`);

// --- Hubs (fulfilment centres) + per-hub stock ---
export interface HubInput {
  name: string;
  dealer_id?: string | null;
  is_active: boolean;
}
export const adminListHubs = () => adminApi.get<{ hubs: Hub[] }>("/admin/hubs");
export const adminGetHub = (id: string) => adminApi.get<Hub>(`/admin/hubs/${id}`);
export const adminCreateHub = (b: HubInput) => adminApi.post<Hub>("/admin/hubs", b);
export const adminUpdateHub = (id: string, b: HubInput) => adminApi.put<Hub>(`/admin/hubs/${id}`, b);
export const adminDeleteHub = (id: string) => adminApi.del<{ deleted: boolean }>(`/admin/hubs/${id}`);
export const adminAssignHubAreas = (id: string, areaIds: string[]) =>
  adminApi.put<{ ok: boolean }>(`/admin/hubs/${id}/areas`, { area_ids: areaIds });
export const adminHubStock = (id: string) => adminApi.get<{ stock: StockRow[] }>(`/admin/hubs/${id}/stock`);
export const adminHubReceiveStock = (id: string, b: {
  variant_id: string;
  vendor_id?: string | null;
  qty: number;
  unit_cost?: number | null;
  note?: string;
}) => adminApi.post<{ ok: boolean }>(`/admin/hubs/${id}/stock/receive`, b);
export const adminHubAdjustStock = (id: string, b: { variant_id: string; delta: number; note?: string }) =>
  adminApi.post<{ ok: boolean }>(`/admin/hubs/${id}/stock/adjust`, b);
export const adminHubMovements = (id: string) =>
  adminApi.get<{ movements: StockMovement[] }>(`/admin/hubs/${id}/movements`);

// --- Vendors (suppliers) ---
export interface VendorInput {
  name: string;
  phone?: string | null;
  location: string;
  notes?: string | null;
  is_active: boolean;
}
export const adminListVendors = () => adminApi.get<{ vendors: Vendor[] }>("/admin/vendors");
export const adminGetVendor = (id: string) => adminApi.get<Vendor>(`/admin/vendors/${id}`);
export const adminCreateVendor = (b: VendorInput) => adminApi.post<Vendor>("/admin/vendors", b);
export const adminUpdateVendor = (id: string, b: VendorInput) => adminApi.put<Vendor>(`/admin/vendors/${id}`, b);
export const adminDeleteVendor = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/vendors/${id}`);

// --- Inventory ---
export const adminStockOverview = () => adminApi.get<{ stock: StockRow[] }>("/admin/inventory");
export const adminStockMovements = (variantId: string) =>
  adminApi.get<{ movements: StockMovement[] }>(`/admin/inventory/${variantId}/movements`);
export const adminReceiveStock = (b: {
  variant_id: string;
  vendor_id?: string | null;
  qty: number;
  unit_cost?: number | null;
  note?: string;
}) => adminApi.post<{ ok: boolean }>("/admin/inventory/receive", b);
export const adminAdjustStock = (b: { variant_id: string; delta: number; note?: string }) =>
  adminApi.post<{ ok: boolean }>("/admin/inventory/adjust", b);

// --- Banners ---
export interface BannerInput {
  title?: string | null;
  image_url: string;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
}
// --- Uploads (Cloudinary signed) ---
export interface UploadSignature {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;
  signature: string;
  /** Present only when CLOUDINARY_UPLOAD_PRESET is set; must be a signed preset. */
  upload_preset?: string;
}
export const adminSignUpload = (folder: string) =>
  adminApi.post<UploadSignature>(`/admin/uploads/sign?folder=${encodeURIComponent(folder)}`);

export const adminListBanners = () => adminApi.get<{ banners: Banner[] }>("/admin/banners");
export const adminGetBanner = (id: string) => adminApi.get<Banner>(`/admin/banners/${id}`);
export const adminCreateBanner = (b: BannerInput) => adminApi.post<Banner>("/admin/banners", b);
export const adminUpdateBanner = (id: string, b: BannerInput) =>
  adminApi.put<Banner>(`/admin/banners/${id}`, b);
export const adminDeleteBanner = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/banners/${id}`);

// --- Game league seasons ---
export interface AdminSeason {
  id: string;
  name: string;
  prize: string | null;
  starts_at: string;
  ends_at: string | null;
  winner_customer_id: string | null;
  winner_score: number | null;
  winner_name: string | null;
  winner_phone: string | null;
  players: number;
}
export const adminListSeasons = () => adminApi.get<{ seasons: AdminSeason[] }>("/admin/game/seasons");
export const adminOpenSeason = (name: string, prize: string) =>
  adminApi.post<{ season: AdminSeason }>("/admin/game/seasons", { name, prize });
export const adminCloseSeason = () =>
  adminApi.post<{ season: AdminSeason }>("/admin/game/seasons/close");
