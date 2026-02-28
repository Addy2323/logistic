import { mockOrders } from "@/data/mockOrders";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatDistanceToNow } from "date-fns";

interface RecentOrdersProps {
  limit?: number;
  customerId?: string;
}

const RecentOrders = ({ limit = 5, customerId }: RecentOrdersProps) => {
  let orders = [...mockOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (customerId) {
    orders = orders.filter(o => o.customerId === customerId);
  }

  orders = orders.slice(0, limit);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Recent Orders</h3>
        <a href="/dashboard/orders" className="text-sm text-secondary hover:underline font-medium">
          View all
        </a>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-semibold text-foreground">{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm text-muted-foreground truncate">{order.productDetails}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {order.shopName} • {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-sm font-semibold text-foreground">
                TZS {(order.actualPrice || order.estimatedPrice).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{order.deliveryMethod}</p>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No orders yet
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
