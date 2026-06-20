import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    CreditCard,
    Plus,
    Search,
    Calendar,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Edit3,
    Loader2,
    Shield,
    Users,
    TrendingUp,
    Clock,
    XCircle,
    ArrowUpRight,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { subscriptionsAPI, agentsAPI } from "@/lib/api";
import { format, formatDistanceToNow, isAfter } from "date-fns";

interface AgentSubscription {
    id: string;
    agentId: string;
    plan: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
    amount: number | string;
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
    startDate: string;
    endDate: string;
    createdAt: string;
    agent?: {
        id: string;
        user: {
            fullName: string;
            email: string;
            phone: string;
        };
    };
}

interface AgentListItem {
    id: string;
    user: {
        fullName: string;
        email: string;
        phone: string;
    };
}

interface SubscriptionPackage {
    id: string;
    key: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL';
    name: string;
    price: number | string;
    benefits: string[];
}

const PLAN_PRICES = {
    WEEKLY: 10000,
    MONTHLY: 30000,
    SEMI_ANNUAL: 150000,
    ANNUAL: 280000
};

const PLAN_BENEFITS = {
    WEEKLY: [
        "Receive auto-assigned orders (weekly duration)",
        "Standard public profile listing",
        "Basic WhatsApp inquiries connect",
        "Direct payment verification"
    ],
    MONTHLY: [
        "Priority auto-assigned orders",
        "Premium public profile listing",
        "Advanced WhatsApp inquiries connect",
        "Direct payment verification",
        "Product catalog clicks analytics"
    ],
    SEMI_ANNUAL: [
        "High-priority auto-assigned orders",
        "Exclusive public boutique profile",
        "Blue-tick verification priority support",
        "Product catalog clicks & views analytics",
        "Dedicated driver assignment options"
    ],
    ANNUAL: [
        "Top-priority auto-assigned orders",
        "Ultimate public boutique showcase",
        "Blue-tick merit verification fee exemption",
        "Advanced boutique performance reports",
        "24/7 dedicated support priority"
    ]
};

