import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ordersAPI, transportAPI, paymentQRAPI, chatsAPI, getImageUrl, customersAPI } from "@/lib/api";
import OrderStatusBadge from "@/components/dashboard/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Plus, Eye, MapPin, Package, RefreshCw, CreditCard, DollarSign, MessageSquare, Printer, Trash2, CheckCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import LocationPicker from "@/components/dashboard/LocationPicker";
import { useChat } from "@/contexts/ChatContext";
import ChatWindow from "@/components/chat/ChatWindow";
import OrderReceipt from "../../components/dashboard/Receipt";
import { API_HOST } from "@/config/api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TransportMethod {
  id: string;
  name: string;
  basePrice: number;
  pricePerKm?: number;
  pricePerKg?: number;
}

interface PaymentQRCode {
  id: string;
  provider: string;
  accountName: string;
  lipaNumber?: string;
  qrCodeUrl: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  orderType: "TYPE_A" | "TYPE_B" | "TYPE_C";
  paymentStatus: string;
  pickupAddress: string;
  deliveryAddress: string;
  description?: string;
  estimatedCost?: number;
  actualCost?: number;
  packageWeight?: number;
  productImageUrls: string[];
  isVerified: boolean;

  // Pricing breakdown
  productPrice?: number;
  agentMargin?: number;
  pickupFee?: number;
  packingFee?: number;
  transportFee?: number;
  totalAmount?: number;

  customer: {
    fullName: string;
    email: string;
    phone?: string;
  };
  agent?: {
    user: {
      fullName: string;
      phone?: string;
    };
  };
  transportMethod?: {
    name: string;
  };
  placedAt: string;
  updatedAt: string;
}

