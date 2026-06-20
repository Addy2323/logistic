import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ordersAPI, transportAPI, paymentQRAPI, chatsAPI, getImageUrl, customersAPI, agentsAPI, addressesAPI, reviewsAPI } from "@/lib/api";
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
import { Search, Plus, Eye, MapPin, Package, RefreshCw, CreditCard, DollarSign, MessageSquare, Printer, Trash2, CheckCircle, Image as ImageIcon, Star, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import LocationPicker from "@/components/dashboard/LocationPicker";
import { useChat } from "@/contexts/ChatContext";
import ChatWindow from "@/components/chat/ChatWindow";
import OrderReceipt from "../../components/dashboard/Receipt";
import { API_HOST } from "@/config/api";
import VerifiedBadge from "@/components/VerifiedBadge";
import DeliveryRouteMap from "@/components/dashboard/DeliveryRouteMap";
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
  agentId?: string;
  paymentReceiptUrl?: string;

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
  const [paymentMethodTab, setPaymentMethodTab] = useState<"stk" | "receipt">("stk");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const { setActiveChatId, activeChatId } = useChat();

  // Driver Assignment States (V2.0)
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("Motorcycle");
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState("");
  const [driverPickup, setDriverPickup] = useState("");
  const [driverDelivery, setDriverDelivery] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);

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
    productId?: string;
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
      productId: "",
    },
  ]);

  const [newOrder, setNewOrder] = useState({
    pickupAddress: "",
    pickupLat: null as number | null,
    pickupLng: null as number | null,
    deliveryAddress: "",
    deliveryLat: null as number | null,
    deliveryLng: null as number | null,
    transportMethodId: "",
    orderType: "TYPE_A" as "TYPE_A" | "TYPE_B" | "TYPE_C",
    productPrice: "",
    agentId: "",
    productId: "",
  });

  const [availableAgents, setAvailableAgents] = useState<any[]>([]);

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

  // Extended V2.0 states
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAgentPaymentProfile, setSelectedAgentPaymentProfile] = useState<any>(null);

  // Verification states
  const [isVerifyingDeliveryOpen, setIsVerifyingDeliveryOpen] = useState(false);
  const [deliveryVerificationCode, setDeliveryVerificationCode] = useState("");
  const [tempStatusUpdate, setTempStatusUpdate] = useState("");

  // Review states
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [ratings, setRatings] = useState({
    communication: 5,
    deliverySpeed: 5,
    professionalism: 5,
    productQuality: 5
  });
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispute states
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("DELIVERY_ISSUES");
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      const agentId = searchParams.get("agentId") || "";
      const productId = searchParams.get("productId") || "";
      const productName = searchParams.get("productName") || "";
      const productPrice = searchParams.get("productPrice") || "";
      const productImage = searchParams.get("productImage") || "";
      const productDesc = searchParams.get("productDesc") || "";

      // Prefill newOrder state
      setNewOrder({
        pickupAddress: "",
        deliveryAddress: "",
        transportMethodId: "",
        orderType: "TYPE_B",
        productPrice: productPrice,
        agentId: agentId,
        productId: productId,
      });

      // Prefill items state
      setItems([
        {
          id: "1",
          description: productName + (productDesc ? ` - ${productDesc}` : ""),
          pickupAddress: "",
          quantity: "1",
          pair: "",
          weight: "",
          imageUrls: productImage ? [productImage] : [],
          imagePreviews: productImage ? [getImageUrl(productImage) || ""] : [],
          isUploading: false,
          productId: productId,
        }
      ]);

      // Open new order modal
      setIsNewOrderOpen(true);

      // Clean search parameters from URL without reloading
      navigate("/dashboard/orders", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    if (selectingField === "pickup") {
      setNewOrder({
        ...newOrder,
        pickupAddress: address,
        pickupLat: lat,
        pickupLng: lng
      });
    } else if (selectingField === "delivery") {
      setNewOrder({
        ...newOrder,
        deliveryAddress: address,
        deliveryLat: lat,
        deliveryLng: lng
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
    fetchAvailableAgents();
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

  useEffect(() => {
    if (selectedOrder) {
      setDriverPickup(selectedOrder.pickupAddress || "");
      setDriverDelivery(selectedOrder.deliveryAddress || "");
    } else {
      setDriverPickup("");
      setDriverDelivery("");
    }
  }, [selectedOrder]);

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

  const fetchAvailableAgents = async () => {
    try {
      const response = await agentsAPI.getPublicList();
      if (response.success) {
        setAvailableAgents(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch available agents:", error);
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
      agentId: (newOrder.agentId && newOrder.agentId !== "auto") ? newOrder.agentId : undefined,
      productId: newOrder.productId || undefined,
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
          pickupLat: null,
          pickupLng: null,
          deliveryAddress: "",
          deliveryLat: null,
          deliveryLng: null,
          transportMethodId: "",
          orderType: "TYPE_A",
          productPrice: "",
          agentId: "",
          productId: "",
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
            productId: "",
          },
        ]);
        fetchOrders();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
      fetchOrders(); // Refresh anyway as the order might have been created before the error
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setSelectedAgentPaymentProfile(null);
    setIsReviewFormOpen(false);
    try {
      const freshOrderRes: any = await ordersAPI.getById(order.id);
      if (freshOrderRes && freshOrderRes.success) {
        setSelectedOrder(freshOrderRes.data);
      }
      if (order.agentId) {
        const paymentProfileRes: any = await agentsAPI.getAgentPaymentProfile(order.agentId);
        if (paymentProfileRes && paymentProfileRes.success) {
          setSelectedAgentPaymentProfile(paymentProfileRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch fresh order details or agent payment profile:", err);
    }
  };

  const handleStatusSelect = (val: string) => {
    if (!selectedOrder) return;
    if (val === "DELIVERED_SUCCESSFULLY") {
      setTempStatusUpdate(val);
      setDeliveryVerificationCode("");
      setIsVerifyingDeliveryOpen(true);
    } else {
      handleUpdateStatus(selectedOrder.id, val);
    }
  };

  const handleVerifyDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !deliveryVerificationCode.trim()) return;
    try {
      const response: any = await ordersAPI.updateStatus(selectedOrder.id, "DELIVERED_SUCCESSFULLY", deliveryVerificationCode.trim());
      if (response && response.success) {
        toast.success("Order marked as Delivered Successfully!");
        setIsVerifyingDeliveryOpen(false);
        handleViewDetails(selectedOrder);
        fetchOrders();
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code. Please request the correct code from the customer.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmittingReview(true);
    try {
      const response: any = await reviewsAPI.submit({
        orderId: selectedOrder.id,
        communication: ratings.communication,
        deliverySpeed: ratings.deliverySpeed,
        professionalism: ratings.professionalism,
        productQuality: ratings.productQuality,
        comment: reviewComment
      });
      if (response && response.success) {
        toast.success("Thank you for your feedback! Review submitted.");
        setIsReviewFormOpen(false);
        setReviewComment("");
        setRatings({
          communication: 5,
          deliverySpeed: 5,
          professionalism: 5,
          productQuality: 5
        });
        handleViewDetails(selectedOrder);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !disputeReason.trim()) return;
    setSubmittingDispute(true);
    try {
      const response: any = await ordersAPI.disputePayment(selectedOrder.id, disputeReason, disputeCategory);
      if (response && response.success) {
        toast.success("Dispute filed successfully. Order payment is now marked as DISPUTED. Super Admin has been notified.");
        setIsDisputeOpen(false);
        setDisputeReason("");
        handleViewDetails(selectedOrder);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to file dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (val: number) => void; label: string }) => {
    return (
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 cursor-pointer transition-colors ${
                star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground opacity-30"
              }`}
              onClick={() => onChange(star)}
            />
          ))}
        </div>
      </div>
    );
  };

  const fetchSavedAddresses = async () => {
    try {
      const response: any = await addressesAPI.list();
      if (response && response.success) {
        setSavedAddresses(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch saved addresses:", error);
    }
  };

  useEffect(() => {
    if (isCustomer || isAdmin) {
      fetchSavedAddresses();
    }
  }, [isCustomer, isAdmin]);

  const handleUpdateStatus = async (orderId: string, newStatus: string, verificationCode?: string) => {
    try {
      const response: any = await ordersAPI.updateStatus(orderId, newStatus, verificationCode);
      if (response && response.success) {
        toast.success(`Order status updated to ${newStatus}`);
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          handleViewDetails(selectedOrder);
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!driverName || !driverPhone || !vehicleType || !vehiclePlateNumber || !driverPickup || !driverDelivery) {
      toast.error("Please fill in all required driver and route fields");
      return;
    }
    
    setIsAssigningDriver(true);
    try {
      const response: any = await ordersAPI.assignDriver(selectedOrder.id, {
        driverName,
        driverPhone,
        vehicleType,
        vehiclePlateNumber,
        pickupLocation: driverPickup,
        deliveryLocation: driverDelivery,
        notes: driverNotes
      });
      
      if (response && response.success) {
        toast.success("Driver assigned successfully!");
        setIsAssignDriverOpen(false);
        
        // Reset fields
        setDriverName("");
        setDriverPhone("");
        setVehiclePlateNumber("");
        setDriverNotes("");

        // Refresh lists
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign driver");
    } finally {
      setIsAssigningDriver(false);
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

  const openConfirmPayment = async (order: Order) => {
    setSelectedOrder(order);
    setSelectedAgentPaymentProfile(null);
    setPaymentData({
      amount: order.estimatedCost?.toString() || "",
      method: "M_PESA"
    });
    setIsConfirmPaymentOpen(true);
    if (order.agentId) {
      try {
        const paymentProfileRes: any = await agentsAPI.getAgentPaymentProfile(order.agentId);
        if (paymentProfileRes && paymentProfileRes.success) {
          setSelectedAgentPaymentProfile(paymentProfileRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch agent payment profile:", err);
      }
    }
  };

  const openPaymentModal = async (order: Order) => {
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
    setSelectedAgentPaymentProfile(null);
    setStkState("idle");
    setPaymentMethodTab("stk");
    setReceiptFile(null);
    setIsUploadingReceipt(false);
    setIsPaymentOpen(true);
    if (order.agentId) {
      try {
        const paymentProfileRes: any = await agentsAPI.getAgentPaymentProfile(order.agentId);
        if (paymentProfileRes && paymentProfileRes.success) {
          setSelectedAgentPaymentProfile(paymentProfileRes.data);
        }
      } catch (err) {
        console.error("Failed to fetch agent payment profile:", err);
      }
    }
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

  const handleUploadReceipt = async () => {
    if (!selectedOrder) return;
    if (!receiptFile) {
      toast.error("Please select a receipt file to upload");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", receiptFile);
      const res: any = await ordersAPI.uploadReceipt(selectedOrder.id, formData);
      if (res && res.success) {
        toast.success("Receipt uploaded successfully! Awaiting verification.");
        setIsPaymentOpen(false);
        setReceiptFile(null);
        fetchOrders();
      } else {
        toast.error("Failed to upload receipt");
      }
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      toast.error(error.message || "Failed to upload receipt");
    } finally {
      setIsUploadingReceipt(false);
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
            <SelectItem value="REQUEST_SUBMITTED">Submitted</SelectItem>
            <SelectItem value="AGENT_ASSIGNED">Agent Assigned</SelectItem>
            <SelectItem value="READY_FOR_DELIVERY">Ready For Delivery</SelectItem>
            <SelectItem value="DRIVER_ASSIGNED">Driver Assigned</SelectItem>
            <SelectItem value="DELIVERED_SUCCESSFULLY">Delivered</SelectItem>
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
                        {isCustomer && order.paymentStatus === "AWAITING_PAYMENT" && (
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
                          onClick={() => handleViewDetails(order)}
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
                              handleViewDetails(order);
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

            {(isAdmin || isCustomer) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Sourcing & Logistics Agent</label>
                <Select
                  value={newOrder.agentId || "auto"}
                  onValueChange={(value) => setNewOrder({ ...newOrder, agentId: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select an Agent" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          A
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold">Auto-assign Agent</p>
                          <p className="text-[10px] text-muted-foreground">Let LotusRise match you with the best available agent</p>
                        </div>
                      </div>
                    </SelectItem>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          {agent.avatarUrl ? (
                            <img
                              src={getImageUrl(agent.avatarUrl)}
                              alt={agent.fullName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                              {agent.fullName.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-semibold flex items-center gap-1">
                              {agent.fullName}
                              {agent.boutiqueLevel !== 'NONE' && (
                                <VerifiedBadge size={14} className="shrink-0" title="Verified Blue Tick" />
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {agent.phone ? `Phone: ${agent.phone}` : 'No phone number'} | Rating: {agent.rating.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newOrder.agentId && newOrder.agentId !== "auto" && (
                  (() => {
                    const selectedAgent = availableAgents.find(a => a.id === newOrder.agentId);
                    if (selectedAgent && selectedAgent.phone) {
                      return (
                        <p className="text-[11px] text-emerald-600 font-medium">
                          Selected Agent Phone: {selectedAgent.phone} (Commission: {selectedAgent.commissionRate}%)
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            )}
            {savedAddresses.length > 0 && (
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Saved Pickup Address</label>
                  <Select
                    onValueChange={(val) => {
                      const addr = savedAddresses.find((a) => a.id === val);
                      if (addr) {
                        setNewOrder((prev) => ({
                          ...prev,
                          pickupAddress: addr.address,
                          pickupLat: parseFloat(addr.lat),
                          pickupLng: parseFloat(addr.lng)
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.name} ({addr.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Saved Delivery Address</label>
                  <Select
                    onValueChange={(val) => {
                      const addr = savedAddresses.find((a) => a.id === val);
                      if (addr) {
                        setNewOrder((prev) => ({
                          ...prev,
                          deliveryAddress: addr.address,
                          deliveryLat: parseFloat(addr.lat),
                          deliveryLng: parseFloat(addr.lng)
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.name} ({addr.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    <p className="text-xs text-muted-foreground mt-0.5">I know the price. LotusRise will pay the supplier and deliver to me.</p>
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
                    <p className="text-xs text-muted-foreground mt-0.5">I don't know the price. LotusRise will find, negotiate, buy and deliver.</p>
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
        onOpenChange={(open) => !open && (setSelectedOrder(null) || setSelectedAgentPaymentProfile(null))}
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
                {(isAdmin || isAgent) && selectedOrder.status !== "DELIVERED_SUCCESSFULLY" && (
                  <div className="flex gap-2">
                    {selectedOrder.status === "READY_FOR_DELIVERY" && (
                      <Button onClick={() => setIsAssignDriverOpen(true)} className="h-9 bg-orange-600 hover:bg-orange-700 text-white font-semibold">
                        Assign Driver
                      </Button>
                    )}
                    <Select onValueChange={handleStatusSelect}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REQUEST_SUBMITTED">Submitted</SelectItem>
                        <SelectItem value="AGENT_ASSIGNED">Agent Assigned</SelectItem>
                        <SelectItem value="PRODUCT_SOURCING">Sourcing</SelectItem>
                        <SelectItem value="PRODUCT_PURCHASED">Purchased</SelectItem>
                        <SelectItem value="PRODUCT_PACKED">Packed</SelectItem>
                        <SelectItem value="READY_FOR_DELIVERY">Ready For Delivery</SelectItem>
                        <SelectItem value="DRIVER_ASSIGNED">Driver Assigned</SelectItem>
                        <SelectItem value="OUT_FOR_DELIVERY">Out For Delivery</SelectItem>
                        <SelectItem value="DRIVER_ARRIVED">Driver Arrived</SelectItem>
                        <SelectItem value="DELIVERED_SUCCESSFULLY">Delivered Successfully</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Order Status Timeline (10 Tiers) */}
              {(() => {
                const orderTimelineSteps = [
                  { status: 'REQUEST_SUBMITTED', label: 'Submitted' },
                  { status: 'AGENT_ASSIGNED', label: 'Agent Assigned' },
                  { status: 'PRODUCT_SOURCING', label: 'Sourcing' },
                  { status: 'PRODUCT_PURCHASED', label: 'Purchased' },
                  { status: 'PRODUCT_PACKED', label: 'Packed' },
                  { status: 'READY_FOR_DELIVERY', label: 'Ready for Delivery' },
                  { status: 'DRIVER_ASSIGNED', label: 'Driver Assigned' },
                  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                  { status: 'DRIVER_ARRIVED', label: 'Driver Arrived' },
                  { status: 'DELIVERED_SUCCESSFULLY', label: 'Delivered' }
                ];
                const currentStatusIndex = orderTimelineSteps.findIndex(s => s.status === selectedOrder.status);

                return selectedOrder.status !== "CANCELLED" ? (
                  <div className="py-4 border-b border-border/50 text-left">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2.5">Order Progress (10 Tiers)</p>
                    <div className="hidden md:flex items-center justify-between gap-1">
                      {orderTimelineSteps.map((step, idx) => {
                        const isCompleted = idx < currentStatusIndex;
                        const isCurrent = idx === currentStatusIndex;
                        return (
                          <div key={step.status} className="flex-1 flex flex-col items-center relative group">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors z-10 ${
                              isCompleted 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : isCurrent 
                                  ? "bg-primary border-primary text-white ring-2 ring-primary/25" 
                                  : "bg-background border-border text-muted-foreground"
                            }`}>
                              {isCompleted ? "✓" : idx + 1}
                            </div>
                            <span className={`text-[8px] font-semibold text-center mt-1.5 truncate max-w-[55px] ${
                              isCurrent ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                            }`} title={step.label}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="md:hidden flex items-center gap-2 bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                        {currentStatusIndex + 1}/10
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">Current Step</p>
                        <p className="text-xs font-bold text-foreground">
                          {orderTimelineSteps[currentStatusIndex]?.label || selectedOrder.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2 my-2 text-left">
                    <ShieldAlert className="w-4 h-4" />
                    This order has been cancelled and cannot proceed.
                  </div>
                );
              })()}

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl text-left">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Route</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">From: {selectedOrder.pickupAddress}</p>
                      <p className="text-sm font-medium mt-1">To: {selectedOrder.deliveryAddress}</p>
                    </div>
                  </div>
                  {/* Route Map */}
                  <div className="mt-3">
                    <DeliveryRouteMap
                      pickupLat={selectedOrder.pickupLat ? parseFloat(selectedOrder.pickupLat.toString()) : null}
                      pickupLng={selectedOrder.pickupLng ? parseFloat(selectedOrder.pickupLng.toString()) : null}
                      pickupAddress={selectedOrder.pickupAddress}
                      deliveryLat={selectedOrder.deliveryLat ? parseFloat(selectedOrder.deliveryLat.toString()) : null}
                      deliveryLng={selectedOrder.deliveryLng ? parseFloat(selectedOrder.deliveryLng.toString()) : null}
                      deliveryAddress={selectedOrder.deliveryAddress}
                    />
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

                {/* Verification Code Card for Customer */}
                {isCustomer && !["DELIVERED_SUCCESSFULLY", "COMPLETED", "CANCELLED"].includes(selectedOrder.status) && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-700 dark:text-indigo-400 space-y-1 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      🔑 Delivery Verification Code
                    </p>
                    <p className="text-2xl font-mono font-bold tracking-widest my-1">{selectedOrder.verificationCode || "N/A"}</p>
                    <p className="text-[10px] leading-relaxed opacity-85">
                      Tell the driver or agent this code ONLY after you have received and inspected the delivered packages.
                    </p>
                  </div>
                )}

                {selectedOrder.agent && (
                  <div className="p-4 bg-muted/50 rounded-xl space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Assigned Sourcing Agent</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-sm font-semibold">{selectedOrder.agent.user.fullName}</p>
                          {selectedOrder.agent.verifications?.[0]?.level && selectedOrder.agent.verifications[0].level !== 'NONE' && (
                            <VerifiedBadge size={14} className="shrink-0" />
                          )}
                        </div>
                        {selectedOrder.agent.user.phone && (
                          <p className="text-xs text-muted-foreground">{selectedOrder.agent.user.phone}</p>
                        )}
                      </div>
                      {selectedOrder.agent.user.phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold border-primary/20 hover:bg-primary/5 bg-background"
                          onClick={() => window.open(`tel:${selectedOrder.agent?.user.phone}`, '_self')}
                        >
                          Call Agent
                        </Button>
                      )}
                    </div>

                    {selectedAgentPaymentProfile && (
                      <div className="pt-2 border-t border-border/30 space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Direct Payment Settling Info</p>
                        
                        {selectedAgentPaymentProfile.mobileMoneyNumbers && selectedAgentPaymentProfile.mobileMoneyNumbers.length > 0 && (
                          <div className="space-y-1 bg-background/50 p-2 rounded-lg border border-border/40 text-xs">
                            <p className="font-bold text-muted-foreground text-[10px]">Mobile Money Accounts</p>
                            {selectedAgentPaymentProfile.mobileMoneyNumbers.map((m: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center py-0.5">
                                <span className="font-medium text-foreground">{m.provider} ({m.name})</span>
                                <span className="font-mono font-bold">{m.phone}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedAgentPaymentProfile.lipaNumbers && selectedAgentPaymentProfile.lipaNumbers.length > 0 && (
                          <div className="space-y-1 bg-background/50 p-2 rounded-lg border border-border/40 text-xs">
                            <p className="font-bold text-muted-foreground text-[10px]">Lipa Number / Paybill</p>
                            {selectedAgentPaymentProfile.lipaNumbers.map((l: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center py-0.5">
                                <span className="font-medium text-foreground">{l.provider} ({l.name})</span>
                                <span className="font-mono font-bold">{l.number}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedAgentPaymentProfile.bankAccounts && selectedAgentPaymentProfile.bankAccounts.length > 0 && (
                          <div className="space-y-1 bg-background/50 p-2 rounded-lg border border-border/40 text-xs">
                            <p className="font-bold text-muted-foreground text-[10px]">Bank Accounts</p>
                            {selectedAgentPaymentProfile.bankAccounts.map((b: any, idx: number) => (
                              <div key={idx} className="flex flex-col py-1 border-b border-border/20 last:border-0 text-left">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold">{b.bankName}</span>
                                  <span className="font-mono font-bold">{b.accountNumber}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">Name: {b.accountName}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs py-1 px-1">
                          <span className="text-muted-foreground">Cash Collection Available:</span>
                          <span className={`font-bold ${selectedAgentPaymentProfile.cashCollectionAvailable ? "text-emerald-600" : "text-red-500"}`}>
                            {selectedAgentPaymentProfile.cashCollectionAvailable ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    )}
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

                {isCustomer && selectedOrder.paymentStatus === "AWAITING_PAYMENT" && (
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => openPaymentModal(selectedOrder)}
                  >
                    Pay Now
                  </Button>
                )}

                {/* Review System (Customer only) */}
                {isCustomer && ["DELIVERED_SUCCESSFULLY", "COMPLETED"].includes(selectedOrder.status) && (
                  <div className="p-4 bg-card border border-border rounded-xl space-y-3">
                    <h4 className="text-sm font-bold text-foreground text-left">Customer Review & Feedback</h4>
                    {selectedOrder.review ? (
                      <div className="space-y-2 text-xs text-left">
                        <div className="flex justify-between items-center py-1">
                          <span className="font-medium text-muted-foreground">Overall Rating</span>
                          <div className="flex gap-1 items-center">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold">{selectedOrder.review.overallScore?.toFixed(1)} / 5</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                          <div>Communication: {selectedOrder.review.communication}/5</div>
                          <div>Speed: {selectedOrder.review.deliverySpeed}/5</div>
                          <div>Professionalism: {selectedOrder.review.professionalism}/5</div>
                          <div>Quality: {selectedOrder.review.productQuality}/5</div>
                        </div>
                        {selectedOrder.review.comment && (
                          <p className="bg-muted/40 p-2 rounded-lg border border-border/50 text-muted-foreground italic mt-2">
                            "{selectedOrder.review.comment}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-left">
                        <p className="text-xs text-muted-foreground">You have not reviewed this completed order yet. Rate the agent's service quality:</p>
                        {isReviewFormOpen ? (
                          <form onSubmit={handleSubmitReview} className="space-y-3 pt-2">
                            <StarRating value={ratings.communication} onChange={(val) => setRatings({ ...ratings, communication: val })} label="Communication" />
                            <StarRating value={ratings.deliverySpeed} onChange={(val) => setRatings({ ...ratings, deliverySpeed: val })} label="Delivery Speed" />
                            <StarRating value={ratings.professionalism} onChange={(val) => setRatings({ ...ratings, professionalism: val })} label="Professionalism" />
                            <StarRating value={ratings.productQuality} onChange={(val) => setRatings({ ...ratings, productQuality: val })} label="Product Quality" />
                            
                            <div className="space-y-1.5 pt-1">
                              <label className="text-xs font-semibold text-foreground">Optional Comment</label>
                              <Input
                                placeholder="Write a brief comment about the service..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                className="text-xs"
                              />
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsReviewFormOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" variant="hero" size="sm" className="h-8 text-xs" disabled={submittingReview}>
                                Submit Review
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold" onClick={() => setIsReviewFormOpen(true)}>
                            Rate Sourcing Agent
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dispute & Complaint history */}
                {selectedOrder.complaints && selectedOrder.complaints.length > 0 && (
                  <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-xl space-y-2 text-left">
                    <h4 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                      Disputes History
                    </h4>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {selectedOrder.complaints.map((c: any) => (
                        <div key={c.id} className="text-xs bg-background/50 p-2 rounded border border-destructive/10 space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-foreground">{c.category.replace('_', ' ')}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                              c.status === 'RESOLVED' 
                                ? 'bg-green-100 text-green-800' 
                                : c.status === 'DISMISSED'
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{c.description}</p>
                          {c.adminNotes && (
                            <p className="text-[10px] text-primary italic bg-primary/5 p-1 rounded mt-1">
                              Admin Notes: {c.adminNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dispute payment button (Customer only) */}
                {isCustomer && selectedOrder.paymentStatus !== "CONFIRMED" && selectedOrder.paymentStatus !== "DISPUTED" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-destructive/20 text-destructive hover:bg-destructive/5"
                    onClick={() => {
                      setDisputeReason("");
                      setIsDisputeOpen(true);
                    }}
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Dispute Payment / Report Issue
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
            <DialogTitle>Complete Payment</DialogTitle>
            {stkState !== "loading" && stkState !== "pending" && (
              <DialogDescription>
                Order #{selectedOrder?.orderNumber} — Amount: <span className="font-bold text-foreground">TZS {(selectedOrder?.actualCost || 0).toLocaleString()}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {stkState === "idle" && (
            <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 mb-2">
              <button
                type="button"
                onClick={() => setPaymentMethodTab("stk")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  paymentMethodTab === "stk"
                    ? "bg-background shadow-sm text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Instant STK Push
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("receipt")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  paymentMethodTab === "receipt"
                    ? "bg-background shadow-sm text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Manual Transfer / Receipt
              </button>
            </div>
          )}

          {stkState === "idle" && paymentMethodTab === "stk" && (
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

          {stkState === "idle" && paymentMethodTab === "receipt" && (
            <div className="space-y-4 text-left">
              {/* Settling info */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Direct Payment Settling Info</p>
                
                {selectedAgentPaymentProfile ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {/* Mobile Money Accounts */}
                    {selectedAgentPaymentProfile.mobileMoneyNumbers && selectedAgentPaymentProfile.mobileMoneyNumbers.length > 0 && (
                      <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
                        <p className="font-bold text-muted-foreground text-[10px] uppercase">Mobile Money Accounts</p>
                        {selectedAgentPaymentProfile.mobileMoneyNumbers.map((m: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center py-0.5 border-b border-border/10 last:border-0">
                            <span className="font-semibold text-foreground">{m.provider} ({m.name})</span>
                            <span className="font-mono font-bold text-primary">{m.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lipa / Paybill */}
                    {selectedAgentPaymentProfile.lipaNumbers && selectedAgentPaymentProfile.lipaNumbers.length > 0 && (
                      <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
                        <p className="font-bold text-muted-foreground text-[10px] uppercase">Lipa Number / Paybill</p>
                        {selectedAgentPaymentProfile.lipaNumbers.map((l: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center py-0.5 border-b border-border/10 last:border-0">
                            <span className="font-semibold text-foreground">{l.provider} ({l.name})</span>
                            <span className="font-mono font-bold text-primary">{l.number}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bank Accounts */}
                    {selectedAgentPaymentProfile.bankAccounts && selectedAgentPaymentProfile.bankAccounts.length > 0 && (
                      <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
                        <p className="font-bold text-muted-foreground text-[10px] uppercase">Bank Accounts</p>
                        {selectedAgentPaymentProfile.bankAccounts.map((b: any, idx: number) => (
                          <div key={idx} className="flex flex-col py-1 border-b border-border/10 last:border-0">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{b.bankName}</span>
                              <span className="font-mono font-bold text-primary">{b.accountNumber}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Name: {b.accountName}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedAgentPaymentProfile.cashCollectionAvailable && (
                      <div className="flex items-center justify-between text-xs py-1 px-1 bg-green-500/5 text-green-600 rounded-lg p-2 border border-green-500/10">
                        <span className="font-semibold">Cash Collection Available</span>
                        <span className="font-bold">Yes</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No payment settling options configured by the agent yet. Please contact the agent or administrator.</p>
                )}
              </div>

              {/* Upload area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Upload Payment Receipt</label>
                <div className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-muted/10 relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }}
                  />
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  {receiptFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground truncate max-w-[280px]">{receiptFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Click to select or drag receipt image/PDF</p>
                      <p className="text-[10px] text-muted-foreground">Supports JPG, PNG, WEBP, or PDF</p>
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={handleUploadReceipt}
                disabled={isUploadingReceipt || !receiptFile}
              >
                {isUploadingReceipt ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Receipt…
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Submit Receipt for Verification
                  </>
                )}
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

          {selectedOrder?.paymentReceiptUrl && (
            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-xs space-y-2 text-left my-2">
              <p className="font-bold text-muted-foreground uppercase tracking-wide text-[10px]">Uploaded Receipt Proof</p>
              <div className="flex flex-col items-center gap-2">
                {selectedOrder.paymentReceiptUrl.toLowerCase().endsWith(".pdf") ? (
                  <a
                    href={getImageUrl(selectedOrder.paymentReceiptUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-background border border-border/80 rounded-lg text-primary font-semibold hover:bg-muted/50 transition-colors w-full justify-center"
                  >
                    <ImageIcon className="w-4 h-4" />
                    View Receipt PDF
                  </a>
                ) : (
                  <div className="relative group overflow-hidden rounded-lg border border-border bg-background w-full flex justify-center p-1">
                    <img
                      src={getImageUrl(selectedOrder.paymentReceiptUrl)}
                      alt="Payment Receipt"
                      className="max-h-40 w-auto object-cover cursor-zoom-in rounded-lg"
                      onClick={() => window.open(getImageUrl(selectedOrder.paymentReceiptUrl), "_blank")}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <span className="text-[10px] text-white font-semibold">Click to Zoom</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Assign Independent Driver</DialogTitle>
            <DialogDescription>
              Enter the driver and route details. This will update the order status and notify the driver.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignDriver} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Driver Full Name *</label>
              <Input
                placeholder="e.g. Athumani Juma"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Driver Phone Number *</label>
              <Input
                placeholder="e.g. +255765432101"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Vehicle Type *</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full h-10 border border-input rounded-md px-3 bg-white text-sm"
                >
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Bajaji">Bajaji</option>
                  <option value="Car">Car</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Vehicle Plate Number *</label>
                <Input
                  placeholder="e.g. T 123 ABC"
                  value={vehiclePlateNumber}
                  onChange={(e) => setVehiclePlateNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Pickup Location *</label>
              <Input
                value={driverPickup}
                onChange={(e) => setDriverPickup(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Delivery Location *</label>
              <Input
                value={driverDelivery}
                onChange={(e) => setDriverDelivery(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Notes / Instructions</label>
              <textarea
                placeholder="e.g. Handle with care, call customer on arrival"
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="w-full min-h-[60px] border border-input rounded-md p-2 text-sm"
              />
            </div>
            <Button type="submit" disabled={isAssigningDriver} className="w-full bg-[#00966d] hover:bg-[#007d5b] text-white">
              {isAssigningDriver ? "Assigning..." : "Assign & Notify"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Verification Code Dialog */}
      <Dialog open={isVerifyingDeliveryOpen} onOpenChange={setIsVerifyingDeliveryOpen}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle>Confirm Delivery Verification</DialogTitle>
            <DialogDescription>
              Ask the customer for their 6-digit verification code to complete the delivery.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyDeliverySubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Verification Code *</label>
              <Input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={deliveryVerificationCode}
                onChange={(e) => setDeliveryVerificationCode(e.target.value.replace(/\D/g, ''))}
                required
                className="text-center font-mono text-xl tracking-widest h-12"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsVerifyingDeliveryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero">
                Confirm Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dispute Payment Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>File a Dispute / Report Issue</DialogTitle>
            <DialogDescription>
              Describe the issue. The payment status will be marked as DISPUTED, and a complaint will be filed to the Super Admin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDispute} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Issue Category *</label>
              <Select value={disputeCategory} onValueChange={setDisputeCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WRONG_PRODUCT">Wrong Product</SelectItem>
                  <SelectItem value="MISSING_PRODUCT">Missing Product</SelectItem>
                  <SelectItem value="DAMAGED_PRODUCT">Damaged Product</SelectItem>
                  <SelectItem value="FRAUDULENT_ACTIVITY">Fraudulent Activity</SelectItem>
                  <SelectItem value="DELIVERY_ISSUES">Delivery Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Dispute Explanation *</label>
              <textarea
                className="w-full rounded-xl border border-border p-3 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary h-28 resize-none text-left"
                placeholder="Explain the reason for disputing this payment..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDisputeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" className="bg-destructive hover:bg-destructive/90 text-white" disabled={submittingDispute}>
                File Dispute
              </Button>
            </div>
          </form>
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