const DashboardSubscriptions = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const isAgent = user?.role === 'AGENT';

    // State variables
    const [subscriptions, setSubscriptions] = useState<AgentSubscription[]>([]);
    const [agents, setAgents] = useState<AgentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Dynamic packages
    const [packages, setPackages] = useState<SubscriptionPackage[]>([
        { id: "1", key: "WEEKLY", name: "Weekly Plan", price: 10000, benefits: PLAN_BENEFITS.WEEKLY },
        { id: "2", key: "MONTHLY", name: "Monthly Plan", price: 30000, benefits: PLAN_BENEFITS.MONTHLY },
        { id: "3", key: "SEMI_ANNUAL", name: "Semi Annual Plan", price: 150000, benefits: PLAN_BENEFITS.SEMI_ANNUAL },
        { id: "4", key: "ANNUAL", name: "Annual Plan", price: 280000, benefits: PLAN_BENEFITS.ANNUAL }
    ]);

    // Package Edit states (Admin)
    const [isEditPackageOpen, setIsEditPackageOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
    const [packageEditForm, setPackageEditForm] = useState({
        name: "",
        price: 0,
        benefits: [] as string[]
    });
    const [newBenefit, setNewBenefit] = useState("");

    // STK Push states (Agent)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentPlan, setPaymentPlan] = useState<SubscriptionPackage | null>(null);
    const [paymentPhone, setPaymentPhone] = useState("");
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'polling' | 'completed' | 'failed'>('idle');
    const [paymentReference, setPaymentReference] = useState("");
    const [paymentError, setPaymentError] = useState("");

    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<AgentSubscription | null>(null);

    // Create Form state
    const [createForm, setCreateForm] = useState({
        agentId: "",
        plan: "MONTHLY" as 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL',
        amount: PLAN_PRICES.MONTHLY,
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        status: "ACTIVE" as 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
    });

    // Edit Form state
    const [editForm, setEditForm] = useState({
        plan: "MONTHLY" as 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL',
        amount: PLAN_PRICES.MONTHLY,
        endDate: format(new Date(), "yyyy-MM-dd"),
        status: "ACTIVE" as 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
    });

    useEffect(() => {
        fetchSubscriptions();
        fetchPackages();
        if (isAdmin) {
            fetchAgents();
        }
    }, [isAdmin]);

    const fetchPackages = async () => {
        try {
            const response: any = await subscriptionsAPI.getPackages();
            if (response && response.success && response.data?.length > 0) {
                setPackages(response.data);
            }
        } catch (error) {
            console.error("Error fetching packages:", error);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);
            const response: any = await subscriptionsAPI.list();
            if (response && response.success) {
                setSubscriptions(response.data || []);
            } else {
                toast.error("Failed to load subscriptions");
            }
        } catch (error: any) {
            console.error("Error fetching subscriptions:", error);
            toast.error(error.message || "An error occurred while loading subscriptions");
        } finally {
            setLoading(false);
        }
    };

    const fetchAgents = async () => {
        try {
            const response: any = await agentsAPI.list({});
            if (response && response.success) {
                setAgents(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching agents list:", error);
        }
    };

    const handleOpenEditPackage = (pkg: SubscriptionPackage) => {
        setSelectedPackage(pkg);
        setPackageEditForm({
            name: pkg.name,
            price: Number(pkg.price),
            benefits: [...pkg.benefits]
        });
        setNewBenefit("");
        setIsEditPackageOpen(true);
    };

    const handleUpdatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPackage) return;
        try {
            setSubmitting(true);
            const response: any = await subscriptionsAPI.updatePackage(selectedPackage.key, {
                name: packageEditForm.name,
                price: Number(packageEditForm.price),
                benefits: packageEditForm.benefits
            });
            if (response && response.success) {
                toast.success("Subscription package updated successfully!");
                setIsEditPackageOpen(false);
                fetchPackages();
            } else {
                toast.error(response.error?.message || "Failed to update package");
            }
        } catch (error: any) {
            console.error("Update package failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddBenefit = () => {
        if (!newBenefit.trim()) return;
        setPackageEditForm(prev => ({
            ...prev,
            benefits: [...prev.benefits, newBenefit.trim()]
        }));
        setNewBenefit("");
    };

    const handleRemoveBenefit = (index: number) => {
        setPackageEditForm(prev => ({
            ...prev,
            benefits: prev.benefits.filter((_, i) => i !== index)
        }));
    };

    const handleOpenPayment = (pkg: SubscriptionPackage) => {
        setPaymentPlan(pkg);
        setPaymentPhone(user?.phone || "");
        setPaymentStatus('idle');
        setPaymentReference("");
        setPaymentError("");
        setIsPaymentModalOpen(true);
    };

    const handleInitiateSTKPush = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentPlan) return;
        try {
            setPaymentStatus('sending');
            setPaymentError("");
            const response: any = await subscriptionsAPI.initiateSTKPush({
                plan: paymentPlan.key,
                phone: paymentPhone
            });
            if (response && response.success) {
                const ref = response.data?.reference;
                setPaymentReference(ref);
                setPaymentStatus('polling');
                startPaymentPolling(ref);
            } else {
                setPaymentStatus('failed');
                setPaymentError(response.error?.message || "Failed to send STK push");
            }
        } catch (error: any) {
            console.error("STK push initiation failed:", error);
            setPaymentStatus('failed');
            setPaymentError(error.message || "Failed to initiate payment");
        }
    };

    const startPaymentPolling = (ref: string) => {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 30) { // Timeout after 2 minutes (30 * 4s)
                clearInterval(interval);
                setPaymentStatus('failed');
                setPaymentError("Payment verification timed out. If you already entered your PIN, the subscription will activate automatically shortly via webhook.");
                fetchSubscriptions();
                return;
            }
            try {
                const response: any = await subscriptionsAPI.checkSTKStatus(ref);
                if (response && response.success) {
                    if (response.data?.status === 'completed' || response.data?.subscriptionStatus === 'ACTIVE') {
                        clearInterval(interval);
                        setPaymentStatus('completed');
                        toast.success("Subscription activated successfully!");
                        fetchSubscriptions();
                    } else if (response.data?.status === 'failed') {
                        clearInterval(interval);
                        setPaymentStatus('failed');
                        setPaymentError("Payment failed or cancelled on phone.");
                    }
                }
            } catch (error) {
                console.error("Polling check failed:", error);
            }
        }, 4000);

        // Save interval to clear it on modal close
        (window as any).paymentPollingInterval = interval;
    };

    const handleClosePaymentModal = () => {
        setIsPaymentModalOpen(false);
        if ((window as any).paymentPollingInterval) {
            clearInterval((window as any).paymentPollingInterval);
            (window as any).paymentPollingInterval = null;
        }
    };

    // Auto-calculate end date in create form
    const handleCreateFormPlanChange = (plan: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL') => {
        const amount = PLAN_PRICES[plan];
        const start = createForm.startDate ? new Date(createForm.startDate) : new Date();
        const end = new Date(start);
        
        if (plan === 'WEEKLY') end.setDate(start.getDate() + 7);
        else if (plan === 'MONTHLY') end.setDate(start.getDate() + 30);
        else if (plan === 'SEMI_ANNUAL') end.setDate(start.getDate() + 180);
        else if (plan === 'ANNUAL') end.setDate(start.getDate() + 365);

        setCreateForm(prev => ({
            ...prev,
            plan,
            amount,
            endDate: format(end, "yyyy-MM-dd")
        }));
    };

    // Auto-calculate end date in edit form when plan changes
    const handleEditFormPlanChange = (plan: 'WEEKLY' | 'MONTHLY' | 'SEMI_ANNUAL' | 'ANNUAL') => {
        const amount = PLAN_PRICES[plan];
        if (!selectedSubscription) return;

        const start = new Date(selectedSubscription.startDate);
        const end = new Date(start);

        if (plan === 'WEEKLY') end.setDate(start.getDate() + 7);
        else if (plan === 'MONTHLY') end.setDate(start.getDate() + 30);
        else if (plan === 'SEMI_ANNUAL') end.setDate(start.getDate() + 180);
        else if (plan === 'ANNUAL') end.setDate(start.getDate() + 365);

        setEditForm(prev => ({
            ...prev,
            plan,
            amount,
            endDate: format(end, "yyyy-MM-dd")
        }));
    };

    const handleCreateSubscription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.agentId) {
            toast.error("Please select an agent");
            return;
        }
        try {
            setSubmitting(true);
            const response: any = await subscriptionsAPI.create({
                ...createForm,
                amount: Number(createForm.amount)
            });
            if (response && response.success) {
                toast.success("Subscription created successfully!");
                setIsCreateOpen(false);
                // Reset form
                setCreateForm({
                    agentId: "",
                    plan: "MONTHLY",
                    amount: PLAN_PRICES.MONTHLY,
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
                    status: "ACTIVE"
                });
                fetchSubscriptions();
            } else {
                toast.error(response.error?.message || "Failed to create subscription");
            }
        } catch (error: any) {
            console.error("Create subscription failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (sub: AgentSubscription) => {
        setSelectedSubscription(sub);
        setEditForm({
            plan: sub.plan,
            amount: typeof sub.amount === 'string' ? parseFloat(sub.amount) : sub.amount,
            endDate: format(new Date(sub.endDate), "yyyy-MM-dd"),
            status: sub.status
        });
        setIsEditOpen(true);
    };

    const handleUpdateSubscription = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubscription) return;
        try {
            setSubmitting(true);
            const response: any = await subscriptionsAPI.update(selectedSubscription.id, {
                plan: editForm.plan,
                amount: Number(editForm.amount),
                endDate: editForm.endDate,
                status: editForm.status
            });
            if (response && response.success) {
                toast.success("Subscription updated successfully!");
                setIsEditOpen(false);
                fetchSubscriptions();
            } else {
                toast.error(response.error?.message || "Failed to update subscription");
            }
        } catch (error: any) {
            console.error("Update subscription failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteSubscription = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this subscription record?")) {
            return;
        }
        try {
            const response: any = await subscriptionsAPI.delete(id);
            if (response && response.success) {
                toast.success("Subscription record deleted");
                fetchSubscriptions();
            } else {
                toast.error(response.error?.message || "Failed to delete subscription");
            }
        } catch (error: any) {
            console.error("Delete subscription failed:", error);
            toast.error(error.message || "An error occurred");
        }
    };

    // Filtered subscriptions for admin searchable panel
    const filteredSubscriptions = subscriptions.filter(sub => {
        const agentName = sub.agent?.user?.fullName || "";
        const agentEmail = sub.agent?.user?.email || "";
        const agentPhone = sub.agent?.user?.phone || "";
        const matchesSearch = 
            agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agentPhone.includes(searchQuery);

        const matchesStatus = statusFilter === "ALL" || sub.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Helper: Find first active subscription for Agent
    const activeSubscription = isAgent
        ? subscriptions.find(sub => sub.status === 'ACTIVE' && isAfter(new Date(sub.endDate), new Date()))
        : null;

    // Helper: Format price
    const formatCurrency = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return `TSh ${num.toLocaleString()}`;
    };

    // Stats calculations for Admin
    const activeCount = subscriptions.filter(sub => sub.status === 'ACTIVE' && isAfter(new Date(sub.endDate), new Date())).length;
    const totalRev = subscriptions.reduce((sum, sub) => sum + (typeof sub.amount === 'string' ? parseFloat(sub.amount) : sub.amount), 0);
    const expiredCount = subscriptions.filter(sub => sub.status === 'EXPIRED' || (sub.status === 'ACTIVE' && !isAfter(new Date(sub.endDate), new Date()))).length;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                        {isAdmin ? "Subscriptions Administration" : "Subscription & Billing"}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin 
                            ? "Manage agent subscription packages, duration updates, and billing configurations."
                            : "View active plans, billing history, and benefits structure."
                        }
                    </p>
                </div>
                {isAdmin && (
                    <Button 
                        variant="hero" 
                        className="shadow-md hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Subscription
                    </Button>
                )}
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-12 h-12 text-secondary animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading subscription details...</p>
                </div>
            ) : (
                <>
                    {/* AGENT VIEW */}
                    {isAgent && (
                        <div className="space-y-8">
                            {/* Alert for no active subscription */}
                            {!activeSubscription && (
                                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-amber-500">No Active Subscription</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Your account is currently offline for auto-assigned orders. To start receiving new automated delivery orders, please purchase a subscription or contact support to verify your billing payment.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Active Subscription Details Card */}
                            {activeSubscription ? (
                                <Card className="overflow-hidden border border-border shadow-lg relative bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                                    <CardHeader className="relative">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-success/20 text-success text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                        Active Plan
                                                    </span>
                                                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                                </div>
                                                <CardTitle className="text-3xl font-extrabold text-white mt-3 capitalize">
                                                    {activeSubscription.plan.toLowerCase().replace('_', ' ')} Sourcing
                                                </CardTitle>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-400">Total Paid</p>
                                                <p className="text-2xl font-bold text-white mt-1">
                                                    {formatCurrency(activeSubscription.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="relative space-y-6 pt-4 border-t border-slate-800/60">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activation Date</p>
                                                <p className="text-base font-medium text-white flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-indigo-400" />
                                                    {format(new Date(activeSubscription.startDate), "MMMM d, yyyy")}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Renewal Expiry Date</p>
                                                <p className="text-base font-medium text-white flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-indigo-400" />
                                                    {format(new Date(activeSubscription.endDate), "MMMM d, yyyy")}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time Remaining</p>
                                                <p className="text-base font-medium text-white flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-indigo-400" />
                                                    {formatDistanceToNow(new Date(activeSubscription.endDate), { addSuffix: false })} left
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="relative bg-black/30 border-t border-slate-800/40 py-4 px-6 flex justify-between items-center">
                                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5 text-success" />
                                            Auto-assignment enabled. Your account is online.
                                        </span>
                                        <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-white hover:bg-slate-800" disabled>
                                            Payment Method Secured
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ) : (
                                <Card className="border border-border/80 bg-card p-8 text-center max-w-2xl mx-auto shadow-md">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <CreditCard className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-bold">No Current Active Plan</h3>
                                    <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                                        You are currently not subscribed to any sourcing agency plans. Select a plan below to understand details, then contact your administrator for activation.
                                    </p>
                                    <div className="mt-6 flex justify-center gap-4">
                                        <a href="tel:+255712345678" className="inline-flex items-center justify-center px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors">
                                            Call Administrator
                                        </a>
                                        <Button variant="outline" size="sm" onClick={() => {
                                            const contactDialog = document.getElementById("billing-info-card");
                                            if (contactDialog) contactDialog.scrollIntoView({ behavior: 'smooth' });
                                        }}>
                                            View Support Channels
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Plan Pricing Showcase Grid */}
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
                                    <Sparkles className="w-6 h-6 text-secondary" />
                                    LotusRise Sourcing Agent Packages
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {packages.map((pkg) => {
                                        const price = pkg.price;
                                        const benefits = pkg.benefits;
                                        const planKey = pkg.key;
                                        const isCurrent = activeSubscription?.plan === planKey;

                                        return (
                                            <Card key={planKey} className={`relative flex flex-col justify-between border transition-all duration-300 hover:shadow-lg ${
                                                isCurrent 
                                                    ? 'border-secondary bg-secondary/5 ring-1 ring-secondary' 
                                                    : 'border-border bg-card'
                                            }`}>
                                                {isCurrent && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow-sm">
                                                        Active
                                                    </div>
                                                )}
                                                <CardHeader>
                                                    <CardDescription className="uppercase tracking-wider font-semibold text-xs text-muted-foreground">
                                                        {pkg.name}
                                                    </CardDescription>
                                                    <CardTitle className="text-2xl font-black mt-2">
                                                        {formatCurrency(price)}
                                                        <span className="text-xs font-normal text-muted-foreground ml-1">
                                                            / {planKey === 'WEEKLY' ? 'week' : planKey === 'MONTHLY' ? 'month' : planKey === 'SEMI_ANNUAL' ? '6 months' : 'year'}
                                                        </span>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                                                        {benefits.map((benefit, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                                                                <span>{benefit}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                                <CardFooter className="pt-4 border-t border-border/60">
                                                    <Button 
                                                        variant={isCurrent ? "outline" : "hero"} 
                                                        className="w-full text-xs"
                                                        disabled={isCurrent}
                                                        onClick={() => handleOpenPayment(pkg)}
                                                    >
                                                        {isCurrent ? "Active Plan" : "Pay Now"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Billing & Activation Info Cards */}
                            <Card id="billing-info-card" className="border border-border/80 bg-card p-6 shadow-sm">
                                <CardHeader className="px-0 pt-0">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-secondary" />
                                        Billing & Payment Instructions
                                    </CardTitle>
                                    <CardDescription>
                                        We support direct payment options. Please check these instructions before making orders.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-0 pb-0 space-y-4 text-sm leading-relaxed text-muted-foreground">
                                    <p>
                                        Subscriptions are activated manually by the LotusRise team upon verification of payment. Follow these steps:
                                    </p>
                                    <ol className="list-decimal pl-5 space-y-2">
                                        <li>
                                            Send the exact subscription fee corresponding to your package to <strong>Lipa Namba: 554321</strong> (LotusRise Logistics).
                                        </li>
                                        <li>
                                            Send a WhatsApp receipt message or transaction text containing your registered Agent Email ({user?.email}) and Agent ID to our billing department at <strong>+255 712 345 678</strong>.
                                        </li>
                                        <li>
                                            Our backend operators will approve your payment and activate your order routing package within 10 to 30 minutes.
                                        </li>
                                    </ol>
                                </CardContent>
                            </Card>

                            {/* Agent Billing History Table */}
                            <Card className="border border-border">
                                <CardHeader>
                                    <CardTitle>Billing History</CardTitle>
                                    <CardDescription>Records of your package activations and renewals.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto rounded-lg border border-border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/40 text-left">
                                                    <th className="p-3 font-semibold text-muted-foreground">Plan Type</th>
                                                    <th className="p-3 font-semibold text-muted-foreground">Amount</th>
                                                    <th className="p-3 font-semibold text-muted-foreground">Start Date</th>
                                                    <th className="p-3 font-semibold text-muted-foreground">Expiry Date</th>
                                                    <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {subscriptions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                            No transaction history found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    subscriptions.map((sub) => (
                                                        <tr key={sub.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-3 font-bold capitalize">{sub.plan.toLowerCase().replace('_', ' ')}</td>
                                                            <td className="p-3 font-medium">{formatCurrency(sub.amount)}</td>
                                                            <td className="p-3 text-muted-foreground">{format(new Date(sub.startDate), "MMM d, yyyy")}</td>
                                                            <td className="p-3 text-muted-foreground">{format(new Date(sub.endDate), "MMM d, yyyy")}</td>
                                                            <td className="p-3 text-center">
                                                                <span className={`inline-flex px-2.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                                                    sub.status === 'ACTIVE' && isAfter(new Date(sub.endDate), new Date())
                                                                        ? 'bg-success/10 text-success'
                                                                        : sub.status === 'CANCELLED'
                                                                            ? 'bg-muted text-muted-foreground'
                                                                            : 'bg-destructive/10 text-destructive'
                                                                }`}>
                                                                    {sub.status === 'ACTIVE' && !isAfter(new Date(sub.endDate), new Date()) ? 'EXPIRED' : sub.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ADMIN VIEW */}
                    {isAdmin && (
                        <div className="space-y-8">
                            {/* Summary Metrics Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <Card className="hover:shadow-md transition-shadow duration-200">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardDescription className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</CardDescription>
                                        <CheckCircle2 className="w-5 h-5 text-success" />
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="text-3xl font-black text-foreground">{activeCount}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Agents with auto-assignment enabled</p>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-md transition-shadow duration-200">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Revenue Tracked</CardDescription>
                                        <TrendingUp className="w-5 h-5 text-secondary" />
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="text-3xl font-black text-foreground">{formatCurrency(totalRev)}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Sum of all manual subscriptions entered</p>
                                    </CardContent>
                                </Card>
                                <Card className="hover:shadow-md transition-shadow duration-200">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardDescription className="text-xs font-semibold uppercase tracking-wider">Expired Packages</CardDescription>
                                        <Clock className="w-5 h-5 text-destructive" />
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="text-3xl font-black text-foreground">{expiredCount}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Inactive agents requires billing check</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Manage Subscription Packages Grid (Admin) */}
                            <div>
                                <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-secondary" />
                                    Manage Subscription Packages
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {packages.map((pkg) => (
                                        <Card key={pkg.key} className="flex flex-col justify-between border border-border bg-card">
                                            <CardHeader>
                                                <CardDescription className="uppercase tracking-wider font-semibold text-xs text-muted-foreground">
                                                    {pkg.key.replace('_', ' ')} Plan
                                                </CardDescription>
                                                <CardTitle className="text-xl font-black mt-2">
                                                    {pkg.name}
                                                </CardTitle>
                                                <p className="text-lg font-bold text-foreground mt-1">
                                                    {formatCurrency(pkg.price)}
                                                </p>
                                            </CardHeader>
                                            <CardContent className="flex-grow">
                                                <ul className="space-y-1.5 text-xs text-muted-foreground">
                                                    {pkg.benefits.map((benefit, i) => (
                                                        <li key={i} className="flex items-start gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                                                            <span>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                            <CardFooter className="pt-4 border-t border-border/60">
                                                <Button 
                                                    variant="outline" 
                                                    className="w-full text-xs"
                                                    onClick={() => handleOpenEditPackage(pkg)}
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                                    Edit Package
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        placeholder="Search by agent name, phone, or email..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 text-sm"
                                    />
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-[180px] text-sm">
                                            <SelectValue placeholder="Filter by Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Statuses</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="EXPIRED">Expired</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
                                        Refresh
                                    </Button>
                                </div>
                            </div>

                            {/* Subscriptions Data Table */}
                            <Card className="border border-border">
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/40 text-left">
                                                    <th className="p-4 font-semibold text-muted-foreground">Agent Info</th>
                                                    <th className="p-4 font-semibold text-muted-foreground">Plan</th>
                                                    <th className="p-4 font-semibold text-muted-foreground">Amount Paid</th>
                                                    <th className="p-4 font-semibold text-muted-foreground">Start Date</th>
                                                    <th className="p-4 font-semibold text-muted-foreground">End Date</th>
                                                    <th className="p-4 font-semibold text-muted-foreground text-center">Status</th>
                                                    <th className="p-4 font-semibold text-muted-foreground text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {filteredSubscriptions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                                            No subscriptions found matching query.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredSubscriptions.map((sub) => (
                                                        <tr key={sub.id} className="hover:bg-muted/10 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-semibold text-foreground">
                                                                    {sub.agent?.user?.fullName || "Deleted Agent"}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {sub.agent?.user?.email} • {sub.agent?.user?.phone}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-bold text-xs uppercase bg-secondary/10 text-secondary px-2.5 py-1 rounded-md">
                                                                    {sub.plan}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-semibold text-foreground">
                                                                {formatCurrency(sub.amount)}
                                                            </td>
                                                            <td className="p-4 text-muted-foreground">
                                                                {format(new Date(sub.startDate), "yyyy-MM-dd")}
                                                            </td>
                                                            <td className="p-4 text-muted-foreground">
                                                                {format(new Date(sub.endDate), "yyyy-MM-dd")}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`inline-flex px-2.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                                                    sub.status === 'ACTIVE' && isAfter(new Date(sub.endDate), new Date())
                                                                        ? 'bg-success/10 text-success'
                                                                        : sub.status === 'CANCELLED'
                                                                            ? 'bg-muted text-muted-foreground'
                                                                            : 'bg-destructive/10 text-destructive'
                                                                }`}>
                                                                    {sub.status === 'ACTIVE' && !isAfter(new Date(sub.endDate), new Date()) ? 'EXPIRED' : sub.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-secondary hover:text-white hover:bg-secondary"
                                                                        onClick={() => handleOpenEdit(sub)}
                                                                    >
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive"
                                                                        onClick={() => handleDeleteSubscription(sub.id)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {/* CREATE SUBSCRIPTION DIALOG */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Create Agent Subscription</DialogTitle>
                        <DialogDescription>
                            Activate a subscription package manually for an online agent.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubscription} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="agentSelect">Agent Selection</Label>
                            <Select 
                                value={createForm.agentId} 
                                onValueChange={(val) => setCreateForm(prev => ({ ...prev, agentId: val }))}
                            >
                                <SelectTrigger id="agentSelect" className="text-sm">
                                    <SelectValue placeholder="Select Agent Account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            {agent.user.fullName} ({agent.user.phone})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="planSelect">Package Plan</Label>
                                <Select 
                                    value={createForm.plan} 
                                    onValueChange={(val: any) => handleCreateFormPlanChange(val)}
                                >
                                    <SelectTrigger id="planSelect">
                                        <SelectValue placeholder="Select Plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                                        <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                                        <SelectItem value="SEMI_ANNUAL">SEMI_ANNUAL</SelectItem>
                                        <SelectItem value="ANNUAL">ANNUAL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="amountInput">Amount (TSh)</Label>
                                <Input 
                                    id="amountInput"
                                    type="number"
                                    value={createForm.amount}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="startDateInput">Start Date</Label>
                                <Input 
                                    id="startDateInput"
                                    type="date"
                                    value={createForm.startDate}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="endDateInput">End Date</Label>
                                <Input 
                                    id="endDateInput"
                                    type="date"
                                    value={createForm.endDate}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="statusSelect">Status</Label>
                            <Select 
                                value={createForm.status} 
                                onValueChange={(val: any) => setCreateForm(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger id="statusSelect">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                    <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="hero" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Subscription
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT SUBSCRIPTION DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Edit Agent Subscription</DialogTitle>
                        <DialogDescription>
                            Update the plan details or extend the end date for this agent.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubscription && (
                        <form onSubmit={handleUpdateSubscription} className="space-y-4 py-2">
                            <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Agent Details</p>
                                <p className="font-semibold text-foreground">{selectedSubscription.agent?.user?.fullName}</p>
                                <p className="text-xs text-muted-foreground">{selectedSubscription.agent?.user?.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editPlanSelect">Package Plan</Label>
                                    <Select 
                                        value={editForm.plan} 
                                        onValueChange={(val: any) => handleEditFormPlanChange(val)}
                                    >
                                        <SelectTrigger id="editPlanSelect">
                                            <SelectValue placeholder="Select Plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                                            <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                                            <SelectItem value="SEMI_ANNUAL">SEMI_ANNUAL</SelectItem>
                                            <SelectItem value="ANNUAL">ANNUAL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editAmountInput">Amount (TSh)</Label>
                                    <Input 
                                        id="editAmountInput"
                                        type="number"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editEndDateInput">End Date</Label>
                                    <Input 
                                        id="editEndDateInput"
                                        type="date"
                                        value={editForm.endDate}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editStatusSelect">Status</Label>
                                    <Select 
                                        value={editForm.status} 
                                        onValueChange={(val: any) => setEditForm(prev => ({ ...prev, status: val }))}
                                    >
                                        <SelectTrigger id="editStatusSelect">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                            <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="hero" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Update Details
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* EDIT SUBSCRIPTION PACKAGE DIALOG (Admin) */}
            <Dialog open={isEditPackageOpen} onOpenChange={setIsEditPackageOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Subscription Package</DialogTitle>
                        <DialogDescription>
                            Change pricing, name, and benefit listings for this plan.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPackage && (
                        <form onSubmit={handleUpdatePackage} className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="packageName">Package Name</Label>
                                <Input 
                                    id="packageName"
                                    value={packageEditForm.name}
                                    onChange={(e) => setPackageEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="packagePrice">Price (TSh)</Label>
                                <Input 
                                    id="packagePrice"
                                    type="number"
                                    value={packageEditForm.price}
                                    onChange={(e) => setPackageEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Package Benefits</Label>
                                <div className="space-y-2 max-h-[160px] overflow-y-auto border border-border rounded-lg p-2.5 bg-muted/20">
                                    {packageEditForm.benefits.map((benefit, i) => (
                                        <div key={i} className="flex items-center justify-between gap-2 bg-card p-1.5 rounded border border-border/60">
                                            <span className="text-xs text-foreground truncate">{benefit}</span>
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveBenefit(i)}
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                    {packageEditForm.benefits.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">No benefits added yet.</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="Add new benefit..."
                                        value={newBenefit}
                                        onChange={(e) => setNewBenefit(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddBenefit();
                                            }
                                        }}
                                        className="text-xs h-9"
                                    />
                                    <Button type="button" size="sm" onClick={handleAddBenefit}>
                                        Add
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsEditPackageOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="hero" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Save Package
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* STK PUSH PAYMENT DIALOG (Agent) */}
            <Dialog open={isPaymentModalOpen} onOpenChange={(val) => { if (!val) handleClosePaymentModal(); }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Subscribe & Activate</DialogTitle>
                        <DialogDescription>
                            Pay for your sourcing package automatically via mobile money STK push.
                        </DialogDescription>
                    </DialogHeader>

                    {paymentPlan && (
                        <div className="space-y-4 py-2">
                            {/* Plan Info Summary */}
                            <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-xl space-y-1.5">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Selected Plan</p>
                                <div className="flex justify-between items-center">
                                    <h4 className="font-extrabold text-foreground text-lg">{paymentPlan.name}</h4>
                                    <span className="font-black text-secondary text-lg">{formatCurrency(paymentPlan.price)}</span>
                                </div>
                            </div>

                            {paymentStatus === 'idle' && (
                                <form onSubmit={handleInitiateSTKPush} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Enter Mobile Money Number</Label>
                                        <Input
                                            id="phone"
                                            placeholder="e.g. 0712345678"
                                            value={paymentPhone}
                                            onChange={(e) => setPaymentPhone(e.target.value)}
                                            required
                                            className="text-center font-bold tracking-wider text-lg"
                                        />
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Please provide a valid Tanzanian mobile number (M-Pesa, Tigo Pesa, Airtel Money, Halopesa). You will receive an automatic prompt (STK Push) on this device to confirm transaction with your PIN.
                                        </p>
                                    </div>
                                    <DialogFooter className="pt-2">
                                        <Button type="button" variant="outline" className="w-full sm:w-auto text-xs" onClick={handleClosePaymentModal}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" variant="hero" className="w-full sm:w-auto text-xs">
                                            Send STK Push
                                        </Button>
                                    </DialogFooter>
                                </form>
                            )}

                            {paymentStatus === 'sending' && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <Loader2 className="w-10 h-10 text-secondary animate-spin" />
                                    <div className="text-center">
                                        <h5 className="font-bold text-foreground">Initiating STK Push...</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Connecting to Snippe secure payment gateway</p>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'polling' && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-muted border-t-secondary animate-spin" />
                                        <CreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    </div>
                                    <div className="text-center space-y-2 max-w-[280px]">
                                        <h5 className="font-bold text-foreground">Awaiting PIN Confirmation</h5>
                                        <p className="text-xs text-muted-foreground">
                                            We sent a payment prompt to <strong className="text-foreground">{paymentPhone}</strong>. Please check your phone, enter your PIN, and verify payment.
                                        </p>
                                        <p className="text-[10px] text-amber-500 font-medium">Do not close this window.</p>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'completed' && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-success animate-bounce" />
                                    </div>
                                    <div className="text-center">
                                        <h5 className="font-bold text-foreground text-lg">Payment Confirmed!</h5>
                                        <p className="text-xs text-muted-foreground mt-1">Your subscription is now active.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleClosePaymentModal} className="mt-2 text-xs">
                                        Go to Dashboard
                                    </Button>
                                </div>
                            )}

                            {paymentStatus === 'failed' && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <XCircle className="w-6 h-6 text-destructive" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h5 className="font-bold text-foreground">Payment Failed</h5>
                                        <p className="text-xs text-destructive max-w-[280px]">{paymentError}</p>
                                    </div>
                                    <div className="flex gap-2 mt-2 w-full">
                                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleClosePaymentModal}>
                                            Cancel
                                        </Button>
                                        <Button variant="hero" size="sm" className="flex-1 text-xs" onClick={() => setPaymentStatus('idle')}>
                                            Try Again
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardSubscriptions;
