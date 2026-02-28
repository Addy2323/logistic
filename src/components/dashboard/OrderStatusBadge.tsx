import { OrderStatus } from "@/data/mockOrders";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  placed: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  queued: { label: "Queued", className: "bg-slate-100 text-slate-700 border-slate-200" },
  verified: { label: "Verified", className: "bg-blue-100 text-blue-700 border-blue-200" },
  approved: { label: "Approved", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  assigned: { label: "Assigned", className: "bg-blue-100 text-blue-700 border-blue-200" },
  collecting: { label: "Collecting", className: "bg-purple-100 text-purple-700 border-purple-200" },
  packing: { label: "Packing", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  picked: { label: "Picked Up", className: "bg-orange-100 text-orange-700 border-orange-200" },
  in_transit: { label: "In Transit", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  dispatched: { label: "Dispatched", className: "bg-orange-100 text-orange-700 border-orange-200" },
  delivered: { label: "Delivered", className: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 border-red-200" },
};

const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-700 border-gray-200"
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", config.className)}>
      {config.label}
    </span>
  );
};

export default OrderStatusBadge;
