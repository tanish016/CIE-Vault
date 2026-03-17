import { createContext, useContext, useCallback, type ReactNode } from "react";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  user: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string } | {}>;
  register: (registerData: any) => Promise<{ error?: string } | {}>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to fetch user session
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return { user: null };
  return res.json();
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate(); // Standard React Router hook
  
  // useSWR works perfectly in standard React
  const { data, mutate, isLoading } = useSWR("/api/auth/me", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        
        if (!res.ok) return { error: json.error || "Login failed" };
        
        await mutate(); // Refresh the 'me' data
        
        // Redirect to the landing page after successful auth.
        navigate("/");
        
        return {};
      } catch (err) {
        return { error: "Network error. Please try again." };
      }
    },
    [mutate, navigate]
  );

  const register = useCallback(
    async (registerData: any) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registerData),
        });
        const json = await res.json();
        
        if (!res.ok) return { error: json.error || "Registration failed" };
        
        await mutate();
        
        navigate("/");
        
        return {};
      } catch (err) {
        return { error: "Network error. Please try again." };
      }
    },
    [mutate, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await mutate({ user: null }, false);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  }, [mutate, navigate]);

  return (
    <AuthContext.Provider
     value={{
        user: data?.user ?? null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}