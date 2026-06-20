import axios from 'axios';
import { API_URL } from '@/config/api';

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    error?: {
        message: string;
    };
}


const API_BASE_URL = API_URL;

export const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;

    // Ensure path starts with /api/uploads/
    let path = url;
    if (url.startsWith('/uploads/')) {
        path = url.replace('/uploads/', '/api/uploads/');
    } else if (url.startsWith('uploads/')) {
        path = '/api/' + url;
    } else if (!url.startsWith('/api/uploads/')) {
        path = '/api/uploads/' + (url.startsWith('/') ? url.substring(1) : url);
    }

    // Construct base URL without trailing slash
    const baseUrl = API_URL.split('/api')[0];
    const finalUrl = `${baseUrl}${path}`;

    // Debug log to help identify issues in browser console
    if (process.env.NODE_ENV === 'development') {
        console.log('🖼️ Image URL:', { original: url, final: finalUrl });
    }

    return finalUrl;
};

// Create axios instance
const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Re-type the instance to reflect interceptor behavior
import { AxiosInstance, AxiosRequestConfig } from 'axios';

interface CustomAxiosInstance extends Omit<AxiosInstance, 'get' | 'post' | 'put' | 'patch' | 'delete'> {
    get<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = T, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = T, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
}

const apiClient = instance as CustomAxiosInstance;



// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('mhema_user');
            window.location.href = '/auth';
        }

        // Return error message
        const errorMessage = error.response?.data?.error?.message || 'An error occurred';
        return Promise.reject(new Error(errorMessage));
    }
);

// Auth API
export const authAPI = {
    login: (phone: string, fullName?: string) =>
        apiClient.post('/auth/login', { phone, fullName }),

    verifyOtp: (phone: string, otpCode: string) =>
        apiClient.post('/auth/verify-otp', { phone, otpCode }),

    resendOtp: (phone: string) =>
        apiClient.post('/auth/resend-otp', { phone }),

    adminLogin: (email: string, password: string) =>
        apiClient.post('/auth/admin/login', { email, password }),
};

