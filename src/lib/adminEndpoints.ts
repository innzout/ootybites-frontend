// Typed admin endpoint helpers (all use the admin token via adminApi).
import { adminApi } from "@/lib/api";
import type { Product, Variant, Coupon, Order, OrderStatus, Banner, Dealer, Area } from "@/types";
import type { ShippingInput } from "@/lib/endpoints";

// --- Auth ---
export const adminLogin = (username: string, password: string) =>
  adminApi.post<{ token: string }>("/admin/auth/login", { username, password });

// --- Dashboard ---
export interface DashboardStats {
  total_orders: number;
  revenue: number;
  counts_by_status: Record<string, number>;
  recent_orders: Order[];
}
export const dashboardStats = () => adminApi.get<DashboardStats>("/admin/dashboard/stats");

// --- Products ---
export const adminListProducts = () =>
  adminApi.get<{ products: Product[] }>("/admin/products");
export const adminGetProduct = (id: string) => adminApi.get<Product>(`/admin/products/${id}`);

export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}
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
export const adminCreateDealer = (b: DealerInput) => adminApi.post<Dealer>("/admin/dealers", b);
export const adminUpdateDealer = (id: string, b: DealerInput) =>
  adminApi.put<Dealer>(`/admin/dealers/${id}`, b);
export const adminDeleteDealer = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/dealers/${id}`);

// --- Areas (pincode → dealer auto-assign) ---
export interface AreaInput {
  code: string;
  name: string;
  city: string;
  pincode: string;
  dealer_id?: string | null;
  is_active: boolean;
}
export const adminListAreas = () => adminApi.get<{ areas: Area[] }>("/admin/areas");
export const adminCreateArea = (b: AreaInput) => adminApi.post<Area>("/admin/areas", b);
export const adminUpdateArea = (id: string, b: AreaInput) => adminApi.put<Area>(`/admin/areas/${id}`, b);
export const adminDeleteArea = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/areas/${id}`);

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
}
export const adminSignUpload = (folder: string) =>
  adminApi.post<UploadSignature>(`/admin/uploads/sign?folder=${encodeURIComponent(folder)}`);

export const adminListBanners = () => adminApi.get<{ banners: Banner[] }>("/admin/banners");
export const adminCreateBanner = (b: BannerInput) => adminApi.post<Banner>("/admin/banners", b);
export const adminUpdateBanner = (id: string, b: BannerInput) =>
  adminApi.put<Banner>(`/admin/banners/${id}`, b);
export const adminDeleteBanner = (id: string) =>
  adminApi.del<{ deleted: boolean }>(`/admin/banners/${id}`);
