import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";

export const AUTH_QUERY_KEY = "/api/auth/me";

/**
 * Error thrown for any non-2xx API response. `message` holds the server's own
 * `message`/`error` field when the body is JSON, so it can be shown to the user
 * directly instead of a raw `401: {"message":"..."}` blob.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  const raw = await res.text();
  let message = raw || res.statusText;
  let body: unknown = raw;

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      body = parsed;
      if (parsed && typeof parsed === "object") {
        const serverMessage = (parsed as Record<string, unknown>).message ?? (parsed as Record<string, unknown>).error;
        if (typeof serverMessage === "string" && serverMessage.length > 0) {
          message = serverMessage;
        }
      }
    } catch {
      // Not JSON (e.g. the SPA HTML fallback) — keep the raw text.
    }
  }

  throw new ApiError(res.status, message, body);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Builds the request URL from a query key.
 *
 * `["/api/x", { a: 1 }]`   -> `/api/x?a=1`
 * `["/api/x", 5, "steps"]` -> `/api/x/5/steps`   (numbers are path segments too)
 */
export function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  const base = queryKey[0] as string;

  if (queryKey.length === 1) {
    return base;
  }

  if (typeof queryKey[1] === "object" && queryKey[1] !== null) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryKey[1] as Record<string, unknown>)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }

  const pathParts = queryKey
    .slice(1)
    .filter((part): part is string | number => {
      if (typeof part === "number") return Number.isFinite(part);
      return typeof part === "string" && part.length > 0;
    })
    .map((part) => encodeURIComponent(String(part)));

  return [base, ...pathParts].join("/");
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrlFromQueryKey(queryKey);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * A 401 on any query or mutation means the session is gone. Drop every cached
 * page and flip the auth query to `null` so the app re-renders as logged out
 * instead of showing a fully authenticated shell whose every request fails.
 */
function handleUnauthorized(error: unknown) {
  if (!isUnauthorizedError(error)) return;

  const cached = queryClient.getQueryData([AUTH_QUERY_KEY]);
  if (cached === null) return; // Already logged out — nothing to reset.

  clearCacheExceptAuth();
  queryClient.setQueryData([AUTH_QUERY_KEY], null);
}

/**
 * Removes every cached query except the auth query itself. The auth query object
 * is deliberately kept so its mounted observer is notified of the new value —
 * `queryClient.clear()` removes the query without telling the observer, leaving
 * the UI holding the previous user.
 */
export function clearCacheExceptAuth() {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY,
  });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorized,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorized,
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