// Orders API
export const ordersAPI = {
    list: (params?: { status?: string; page?: number; limit?: number }) =>
        apiClient.get('/orders', { params }),

    getById: (id: string) =>
        apiClient.get(`/orders/${id}`),

    create: (orderData: {
        pickupAddress: string;
        pickupLat?: number;
        pickupLng?: number;
        deliveryAddress: string;
        deliveryLat?: number;
        deliveryLng?: number;
        transportMethodId?: string;
        description?: string;
        packageWeight?: number;
        productImageUrls?: string[];
        customerId?: string;
    }) =>
        apiClient.post('/orders', orderData),

    updateStatus: (id: string, status: string, verificationCode?: string) =>
        apiClient.patch(`/orders/${id}/status`, { status, verificationCode }),

    disputePayment: (id: string, reason: string, category?: string) =>
        apiClient.patch(`/orders/${id}/dispute-payment`, { reason, category }),

    assignDriver: (id: string, driverData: {
        driverName: string;
        driverPhone: string;
        vehicleType: string;
        vehiclePlateNumber: string;
        pickupLocation: string;
        deliveryLocation: string;
        notes?: string;
    }) =>
        apiClient.post(`/orders/${id}/assign-driver`, driverData),

    update: (id: string, data: {
        actualCost?: number;
        estimatedCost?: number;
        packageWeight?: number;
        description?: string;
    }) =>
        apiClient.patch(`/orders/${id}`, data),

    confirmPayment: (id: string, paymentMethod: string, amount: number) =>
        apiClient.patch(`/orders/${id}/payment`, { paymentMethod, amount }),

    reassign: (id: string, agentId: string, reason?: string) =>
        apiClient.patch(`/orders/${id}/assign`, { agentId, reason }),

    uploadProductImage: (formData: FormData) =>
        apiClient.post('/orders/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    uploadReceipt: (id: string, formData: FormData) =>
        apiClient.post(`/orders/${id}/upload-receipt`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    verifyOrder: (id: string) =>
        apiClient.patch(`/orders/${id}/verify`),

    notifyPaymentDone: (id: string) =>
        apiClient.post(`/orders/${id}/payment-done`),

    initiateSTKPush: (id: string) =>
        apiClient.post(`/orders/${id}/stk-push`),

    getSTKStatus: (id: string, reference?: string) =>
        apiClient.get(`/orders/${id}/stk-status${reference ? `?reference=${reference}` : ''}`),

    delete: (id: string) =>
        apiClient.delete(`/orders/${id}`),
};

// Agents API
export const agentsAPI = {
    list: (params?: { search?: string; status?: string }) =>
        apiClient.get('/agents', { params }),

    getPublicList: (params?: { search?: string; region?: string; level?: string }) =>
        apiClient.get('/agents/public', { params }),

    getPublicProfile: (id: string) =>
        apiClient.get(`/agents/public/${id}`),

    toggleFollow: (id: string) =>
        apiClient.post(`/agents/${id}/follow`),

    getStats: (id: string) =>
        apiClient.get(`/agents/${id}/stats`),

    create: (agentData: {
        email: string;
        password: string;
        fullName: string;
        phone: string;
        commissionRate?: number;
        maxOrderCapacity?: number;
    }) =>
        apiClient.post('/agents', agentData),

    updateStatus: (id: string, availabilityStatus: 'ONLINE' | 'OFFLINE') =>
        apiClient.patch(`/agents/${id}/status`, { availabilityStatus }),

    update: (id: string, data: {
        commissionRate?: number;
        maxOrderCapacity?: number;
        status?: string;
        boutiqueLevel?: string;
    }) =>
        apiClient.patch(`/agents/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/agents/${id}`),

    getLeaderboard: (params?: { period?: string }) =>
        apiClient.get('/agents/leaderboard', { params }),

    getPaymentProfile: () =>
        apiClient.get('/agents/payment-profile'),

    getAgentPaymentProfile: (agentId: string) =>
        apiClient.get(`/agents/payment-profile/${agentId}`),

    savePaymentProfile: (data: {
        mobileMoneyNumbers?: any;
        bankAccounts?: any;
        lipaNumbers?: any;
        qrCodeUrls?: any;
        cashCollectionAvailable?: boolean;
    }) =>
        apiClient.post('/agents/payment-profile', data),
};

// Customers API
export const customersAPI = {
    list: (params?: { search?: string; status?: string }) =>
        apiClient.get('/customers', { params }),

    create: (customerData: {
        fullName: string;
        email: string;
        phone: string;
        password?: string;
    }) =>
        apiClient.post('/customers', customerData),

    delete: (id: string) =>
        apiClient.delete(`/customers/${id}`),
};

// Payment QR Codes API
export const paymentQRAPI = {
    list: () =>
        apiClient.get('/payment-qr-codes'),

    upload: (formData: FormData) =>
        apiClient.post('/payment-qr-codes', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    delete: (id: string) =>
        apiClient.delete(`/payment-qr-codes/${id}`),
};

// Transport Methods API
export const transportAPI = {
    list: () =>
        apiClient.get('/transport-methods'),

    create: (data: {
        name: string;
        description?: string;
        basePrice: number;
        pricePerKm?: number;
        pricePerKg?: number;
        icon?: string;
    }) =>
        apiClient.post('/transport-methods', data),

    update: (id: string, data: any) =>
        apiClient.patch(`/transport-methods/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/transport-methods/${id}`),
};

// Products API
export const productsAPI = {
    listPublic: (params?: { agentId?: string; limit?: number; search?: string }) =>
        apiClient.get('/products/public', { params }),

    list: () =>
        apiClient.get('/products'),

    create: (data: {
        name: string;
        price: number;
        description?: string;
        imageUrl?: string;
        sourceLink?: string;
        agentId?: string;
    }) =>
        apiClient.post('/products', data),

    delete: (id: string) =>
        apiClient.delete(`/products/${id}`),

    getPublicBySlug: (slug: string) =>
        apiClient.get(`/products/slug/${slug}`),

    getById: (id: string) =>
        apiClient.get(`/products/${id}`),

    trackView: (slug: string) =>
        apiClient.post(`/products/${slug}/view`),

    trackClick: (slug: string) =>
        apiClient.post(`/products/${slug}/click`),

    trackConversion: (slug: string) =>
        apiClient.post(`/products/${slug}/conversion`),
};

// Notifications API
export const notificationsAPI = {
    list: (params?: { isRead?: boolean; limit?: number }) =>
        apiClient.get('/notifications', { params }),

    markAsRead: (id: string) =>
        apiClient.patch(`/notifications/${id}/read`),

    markAllAsRead: () =>
        apiClient.patch('/notifications/read-all'),
};

// Analytics API
export const analyticsAPI = {
    getDashboard: () =>
        apiClient.get('/analytics/dashboard'),

    getSales: (params: {
        startDate?: string;
        endDate?: string;
        groupBy?: 'day' | 'week' | 'month';
    }) =>
        apiClient.get('/analytics/sales', { params }),

    getAgentPerformance: () =>
        apiClient.get('/analytics/agents'),

    getExtendedAdmin: () =>
        apiClient.get('/analytics/admin-extended'),
};

// Chats API
export const chatsAPI = {
    getByOrderId: (orderId: string) =>
        apiClient.get(`/chats/order/${orderId}`),
};

export const usersAPI = {
    updateProfile: (data: { fullName?: string; phone?: string }) =>
        apiClient.patch<ApiResponse<any>>('/users/profile', data),
    uploadAvatar: (formData: FormData) =>
        apiClient.post<ApiResponse<any>>('/users/avatar', formData, {
            headers: { 'Content-Type': undefined as any }
        })
};

// Subscriptions API
export const subscriptionsAPI = {
    list: () =>
        apiClient.get('/subscriptions'),

    getPackages: () =>
        apiClient.get('/subscriptions/packages'),

    updatePackage: (key: string, data: { name?: string; price?: number; benefits?: string[] }) =>
        apiClient.patch(`/subscriptions/packages/${key}`, data),

    initiateSTKPush: (data: { plan: string; phone: string }) =>
        apiClient.post('/subscriptions/stk-push', data),

    checkSTKStatus: (reference: string) =>
        apiClient.get(`/subscriptions/stk-status?reference=${reference}`),

    create: (data: {
        agentId: string;
        plan: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
        amount: number;
        startDate?: string;
        endDate: string;
        status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    }) =>
        apiClient.post('/subscriptions', data),

    update: (id: string, data: {
        status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
        endDate?: string;
        plan?: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
        amount?: number;
    }) =>
        apiClient.patch(`/subscriptions/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/subscriptions/${id}`),
};

// Saved Addresses API
export const addressesAPI = {
    list: () =>
        apiClient.get('/addresses'),
    create: (data: {
        name: string;
        type: 'HOME' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
        address: string;
        lat: number;
        lng: number;
        street?: string;
        ward?: string;
        district?: string;
        region?: string;
        country?: string;
    }) =>
        apiClient.post('/addresses', data),
    delete: (id: string) =>
        apiClient.delete(`/addresses/${id}`),
};

// Complaints API
export const complaintsAPI = {
    list: () =>
        apiClient.get('/complaints'),
    create: (data: {
        orderId: string;
        category: 'WRONG_PRODUCT' | 'MISSING_PRODUCT' | 'DAMAGED_PRODUCT' | 'FRAUDULENT_ACTIVITY' | 'DELIVERY_ISSUES';
        description: string;
        evidenceImages?: string[];
    }) =>
        apiClient.post('/complaints', data),
    resolve: (id: string, data: { status: 'RESOLVED' | 'DISMISSED'; adminNotes?: string }) =>
        apiClient.patch(`/complaints/${id}/resolve`, data),
};

// Reviews API
export const reviewsAPI = {
    list: () =>
        apiClient.get('/reviews'),
    submit: (data: {
        orderId: string;
        communication: number;
        deliverySpeed: number;
        professionalism: number;
        productQuality: number;
        comment?: string;
        images?: string[];
    }) =>
        apiClient.post('/reviews', data),
};

export default apiClient;

