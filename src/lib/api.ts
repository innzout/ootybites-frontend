// One typed API client for the whole app. No fetch logic is duplicated
// elsewhere — every call goes through here so auth, the response envelope, and
// error handling live in a single place (see docs/ARCHITECTURE.md §11).

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

// Mirrors backend pkg/response.Envelope.
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Thrown on any non-success response; carries the structured error so callers
// can surface field errors (error.fields) or a toast (error.message).
export class ApiException extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiException";
    this.status = status;
    this.code = error.code;
    this.fields = error.fields;
  }
}

type TokenGetter = () => string | null;

// Two separate token providers for the two JWT audiences. Wired by the stores at
// app start so the client attaches the right token without importing the store.
let getToken: TokenGetter = () => null; // customer
let getAdminToken: TokenGetter = () => null; // admin
let getDealerToken: TokenGetter = () => null; // dealer

export function setTokenGetter(fn: TokenGetter) {
  getToken = fn;
}
export function setAdminTokenGetter(fn: TokenGetter) {
  getAdminToken = fn;
}
export function setDealerTokenGetter(fn: TokenGetter) {
  getDealerToken = fn;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach the customer bearer token
  adminAuth?: boolean; // attach the admin bearer token
  dealerAuth?: boolean; // attach the dealer bearer token
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.dealerAuth) {
    const token = getDealerToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (opts.adminAuth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  let env: Envelope<T>;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiException(res.status, {
      code: "network_error",
      message: "Something went wrong. Please try again.",
    });
  }

  if (!res.ok || !env.success) {
    throw new ApiException(
      res.status,
      env.error ?? { code: "unknown", message: "Request failed" },
    );
  }
  return env.data as T;
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>(path, { auth }),
  post: <T>(path: string, body?: unknown, auth = false) =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth = false) =>
    request<T>(path, { method: "PUT", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = false) =>
    request<T>(path, { method: "PATCH", body, auth }),
  del: <T>(path: string, auth = false) =>
    request<T>(path, { method: "DELETE", auth }),
};

// adminApi mirrors api but always attaches the admin token.
export const adminApi = {
  get: <T>(path: string) => request<T>(path, { adminAuth: true }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body, adminAuth: true }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body, adminAuth: true }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body, adminAuth: true }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE", adminAuth: true }),
};

// dealerApi mirrors api but always attaches the dealer token.
export const dealerApi = {
  get: <T>(path: string) => request<T>(path, { dealerAuth: true }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body, dealerAuth: true }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body, dealerAuth: true }),
};
