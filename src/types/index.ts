// Shared domain types, kept in sync with backend/migrations/0001_init.sql.

export type Unit = "mg" | "g" | "kg" | "ml" | "l" | "nos" | "packets";

export type OrderStatus =
  | "placed"
  | "reached_dealer"
  | "delivered"
  | "cancelled";

export interface ProductImage {
  id: string;
  url: string;
  cloudinary_public_id: string;
  sort_order: number;
  is_primary: boolean;
}

// Price and stock live on the variant, never the product (non-negotiable rule 1).
export interface Variant {
  id: string;
  label: string; // "500 g", "Pack of 15 nos"
  unit: Unit;
  unit_value: number;
  mrp: number;
  price: number;
  stock_qty: number;
  sku?: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  images: ProductImage[];
  variants: Variant[];
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

// Cart lives client-side; the server re-validates it at checkout.
export interface CartItem {
  variantId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  unit: Unit;
  unitValue: number;
  price: number; // last-known price; server is authoritative at checkout
  qty: number;
  imageUrl?: string;
}

export interface OrderItem {
  id: string;
  variant_id?: string;
  product_name: string;
  variant_label: string;
  unit: Unit;
  unit_value: number;
  price: number;
  qty: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string; // OB-YYYYMMDD-NNNN
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  total: number;
  payment_method: "cod";
  ship_name: string;
  ship_phone: string;
  ship_line1: string;
  ship_line2?: string;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  placed_at: string;
  dealer_id?: string | null;
  dealer_name?: string | null;
  items: OrderItem[];
  history?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note?: string | null;
  created_at: string;
}

export interface CouponPreview {
  valid: boolean;
  discount: number;
  reason?: string;
}

export interface Area {
  id: string;
  code: string;
  name: string;
  city: string;
  pincode: string;
  dealer_id?: string | null;
  dealer_name?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Dealer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title?: string | null;
  image_url: string;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  is_active: boolean;
  discount_type: string;
  discount_value: number;
  max_discount_cap?: number | null;
  applicable_scope: "all" | "specific_products";
  min_order_value: number;
  min_customer_lifetime_value: number;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  used_count: number;
  valid_from?: string | null;
  valid_to?: string | null;
  product_ids?: string[];
}
