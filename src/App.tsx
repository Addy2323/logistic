import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardOrders from "./pages/dashboard/DashboardOrders";
import DashboardCustomers from "./pages/dashboard/DashboardCustomers";
import DashboardAgents from "./pages/dashboard/DashboardAgents";
import DashboardProfile from "./pages/dashboard/DashboardProfile";
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics";
import DashboardPaymentSettings from "./pages/dashboard/DashboardPaymentSettings";
import DashboardTransportSettings from "./pages/dashboard/DashboardTransportSettings";
import DashboardSettings from "./pages/dashboard/DashboardSettings";
import DashboardSMS from "./pages/dashboard/DashboardSMS";
import NotFound from "./pages/NotFound";
import StartupLoader from "./components/StartupLoader";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <ChatProvider>
              <TooltipProvider>
                {isLoading && <StartupLoader />}
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />}>
                      <Route index element={<DashboardOverview />} />
                      <Route path="orders" element={<DashboardOrders />} />
                      <Route path="customers" element={<DashboardCustomers />} />
                      <Route path="agents" element={<DashboardAgents />} />
                      <Route path="analytics" element={<DashboardAnalytics />} />
                      <Route path="profile" element={<DashboardProfile />} />
                      <Route path="settings" element={<DashboardSettings />} />
                      <Route path="payments" element={<DashboardPaymentSettings />} />
                      <Route path="transport" element={<DashboardTransportSettings />} />
                      <Route path="sms" element={<DashboardSMS />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </ChatProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
