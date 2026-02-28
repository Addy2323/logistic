import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authAPI } from "@/lib/api";

export type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

export interface Agent {
  id: string;
  availabilityStatus: 'ONLINE' | 'OFFLINE';
  currentOrderCount: number;
  rating: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  agent?: Agent;
}


interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean; userId?: string }>;
  verifyOtp: (userId: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isLoading: boolean;
}



const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("mhema_user");
    const savedToken = localStorage.getItem("auth_token");

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("mhema_user");
        localStorage.removeItem("auth_token");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.login(email, password);

      if (response.success && response.user && response.token) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role as UserRole,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl,
          agent: response.user.agent
        };


        setUser(userData);
        setToken(response.token);
        localStorage.setItem("mhema_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", response.token);

        return { success: true };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string; requiresOtp?: boolean; userId?: string }> => {
    try {
      const response = await authAPI.register(fullName, email, password, phone);

      if (response.requiresOtp && response.userId) {
        return { success: true, requiresOtp: true, userId: response.userId };
      }

      if (response.success && response.user && response.token) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role as UserRole,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl
        };


        setUser(userData);
        setToken(response.token);
        localStorage.setItem("mhema_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", response.token);

        return { success: true };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const verifyOtp = async (userId: string, otpCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.verifyOtp(userId, otpCode);

      if (response.success && response.user && response.token) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email,
          fullName: response.user.fullName,
          role: response.user.role as UserRole,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl,
          agent: response.user.agent
        };

        setUser(userData);
        setToken(response.token);
        localStorage.setItem("mhema_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", response.token);

        return { success: true };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("OTP Verification error:", error);
      return { success: false, error: error.message || "OTP verification failed" };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("mhema_user");
    localStorage.removeItem("auth_token");
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem("mhema_user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, register, verifyOtp, logout, updateProfile, isLoading }}>

      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
