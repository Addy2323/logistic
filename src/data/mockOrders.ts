export type OrderStatus = "pending" | "placed" | "queued" | "verified" | "approved" | "assigned" | "collecting" | "packing" | "picked" | "in_transit" | "dispatched" | "delivered" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface OrderHistory {
  status: OrderStatus | PaymentStatus | "created";
  updatedAt: string;
  updatedBy: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  productDetails: string;
  quantity: number;
  estimatedPrice: number;
  actualPrice?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  agentId?: string;
  agentName?: string;
  verificationPhotos?: string[];
  productPhotos?: string[];
  deliveryAddress: string;
  coordinates?: { lat: number; lng: number };
  deliveryMethod: "express" | "standard" | "cargo";
  isConsolidated?: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  history: OrderHistory[];
}

export const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customerId: "2",
    customerName: "John Doe",
    customerPhone: "0712345678",
    shopName: "Kariakoo Textiles",
    productDetails: "Cotton fabric - Blue, 50 meters",
    quantity: 50,
    estimatedPrice: 250000,
    actualPrice: 245000,
    status: "delivered",
    paymentStatus: "paid",
    agentId: "3",
    agentName: "Agent Salim",
    verificationPhotos: ["/placeholder.svg"],
    deliveryAddress: "Kinondoni, Dar es Salaam",
    deliveryMethod: "express",
    createdAt: "2024-01-15T09:00:00Z",
    updatedAt: "2024-01-16T14:00:00Z",
    history: [
      { status: "created", updatedAt: "2024-01-15T09:00:00Z", updatedBy: "John Doe" },
      { status: "verified", updatedAt: "2024-01-15T14:00:00Z", updatedBy: "Agent Salim" },
      { status: "paid", updatedAt: "2024-01-15T15:00:00Z", updatedBy: "John Doe" },
      { status: "delivered", updatedAt: "2024-01-16T14:00:00Z", updatedBy: "Agent Salim" },
    ],
  },
  {
    id: "ORD-002",
    customerId: "2",
    customerName: "John Doe",
    customerPhone: "0712345678",
    shopName: "Electronics Hub",
    productDetails: "Phone chargers - Type-C, 100 pieces",
    quantity: 100,
    estimatedPrice: 500000,
    status: "verified",
    paymentStatus: "pending",
    agentId: "3",
    agentName: "Agent Salim",
    verificationPhotos: ["/placeholder.svg"],
    deliveryAddress: "Kinondoni, Dar es Salaam",
    deliveryMethod: "standard",
    createdAt: "2024-01-18T10:30:00Z",
    updatedAt: "2024-01-18T15:00:00Z",
    notes: "Customer needs to approve verification photos",
    history: [
      { status: "created", updatedAt: "2024-01-18T10:30:00Z", updatedBy: "John Doe" },
      { status: "verified", updatedAt: "2024-01-18T15:00:00Z", updatedBy: "Agent Salim", notes: "Photos uploaded for verification" },
    ],
  },
  {
    id: "ORD-003",
    customerId: "4",
    customerName: "Mary Johnson",
    customerPhone: "0789123456",
    shopName: "Mama Salma Shoes",
    productDetails: "Ladies sandals - Size 38, Black, 20 pairs",
    quantity: 20,
    estimatedPrice: 400000,
    status: "pending",
    paymentStatus: "pending",
    deliveryAddress: "Arusha Town",
    deliveryMethod: "cargo",
    createdAt: "2024-01-19T08:00:00Z",
    updatedAt: "2024-01-19T08:00:00Z",
    history: [
      { status: "created", updatedAt: "2024-01-19T08:00:00Z", updatedBy: "Mary Johnson" },
    ],
  },
  {
    id: "ORD-004",
    customerId: "5",
    customerName: "Ibrahim Hassan",
    customerPhone: "0654987321",
    shopName: "Spice Market",
    productDetails: "Mixed spices package - 10kg",
    quantity: 10,
    estimatedPrice: 150000,
    actualPrice: 155000,
    status: "dispatched",
    paymentStatus: "paid",
    agentId: "3",
    agentName: "Agent Salim",
    deliveryAddress: "Zanzibar Stone Town",
    deliveryMethod: "express",
    createdAt: "2024-01-17T11:00:00Z",
    updatedAt: "2024-01-19T09:00:00Z",
    history: [
      { status: "created", updatedAt: "2024-01-17T11:00:00Z", updatedBy: "Ibrahim Hassan" },
      { status: "verified", updatedAt: "2024-01-17T15:00:00Z", updatedBy: "Agent Salim" },
      { status: "paid", updatedAt: "2024-01-18T09:00:00Z", updatedBy: "Ibrahim Hassan" },
      { status: "dispatched", updatedAt: "2024-01-19T09:00:00Z", updatedBy: "Agent Salim" },
    ],
  },
  {
    id: "ORD-005",
    customerId: "6",
    customerName: "Grace Mwamba",
    customerPhone: "0768543210",
    shopName: "Fashion Corner",
    productDetails: "Kitenge fabric - Assorted patterns, 30 pieces",
    quantity: 30,
    estimatedPrice: 450000,
    status: "collecting",
    paymentStatus: "paid",
    agentId: "3",
    agentName: "Agent Salim",
    deliveryAddress: "Mwanza City",
    deliveryMethod: "cargo",
    isConsolidated: true,
    createdAt: "2024-01-19T07:30:00Z",
    updatedAt: "2024-01-19T12:00:00Z",
    history: [
      { status: "created", updatedAt: "2024-01-19T07:30:00Z", updatedBy: "Grace Mwamba" },
      { status: "verified", updatedAt: "2024-01-19T10:00:00Z", updatedBy: "Agent Salim" },
      { status: "paid", updatedAt: "2024-01-19T11:00:00Z", updatedBy: "Grace Mwamba" },
      { status: "collecting", updatedAt: "2024-01-19T12:00:00Z", updatedBy: "Agent Salim" },
    ],
  },
];

export const getOrdersByCustomer = (customerId: string) => {
  return mockOrders.filter(order => order.customerId === customerId);
};

export const getOrdersByStatus = (status: OrderStatus) => {
  return mockOrders.filter(order => order.status === status);
};

export const getOrderStats = () => {
  return {
    total: mockOrders.length,
    pending: mockOrders.filter(o => o.status === "pending").length,
    inProgress: mockOrders.filter(o => ["verified", "approved", "collecting", "packing"].includes(o.status)).length,
    dispatched: mockOrders.filter(o => o.status === "dispatched").length,
    delivered: mockOrders.filter(o => o.status === "delivered").length,
    totalRevenue: mockOrders.filter(o => o.actualPrice).reduce((sum, o) => sum + (o.actualPrice || 0), 0),
  };
};
