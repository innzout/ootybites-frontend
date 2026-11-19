// Typed dealer-portal endpoint helpers (all use the dealer token).
import { dealerApi } from "@/lib/api";
import type { Order, OrderStatus } from "@/types";
import { ownOrdersQS, type OwnOrdersQuery } from "@/lib/endpoints";

export const dealerLogin = (username: string, password: string) =>
  dealerApi.post<{ token: string; dealer: { id: string; name: string; username: string } }>(
    "/dealer/auth/login",
    { username, password },
  );

export const dealerListOrders = (p: OwnOrdersQuery = {}) =>
  dealerApi.get<{ orders: Order[]; total: number }>(`/dealer/orders?${ownOrdersQS(p)}`);
export const dealerGetOrder = (id: string) => dealerApi.get<Order>(`/dealer/orders/${id}`);
export const dealerUpdateOrderStatus = (id: string, status: OrderStatus, note?: string) =>
  dealerApi.patch<Order>(`/dealer/orders/${id}/status`, { status, note: note ?? "" });
