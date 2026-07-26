// Typed dealer-portal endpoint helpers (all use the dealer token).
import { dealerApi } from "@/lib/api";
import type { Order, OrderStatus } from "@/types";

export const dealerLogin = (username: string, password: string) =>
  dealerApi.post<{ token: string; dealer: { id: string; name: string; username: string } }>(
    "/dealer/auth/login",
    { username, password },
  );

export const dealerListOrders = () => dealerApi.get<{ orders: Order[] }>("/dealer/orders");
export const dealerGetOrder = (id: string) => dealerApi.get<Order>(`/dealer/orders/${id}`);
export const dealerUpdateOrderStatus = (id: string, status: OrderStatus, note?: string) =>
  dealerApi.patch<Order>(`/dealer/orders/${id}/status`, { status, note: note ?? "" });
