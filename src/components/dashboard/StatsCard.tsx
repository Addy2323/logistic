import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "success";
}

const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const variants = {
    default: "bg-card",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    success: "bg-success text-success-foreground",
  };

  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary-foreground/20 text-primary-foreground",
    secondary: "bg-secondary-foreground/20 text-secondary-foreground",
    success: "bg-success-foreground/20 text-success-foreground",
  };

  return (
    <div className={cn("rounded-2xl p-6 border border-border shadow-sm", variants[variant])}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconVariants[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </div>
        )}
      </div>
      <h3 className={cn("text-sm font-medium mb-1", variant === "default" ? "text-muted-foreground" : "opacity-80")}>
        {title}
      </h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

export default StatsCard;