const DashboardOrders = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const { setActiveChatId, activeChatId } = useChat();

  const [orders, setOrders] = useState<Order[]>([]);
  const [transportMethods, setTransportMethods] = useState<TransportMethod[]>([]);
  const [paymentQRs, setPaymentQRs] = useState<PaymentQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  interface FormItem {
    id: string;
    description: string;
    pickupAddress: string;
    quantity: string;
    pair: string;
    weight: string;
    imageUrls: string[];
    imagePreviews: string[];
    isUploading: boolean;
  }

  const [items, setItems] = useState<FormItem[]>([
    {
      id: "1",
      description: "",
      pickupAddress: "",
      quantity: "",
      pair: "",
      weight: "",
      imageUrls: [],
      imagePreviews: [],
      isUploading: false,
    },
  ]);

  const [newOrder, setNewOrder] = useState({
    pickupAddress: "",
    deliveryAddress: "",
    transportMethodId: "",
    orderType: "TYPE_A" as "TYPE_A" | "TYPE_B" | "TYPE_C",
    productPrice: "",
  });

  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "M_PESA"
  });

  type StkState = "idle" | "loading" | "pending" | "success" | "failed";
  const [stkState, setStkState] = useState<StkState>("idle");
  const [stkLoading, setStkLoading] = useState(false);
  const stkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const isAdmin = user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";
  const isCustomer = user?.role === "CUSTOMER";

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectingField, setSelectingField] = useState<"pickup" | "delivery" | null>(null);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    if (selectingField === "pickup") {
      setNewOrder({
        ...newOrder,
        pickupAddress: address,
        // pickupLat: lat, // Add these to state if needed
        // pickupLng: lng
      });
    } else if (selectingField === "delivery") {
      setNewOrder({
        ...newOrder,
        deliveryAddress: address,
        // deliveryLat: lat,
        // deliveryLng: lng
      });
    }
    setIsMapOpen(false);
    setSelectingField(null);
  };

  const openMapFor = (field: "pickup" | "delivery") => {
    setSelectingField(field);
    setIsMapOpen(true);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        description: "",
        pickupAddress: "",
        quantity: "",
        pair: "",
        weight: "",
        imageUrls: [],
        imagePreviews: [],
        isUploading: false,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof FormItem, value: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: string
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Previews
    const newPreviews: string[] = [];
    for (const file of files) {
      const reader = new FileReader();
      const preview = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newPreviews.push(preview);
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? { ...item, imagePreviews: [...item.imagePreviews, ...newPreviews], isUploading: true }
          : item
      )
    );

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("productImages", file);
      });

      const response: any = await ordersAPI.uploadProductImage(formData);
      if (response && response.success) {
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === itemId
              ? {
                ...item,
                imageUrls: [...item.imageUrls, ...response.data.productImageUrls],
                isUploading: false,
              }
              : item
          )
        );
        toast.success("Images uploaded successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload images");
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, imagePreviews: [], isUploading: false } // Clear previews on error? Or keep them?
            : item
        )
      );
    }
  };

  const handleUpdatePricing = async (orderId: string, data: any) => {
    try {
      const response: any = await ordersAPI.update(orderId, data);
      if (response && response.success) {
        toast.success("Pricing updated");
        fetchOrders();
        // Update selected order in state to show new total immediately
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, ...response.data });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update pricing");
    }
  };

  const handleVerifyOrder = async (orderId: string) => {
    try {
      const response: any = await ordersAPI.verifyOrder(orderId);
      if (response && response.success) {
        toast.success("Order verified successfully");
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, isVerified: true });
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify order");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone and will delete all related records (chats, sales records, etc.).")) {
      return;
    }

    try {
      const response: any = await ordersAPI.delete(orderId);
      if (response && response.success) {
        toast.success("Order deleted successfully");
        fetchOrders();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    }
  };

  const handleOpenChat = async (orderId: string) => {
    try {
      const response: any = await chatsAPI.getByOrderId(orderId);
      if (response.success && response.data) {
        setActiveChatId(response.data.id);
      } else {
        toast.error("Chat room not found for this order");
      }
    } catch (error) {
      console.error("Failed to open chat:", error);
      toast.error("Failed to open chat. Please try again.");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchTransportMethods();
    if (isCustomer) {
      fetchPaymentQRs();
    }
    if (isAdmin) {
      fetchCustomers();
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: pageSize
      };
      if (statusFilter !== "all") params.status = statusFilter;

      const response: any = await ordersAPI.list(params);
      if (response && response.success) {
        setOrders(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransportMethods = async () => {
    try {
      const response: any = await transportAPI.list();
      if (response && response.success) {
        const data = response.data || [];
        // Filter out duplicates and "Motorcycle"
        const uniqueMethods = data.filter((method: TransportMethod, index: number, self: TransportMethod[]) =>
          index === self.findIndex((t) => t.name === method.name) &&
          method.name.toLowerCase() !== "motorcycle"
        );
        setTransportMethods(uniqueMethods);
      }
    } catch (error) {
      console.error("Failed to fetch transport methods:", error);
    }
  };

  const fetchPaymentQRs = async () => {
    try {
      const response: any = await paymentQRAPI.list();
      if (response && response.success) {
        setPaymentQRs(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payment QRs:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response: any = await customersAPI.list();
      if (response && response.success) {
        setCustomers(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOrder.transportMethodId) {
      toast.error("Please select a transport method");
      return;
    }

    // Aggregate data
    let totalWeight = 0;
    const allImageUrls: string[] = [];
    const descriptionParts: string[] = [];

    items.forEach((item, index) => {
      const weightVal = parseFloat(item.weight);
      if (!isNaN(weightVal)) {
        totalWeight += weightVal;
      }

      allImageUrls.push(...item.imageUrls);

      let itemDesc = `${index + 1}. ${item.description || "Item"}`;
      if (item.quantity) {
        itemDesc += ` x${item.quantity}`;
      }
      if (item.pair) {
        itemDesc += ` (${item.pair} pairs)`;
      }
      if (item.pickupAddress && item.pickupAddress.trim() !== "") {
        itemDesc += ` [Pickup: ${item.pickupAddress}]`;
      }
      if (item.weight) {
        itemDesc += ` - ${item.weight}kg`;
      }
      descriptionParts.push(itemDesc);
    });

    const finalDescription = descriptionParts.join("\n");

    const orderPayload = {
      ...newOrder,
      description: finalDescription,
      packageWeight: totalWeight,
      productImageUrls: allImageUrls,
      ...(isAdmin && selectedCustomerId ? { customerId: selectedCustomerId } : {}),
    };

    try {
      const response: any = await ordersAPI.create(orderPayload);
      if (response && response.success) {
        toast.success("Order created successfully!");
        setIsNewOrderOpen(false);
        setNewOrder({
          pickupAddress: "",
          deliveryAddress: "",
          transportMethodId: "",
          orderType: "TYPE_A",
          productPrice: "",
        });
        setSelectedCustomerId("");
        setItems([
          {
            id: Date.now().toString(),
            description: "",
            pickupAddress: "",
            quantity: "",
            pair: "",
            weight: "",
            imageUrls: [],
            imagePreviews: [],
            isUploading: false,
          },
        ]);
        fetchOrders();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
      fetchOrders(); // Refresh anyway as the order might have been created before the error
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response: any = await ordersAPI.updateStatus(orderId, newStatus);
      if (response && response.success) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleConfirmPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const response: any = await ordersAPI.confirmPayment(
        selectedOrder.id,
        paymentData.method,
        parseFloat(paymentData.amount)
      );

      if (response && response.success) {
        toast.success("Payment confirmed successfully!");
        setIsConfirmPaymentOpen(false);
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm payment");
    }
  };

  const openConfirmPayment = (order: Order) => {
    setSelectedOrder(order);
    setPaymentData({
      amount: order.estimatedCost?.toString() || "",
      method: "M_PESA"
    });
    setIsConfirmPaymentOpen(true);
  };

  const openPaymentModal = (order: Order) => {
    if (!order.actualCost || order.actualCost === 0) {
      if (order.isVerified) {
        toast.success("Product verified! We are finalizing the cost. Please check back in a moment to complete your payment.", { duration: 6000 });
        return;
      }

      let message = "Thank you, your order was placed successfully.";

      if (!order.agent) {
        message += " Your order is being processed. An agent will be assigned to you shortly.";
      } else {
        const agentName = order.agent.user.fullName;
        const agentPhone = order.agent.user.phone;

        if (agentPhone) {
          message += ` Please initialize a chat with the agent or contact the agent at ${agentPhone}`;
        } else {
          message += ` Please use the chat to contact your assigned agent, ${agentName}.`;
        }
      }

      toast.success(message, { duration: 6000 });
      return;
    }
    setSelectedOrder(order);
    setStkState("idle");
    setIsPaymentOpen(true);
  };

  const handleSTKPush = async () => {
    if (!selectedOrder) return;
    setStkLoading(true);
    setStkState("loading");

    // Clear any previous polling
    if (stkPollRef.current) {
      clearInterval(stkPollRef.current);
      stkPollRef.current = null;
    }

    try {
      const pushRes: any = await ordersAPI.initiateSTKPush(selectedOrder.id);
      const snippeReference: string | undefined = pushRes?.data?.reference;

      setStkState("pending");
      setStkLoading(false);

      // Poll every 5 seconds for up to 4 minutes using the fresh reference
      let attempts = 0;
      const maxAttempts = 48;
      const intervalId = setInterval(async () => {
        attempts++;
        try {
          const res: any = await ordersAPI.getSTKStatus(selectedOrder.id, snippeReference);
          const status = res?.data?.status;
          const payStatus = res?.data?.paymentStatus;

          if (status === "completed" || payStatus === "CONFIRMED") {
            clearInterval(intervalId);
            stkPollRef.current = null;
            setStkState("success");
            fetchOrders();
          } else if (status === "failed" || status === "voided" || status === "expired") {
            clearInterval(intervalId);
            stkPollRef.current = null;
            setStkState("failed");
          } else if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            stkPollRef.current = null;
            setStkState("failed");
            toast.error("Payment timed out. Please try again.");
          }
        } catch {
          // Ignore polling errors, keep trying
        }
      }, 5000);

      stkPollRef.current = intervalId;
    } catch (error: any) {
      setStkState("failed");
      setStkLoading(false);
      toast.error(error.message || "Failed to send STK push");
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.pickupAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.fullName.toLowerCase().includes(searchQuery.toLowerCase());

    return searchQuery ? matchesSearch : true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage all orders" : isAgent ? "View assigned orders" : "Track your orders"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {(isAdmin || (!isAdmin && !isAgent)) && (
            <Button variant="hero" onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="PLACED">Pending</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-6 py-4 text-sm font-semibold">Order #</th>
                {isAdmin && <th className="text-left px-6 py-4 text-sm font-semibold">Customer</th>}
                <th className="text-left px-6 py-4 text-sm font-semibold">Route</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold">Date</th>
                <th className="text-right px-6 py-4 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">{order.orderNumber}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium">{order.customer.fullName}</p>
                          <p className="text-xs text-muted-foreground">{order.customer.phone || order.customer.email}</p>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="max-w-[200px]">
                        <p className="text-sm text-foreground truncate">{order.pickupAddress}</p>
                        <p className="text-xs text-muted-foreground truncate">→ {order.deliveryAddress}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order.status.toLowerCase() as any} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {order.totalAmount ? (
                            `TSh ${order.totalAmount.toLocaleString()}`
                          ) : order.actualCost ? (
                            `TSh ${order.actualCost.toLocaleString()}`
                          ) : order.estimatedCost && order.estimatedCost > 0 ? (
                            `TSh ${order.estimatedCost.toLocaleString()}`
                          ) : (
                            <span className="text-muted-foreground italic">Pending</span>
                          )}
                        </span>
                        {(order.totalAmount || order.actualCost) && order.estimatedCost && (order.totalAmount || order.actualCost) !== order.estimatedCost && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            Est: TSh {order.estimatedCost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          try {
                            return order.placedAt
                              ? formatDistanceToNow(new Date(order.placedAt), { addSuffix: true })
                              : "N/A";
                          } catch (e) {
                            return "Invalid Date";
                          }
                        })()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {isCustomer && order.paymentStatus === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => openPaymentModal(order)}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenChat(order.id)}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        {order.status === "COMPLETED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-secondary text-secondary hover:bg-secondary hover:text-white"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowReceipt(true);
                              toast.info("Downloading receipt...");
                            }}
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Receipt
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first, last, current, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  (page === currentPage - 2 && page > 1) ||
                  (page === currentPage + 2 && page < totalPages)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* New Order Modal */}
      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new delivery order.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Customer</label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone || customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">Admin can place an order on behalf of a customer.</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup Address</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter pickup location"
                  value={newOrder.pickupAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, pickupAddress: e.target.value })}
                  required
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openMapFor("pickup")}>
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Address</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter delivery location"
                  value={newOrder.deliveryAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                  required
                />
                <Button type="button" variant="outline" size="icon" onClick={() => openMapFor("delivery")}>
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Transport Method</label>
              <Select
                value={newOrder.transportMethodId}
                onValueChange={(value) => setNewOrder({ ...newOrder, transportMethodId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transport method" />
                </SelectTrigger>
                <SelectContent>
                  {transportMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Type Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Order Type</label>
              <div className="grid gap-2">
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newOrder.orderType === "TYPE_A"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <input
                    type="radio"
                    name="orderType"
                    value="TYPE_A"
                    checked={newOrder.orderType === "TYPE_A"}
                    onChange={(e) => setNewOrder({ ...newOrder, orderType: e.target.value as "TYPE_A" | "TYPE_B" | "TYPE_C", productPrice: "" })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Type A - Logistics Only</span>
                    <p className="text-xs text-muted-foreground mt-0.5">I already paid the supplier. I need pickup & delivery only.</p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newOrder.orderType === "TYPE_B"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <input
                    type="radio"
                    name="orderType"
                    value="TYPE_B"
                    checked={newOrder.orderType === "TYPE_B"}
                    onChange={(e) => setNewOrder({ ...newOrder, orderType: e.target.value as "TYPE_A" | "TYPE_B" | "TYPE_C" })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Type B - Pay & Deliver</span>
                    <p className="text-xs text-muted-foreground mt-0.5">I know the price. MHEMA will pay the supplier and deliver to me.</p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${newOrder.orderType === "TYPE_C"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <input
                    type="radio"
                    name="orderType"
                    value="TYPE_C"
                    checked={newOrder.orderType === "TYPE_C"}
                    onChange={(e) => setNewOrder({ ...newOrder, orderType: e.target.value as "TYPE_A" | "TYPE_B" | "TYPE_C", productPrice: "" })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Type C - Source & Deliver</span>
                    <p className="text-xs text-muted-foreground mt-0.5">I don't know the price. MHEMA will find, negotiate, buy and deliver.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Product Price - Only shown for Type B */}
            {newOrder.orderType === "TYPE_B" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Price (TSh)</label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Enter the product price"
                  value={newOrder.productPrice}
                  onChange={(e) => setNewOrder({ ...newOrder, productPrice: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">This is the price you want us to pay to the supplier.</p>
              </div>
            )}

            {/* Info message for Type C */}
            {newOrder.orderType === "TYPE_C" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> Our agent will source the product and provide you with the final price after negotiation.
                </p>
              </div>
            )}

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border border-border rounded-xl space-y-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      placeholder="Item description (e.g., Red Box)"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Pickup Location <span className="text-muted-foreground font-normal">(Optional if same as main pickup)</span>
                    </label>
                    <Input
                      placeholder="Specific pickup location for this item"
                      value={item.pickupAddress}
                      onChange={(e) => handleItemChange(item.id, "pickupAddress", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pair</label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Pairs"
                        value={item.pair}
                        onChange={(e) => handleItemChange(item.id, "pair", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Weight (kg)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="kg"
                        value={item.weight}
                        onChange={(e) => handleItemChange(item.id, "weight", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Images</label>
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleImageUpload(e, item.id)}
                        className="cursor-pointer"
                      />
                      {item.imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {item.imagePreviews.map((preview, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                              <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                              {item.isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={handleAddItem} className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Item
              </Button>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={items.some(i => i.isUploading)}>
              Create Order
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <Dialog
        open={!!selectedOrder && !isConfirmPaymentOpen && !isPaymentOpen}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View and manage the details of this order.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold">{selectedOrder.orderNumber}</span>
                  <div className="flex gap-2 mt-2">
                    <OrderStatusBadge status={selectedOrder.status.toLowerCase() as any} />
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedOrder.paymentStatus === "CONFIRMED"
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-amber/10 text-amber border border-amber/20"
                      }`}>
                      {selectedOrder.paymentStatus}
                    </span>
                    {selectedOrder.isVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        VERIFIED
                      </span>
                    )}
                  </div>
                </div>
                {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" && (
                  <Select onValueChange={(val) => handleUpdateStatus(selectedOrder.id, val)}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLACED">Pending</SelectItem>
                      <SelectItem value="ASSIGNED">Assigned</SelectItem>
                      <SelectItem value="PICKED">Picked Up</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Route</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">From: {selectedOrder.pickupAddress}</p>
                      <p className="text-sm font-medium mt-1">To: {selectedOrder.deliveryAddress}</p>
                    </div>
                  </div>
                  {selectedOrder.description && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedOrder.description}</p>
                  )}
                  {selectedOrder.transportMethod && (
                    <p className="text-sm font-medium mt-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Via {selectedOrder.transportMethod.name}
                    </p>
                  )}
                  {selectedOrder.productImageUrls && selectedOrder.productImageUrls.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Product Images</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedOrder.productImageUrls.map((url, index) => {
                          const imageUrl = getImageUrl(url);
                          return (
                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`Product ${index + 1}`}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                  onError={(e) => {
                                    // Show fallback icon on error instead of hiding
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    if (parent) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'flex flex-col items-center gap-1 text-muted-foreground';
                                      fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.82-2.82"/><line x1="14.5" y1="14.5" x2="14.51" y2="14.5"/><path d="m18.8 13.2 3.2 3.2v3.6a2 2 0 0 1-2 2H5.2l10.5-10.5Z"/><path d="M3 16.5V5.2a2 2 0 0 1 2-2H18.8l-10.5 10.5Z"/></svg><span class="text-[10px]">Error loading</span>';
                                      parent.appendChild(fallback);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <ImageIcon className="w-6 h-6 opacity-20" />
                                  <span className="text-[10px]">No image</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Breakdown */}
                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Pricing Breakdown ({selectedOrder.orderType.replace('TYPE_', 'Type ')})</h4>

                  <div className="space-y-2">
                    {/* Product Price - Shown for Type B & C */}
                    {(selectedOrder.orderType === "TYPE_B" || selectedOrder.orderType === "TYPE_C") && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Product Price</span>
                        {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" ? (
                          <Input
                            type="number"
                            className="h-7 w-24 text-right text-xs"
                            defaultValue={selectedOrder.productPrice || ""}
                            onBlur={(e) => handleUpdatePricing(selectedOrder.id, { productPrice: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <span className="font-medium">TSh {selectedOrder.productPrice?.toLocaleString() || 0}</span>
                        )}
                      </div>
                    )}

                    {/* Agent Margin - Shown for Type C */}
                    {selectedOrder.orderType === "TYPE_C" && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Agent Margin</span>
                        {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" ? (
                          <Input
                            type="number"
                            className="h-7 w-24 text-right text-xs"
                            defaultValue={selectedOrder.agentMargin || ""}
                            onBlur={(e) => handleUpdatePricing(selectedOrder.id, { agentMargin: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <span className="font-medium">TSh {selectedOrder.agentMargin?.toLocaleString() || 0}</span>
                        )}
                      </div>
                    )}

                    {/* Pickup Fee */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Pickup Fee</span>
                      {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" ? (
                        <Input
                          type="number"
                          className="h-7 w-24 text-right text-xs"
                          defaultValue={selectedOrder.pickupFee || ""}
                          onBlur={(e) => handleUpdatePricing(selectedOrder.id, { pickupFee: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-medium">TSh {selectedOrder.pickupFee?.toLocaleString() || 0}</span>
                      )}
                    </div>

                    {/* Packing Fee */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Packing Fee</span>
                      {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" ? (
                        <Input
                          type="number"
                          className="h-7 w-24 text-right text-xs"
                          defaultValue={selectedOrder.packingFee || ""}
                          onBlur={(e) => handleUpdatePricing(selectedOrder.id, { packingFee: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-medium">TSh {selectedOrder.packingFee?.toLocaleString() || 0}</span>
                      )}
                    </div>

                    {/* Transport Fee */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Transport Fee</span>
                      {(isAdmin || isAgent) && selectedOrder.status !== "COMPLETED" ? (
                        <Input
                          type="number"
                          className="h-7 w-24 text-right text-xs"
                          defaultValue={selectedOrder.transportFee || ""}
                          onBlur={(e) => handleUpdatePricing(selectedOrder.id, { transportFee: parseFloat(e.target.value) })}
                        />
                      ) : (
                        <span className="font-medium">TSh {selectedOrder.transportFee?.toLocaleString() || 0}</span>
                      )}
                    </div>

                    <div className="border-t border-border pt-2 mt-2 flex justify-between items-center">
                      <span className="font-bold text-sm">Total Amount</span>
                      <span className="text-lg font-bold text-primary">
                        TSh {selectedOrder.totalAmount?.toLocaleString() || selectedOrder.actualCost?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedOrder.agent && (
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Assigned Agent</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{selectedOrder.agent.user.fullName}</p>
                        {selectedOrder.agent.user.phone && (
                          <p className="text-xs text-muted-foreground">{selectedOrder.agent.user.phone}</p>
                        )}
                      </div>
                      {selectedOrder.agent.user.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => window.open(`tel:${selectedOrder.agent?.user.phone}`, '_self')}
                        >
                          Call Agent
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {(isAdmin || isAgent) && !selectedOrder.isVerified && (
                  <Button
                    variant="hero"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleVerifyOrder(selectedOrder.id)}
                  >
                    Verify Product
                  </Button>
                )}

                {(isAdmin || isAgent) && selectedOrder.paymentStatus === "PENDING" && selectedOrder.actualCost && (
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => openConfirmPayment(selectedOrder)}
                  >
                    Confirm Payment
                  </Button>
                )}

                {isCustomer && selectedOrder.paymentStatus === "PENDING" && (
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => openPaymentModal(selectedOrder)}
                  >
                    Pay Now
                  </Button>
                )}

                <div className="text-xs text-muted-foreground pt-4 border-t">
                  Created: {(() => {
                    try {
                      return selectedOrder.placedAt
                        ? format(new Date(selectedOrder.placedAt), "PPpp")
                        : "N/A";
                    } catch (e) {
                      return "Invalid Date";
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* STK Push Payment Modal (Customer) */}
      <Dialog open={isPaymentOpen} onOpenChange={(open) => {
        const isProcessing = stkState === "loading" || stkState === "pending";
        if (!isProcessing) {
          setIsPaymentOpen(open);
          if (!open) setStkState("idle");
        }
      }}>
        <DialogContent
          className="max-w-md"
          onInteractOutside={(e) => {
            if (stkState === "loading" || stkState === "pending") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (stkState === "loading" || stkState === "pending") e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Pay via Mobile Money</DialogTitle>
            {stkState !== "loading" && stkState !== "pending" && (
              <DialogDescription>
                Order #{selectedOrder?.orderNumber} — Amount: <span className="font-bold text-foreground">TZS {(selectedOrder?.actualCost || 0).toLocaleString()}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {stkState === "idle" && (
            <div className="space-y-4">
              {/* Payment provider logos */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Supported Networks</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: "M-Pesa", file: "mpesa.png" },
                    { name: "Airtel Money", file: "airtel-money.png" },
                    { name: "Tigo Pesa", file: "tigo-pesa.png" },
                    { name: "Halopesa", file: "halopesa.png" },
                    { name: "CRDB", file: "crdb.png" },
                    { name: "NMB", file: "nmb.png" },
                  ].map((p) => (
                    <div
                      key={p.file}
                      className="flex flex-col items-center justify-center gap-1.5 bg-muted/40 border border-border rounded-xl p-3 hover:border-primary/40 hover:bg-muted/70 transition-colors"
                    >
                      <img
                        src={`/payments/${p.file}`}
                        alt={p.name}
                        className="h-8 w-auto object-contain"
                      />
                      <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1.5">
                <p className="font-medium text-foreground text-xs uppercase tracking-wide">How it works</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Click <strong>"Send STK Push"</strong> below.</li>
                  <li>A USSD prompt will appear on your phone.</li>
                  <li>Enter your mobile money PIN to confirm.</li>
                  <li>Payment is confirmed automatically.</li>
                </ol>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                Make sure your registered phone number is correct and has sufficient balance.
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleSTKPush}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Send STK Push — TZS {(selectedOrder?.actualCost || 0).toLocaleString()}
              </Button>
            </div>
          )}

          {(stkState === "loading" || stkState === "pending") && (
            <div className="flex flex-col items-center py-6 space-y-5">
              {/* Pulsing ring + spinner */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full border-4 border-primary/20 animate-ping" />
                <div className="absolute w-20 h-20 rounded-full border-4 border-primary/30" />
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <CreditCard className="absolute w-6 h-6 text-primary" />
              </div>

              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground text-base">
                  {stkState === "loading" ? "Sending to your phone…" : "Waiting for your PIN…"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stkState === "loading"
                    ? "Please wait while we send the payment request."
                    : "Check your phone and enter your mobile money PIN to confirm."}
                </p>
              </div>

              {/* Amount pill */}
              <div className="bg-primary/10 border border-primary/20 rounded-full px-5 py-2">
                <span className="text-sm font-bold text-primary">
                  TZS {(selectedOrder?.actualCost || 0).toLocaleString()}
                </span>
              </div>

              {/* Dots progress indicator */}
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>

              {stkState === "pending" && (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    Payment will be confirmed automatically once you complete it on your phone.
                  </p>
                  {/* Mini provider logos strip */}
                  <div className="flex items-center justify-center gap-3 pt-1">
                    {["mpesa.png", "airtel-money.png", "tigo-pesa.png", "halopesa.png", "crdb.png", "nmb.png"].map((f) => (
                      <img key={f} src={`/payments/${f}`} alt={f} className="h-5 w-auto object-contain opacity-60" />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {stkState === "success" && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <p className="font-bold text-foreground text-lg">Payment Successful!</p>
              <p className="text-sm text-muted-foreground text-center">
                Your payment for order #{selectedOrder?.orderNumber} has been confirmed.
              </p>
              <Button variant="hero" className="w-full mt-2" onClick={() => {
                setIsPaymentOpen(false);
                setStkState("idle");
                fetchOrders();
              }}>
                Done
              </Button>
            </div>
          )}

          {stkState === "failed" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                  <RefreshCw className="w-7 h-7 text-red-500" />
                </div>
                <p className="font-semibold text-foreground">Payment Failed</p>
                <p className="text-sm text-muted-foreground text-center">
                  The payment was not completed. Please check your balance and try again.
                </p>
              </div>
              <Button variant="hero" className="w-full" onClick={handleSTKPush}>
                Try Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => {
                setIsPaymentOpen(false);
                setStkState("idle");
              }}>
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Modal (Agent/Admin) */}
      <Dialog open={isConfirmPaymentOpen} onOpenChange={setIsConfirmPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Record payment details for Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmPaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={paymentData.method}
                onValueChange={(val) => setPaymentData({ ...paymentData, method: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M_PESA">M-Pesa</SelectItem>
                  <SelectItem value="TIGO_PESA">Tigo Pesa</SelectItem>
                  <SelectItem value="SELCOM">Selcom</SelectItem>
                  <SelectItem value="RIPA">RIPA</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Received (TZS)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full">
              Confirm Payment
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Map Selection Modal */}
      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select {selectingField === "pickup" ? "Pickup" : "Delivery"} Location</DialogTitle>
            <DialogDescription>
              Click on the map to select the exact location. You can also search for a place.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              restrictToKariakoo={selectingField === "pickup"}
            />
          </div>
        </DialogContent>
      </Dialog>
      {activeChatId && (
        <ChatWindow
          chatId={activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
      {showReceipt && selectedOrder && (
        <OrderReceipt
          order={selectedOrder}
          onClose={() => {
            setShowReceipt(false);
            setSelectedOrder(null);
          }}
          autoDownload={true}
        />
      )}
    </div>
  );
};

export default DashboardOrders;
