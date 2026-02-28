import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  UserCircle,
  Truck,
  CreditCard,
  ClipboardList,
  BarChart3,
  ChevronLeft,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_HOST } from "@/config/api";
import NotificationBell from "./NotificationBell";
import ChatList from "../chat/ChatList";
import AgentStatusToggle from "./AgentStatusToggle";


const DashboardSidebar = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const avatarSrc = user?.avatarUrl ? user.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined;

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };


  const isAdmin = user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";

  const menuItems = [
    { icon: LayoutDashboard, label: t("dashboard.sidebar.overview"), path: "/dashboard", roles: ["ADMIN", "CUSTOMER", "AGENT"] },
    { icon: ClipboardList, label: t("dashboard.sidebar.orders"), path: "/dashboard/orders", roles: ["ADMIN", "CUSTOMER", "AGENT"] },
    { icon: Users, label: t("dashboard.sidebar.customers"), path: "/dashboard/customers", roles: ["ADMIN"] },
    { icon: Truck, label: t("dashboard.sidebar.agents"), path: "/dashboard/agents", roles: ["ADMIN"] },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics", roles: ["ADMIN"] },
    { icon: UserCircle, label: t("dashboard.sidebar.profile"), path: "/dashboard/profile", roles: ["ADMIN", "CUSTOMER", "AGENT"] },
    {
      icon: Settings,
      label: t("dashboard.sidebar.settings"),
      path: "/dashboard/settings",
      roles: ["ADMIN", "AGENT", "CUSTOMER"]
    },
    {
      icon: CreditCard,
      label: t("dashboard.sidebar.payments"),
      path: "/dashboard/payments",
      roles: ["ADMIN"]
    },
    {
      icon: Truck,
      label: t("dashboard.sidebar.transport"),
      path: "/dashboard/transport",
      roles: ["ADMIN"]
    },
    {
      icon: MessageSquare,
      label: "SMS Broadcast",
      path: "/dashboard/sms",
      roles: ["ADMIN"]
    },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || "CUSTOMER"));

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <a href="/" className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight">MHEMA EXPRESS</span>
              <span className="text-xs text-muted-foreground">{t("dashboard.sidebar.title")}</span>
            </div>
          )}
        </a>
        <div className="flex items-center gap-1">
          {!collapsed && (
            <div className="flex items-center gap-1 mr-2">
              <ChatList />
              <NotificationBell />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors hidden lg:flex"
          >
            <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className={cn("p-4 border-b border-border", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={avatarSrc} className="object-cover" />
            <AvatarFallback className="text-sm font-bold bg-secondary text-secondary-foreground">
              {getInitials(user?.fullName || user?.email || '')}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          )}
        </div>
        {isAgent && user?.agent && !collapsed && (
          <div className="mt-4">
            <AgentStatusToggle
              agentId={user.agent.id}
              currentStatus={user.agent.availabilityStatus}
            />
          </div>
        )}
      </div>


      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn("w-full justify-start gap-3 text-muted-foreground hover:text-destructive", collapsed && "justify-center px-2")}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>{t("dashboard.sidebar.logout")}</span>}
        </Button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
