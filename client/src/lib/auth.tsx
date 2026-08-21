import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn, clearCacheExceptAuth, AUTH_QUERY_KEY } from "./queryClient";
import type { User, Office } from "@shared/schema";

interface AuthUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'OFFICE';
  officeId: number | null;
  office?: Office | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = useQuery<AuthUser | null>({
    queryKey: [AUTH_QUERY_KEY],
    // A 401 here means "not logged in", not "request failed": returning null keeps
    // the query in a success state instead of erroring and retaining the stale user.
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      return response.json();
    },
    onSuccess: () => {
      clearCacheExceptAuth();
      queryClient.invalidateQueries({ queryKey: [AUTH_QUERY_KEY] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Order matters: drop every other user's cached data first, then write null
      // into the auth query so its mounted observer actually sees the change.
      clearCacheExceptAuth();
      queryClient.setQueryData([AUTH_QUERY_KEY], null);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // The server call failed, but the user asked to log out — never leave the
      // browser holding their session data because of a network error.
      clearCacheExceptAuth();
      queryClient.setQueryData([AUTH_QUERY_KEY], null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
