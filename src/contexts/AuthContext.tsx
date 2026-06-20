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
  email?: string;
  fullName: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  agent?: Agent;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginOrSignup: (phone: string) => Promise<{ success: boolean; action?: 'login' | 'require_otp'; error?: string }>;
  verifyOtp: (phone: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const loginOrSignup = async (phone: string): Promise<{ success: boolean; action?: 'login' | 'require_otp'; error?: string }> => {
    try {
      const response = await authAPI.login(phone);

      if (response.success) {
        if (response.action === 'login' && response.user && response.token) {
          const userData: User = {
            id: response.user.id,
            email: response.user.email || undefined,
            fullName: response.user.fullName || response.user.phone,
            role: response.user.role as UserRole,
            phone: response.user.phone,
            avatarUrl: response.user.avatarUrl,
            agent: response.user.agent,
          };

          setUser(userData);
          setToken(response.token);
          localStorage.setItem("mhema_user", JSON.stringify(userData));
          localStorage.setItem("auth_token", response.token);

          return { success: true, action: 'login' };
        } else if (response.action === 'require_otp') {
          return { success: true, action: 'require_otp' };
        }
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("Login/Signup error:", error);
      return { success: false, error: error.message || "Authentication failed" };
    }
  };

  const verifyOtp = async (phone: string, otpCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.verifyOtp(phone, otpCode);

      if (response.success && response.user && response.token) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email || undefined,
          fullName: response.user.fullName || response.user.phone,
          role: response.user.role as UserRole,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl,
        };

        setUser(userData);
        setToken(response.token);
        localStorage.setItem("mhema_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", response.token);

        return { success: true };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      return { success: false, error: error.message || "OTP verification failed" };
    }
  };

  const resendOtp = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.resendOtp(phone);
      if (response.success) {
        return { success: true };
      }
      return { success: false, error: "Failed to resend OTP" };
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      return { success: false, error: error.message || "Failed to resend OTP" };
    }
  };

  const adminLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authAPI.adminLogin(email, password);

      if (response.success && response.user && response.token) {
        const userData: User = {
          id: response.user.id,
          email: response.user.email || undefined,
          fullName: response.user.fullName || response.user.phone,
          role: response.user.role as UserRole,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl,
        };

        setUser(userData);
        setToken(response.token);
        localStorage.setItem("mhema_user", JSON.stringify(userData));
        localStorage.setItem("auth_token", response.token);

        return { success: true };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error: any) {
      console.error("Admin Login error:", error);
      return { success: false, error: error.message || "Admin Login failed" };
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
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loginOrSignup, verifyOtp, resendOtp, adminLogin, logout, updateProfile, isLoading }}>
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
