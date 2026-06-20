import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    AlertTriangle,
    Shield,
    Plus,
    CheckCircle2,
    Clock,
    XCircle,
    Eye,
    Folder,
    Loader2,
    Calendar,
    User,
    ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { complaintsAPI, ordersAPI } from "@/lib/api";
import { format } from "date-fns";

interface Complaint {
    id: string;
    orderId: string;
    customerId: string;
    agentId?: string;
    category: 'WRONG_PRODUCT' | 'MISSING_PRODUCT' | 'DAMAGED_PRODUCT' | 'FRAUDULENT_ACTIVITY' | 'DELIVERY_ISSUES';
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
    description: string;
    evidenceImages: string[];
    adminNotes?: string;
    resolvedAt?: string;
    createdAt: string;
    order: {
        orderNumber: string;
    };
    customer: {
        fullName: string;
        email: string;
        phone: string;
    };
    agent?: {
        user: {
            fullName: string;
        };
    };
}

interface OrderItem {
    id: string;
    orderNumber: string;
    status: string;
}

const CATEGORY_COLORS = {
    WRONG_PRODUCT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    MISSING_PRODUCT: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    DAMAGED_PRODUCT: "bg-red-500/10 text-red-500 border-red-500/20",
    FRAUDULENT_ACTIVITY: "bg-rose-600/15 text-rose-500 border-rose-500/25",
    DELIVERY_ISSUES: "bg-blue-500/10 text-blue-500 border-blue-500/20"
};

const STATUS_ICONS = {
    PENDING: Clock,
    INVESTIGATING: Folder,
    RESOLVED: CheckCircle2,
    DISMISSED: XCircle
};

const STATUS_COLORS = {
    PENDING: "bg-amber-500/10 text-amber-500",
    INVESTIGATING: "bg-blue-500/10 text-blue-500",
    RESOLVED: "bg-success/10 text-success",
    DISMISSED: "bg-muted text-muted-foreground"
};

const DashboardComplaints = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const isCustomer = user?.role === 'CUSTOMER';
    const isAgent = user?.role === 'AGENT';

    // State lists
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Modal dialogs
    const [isFileOpen, setIsFileOpen] = useState(false);
    const [isResolveOpen, setIsResolveOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

    // Forms
    const [fileForm, setFileForm] = useState({
        orderId: "",
        category: "WRONG_PRODUCT" as any,
        description: "",
        evidenceImages: [] as string[]
    });

    const [resolveForm, setResolveForm] = useState({
        status: "RESOLVED" as 'RESOLVED' | 'DISMISSED',
        adminNotes: ""
    });

    useEffect(() => {
        fetchComplaints();
        if (isCustomer) {
            fetchOrders();
        }
    }, [isCustomer]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const response: any = await complaintsAPI.list();
            if (response && response.success) {
                setComplaints(response.data || []);
            } else {
                toast.error("Failed to load complaints");
            }
        } catch (error: any) {
            console.error("Fetch complaints failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const response: any = await ordersAPI.list();
            if (response && response.success) {
                setOrders(response.data || []);
            }
        } catch (error) {
            console.error("Fetch orders failed:", error);
        }
    };

    const handleFileComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileForm.orderId) {
            toast.error("Please select an order");
            return;
        }
        if (!fileForm.description.trim()) {
            toast.error("Please describe the dispute issues");
            return;
        }

        try {
            setSubmitting(true);
            const response: any = await complaintsAPI.create(fileForm);
            if (response && response.success) {
                toast.success("Complaint submitted for investigation!");
                setIsFileOpen(false);
                setFileForm({
                    orderId: "",
                    category: "WRONG_PRODUCT",
                    description: "",
                    evidenceImages: []
                });
                fetchComplaints();
            } else {
                toast.error(response.error?.message || "Failed to file complaint");
            }
        } catch (error: any) {
            console.error("File complaint failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenResolve = (comp: Complaint) => {
        setSelectedComplaint(comp);
        setResolveForm({
            status: "RESOLVED",
            adminNotes: comp.adminNotes || ""
        });
        setIsResolveOpen(true);
    };

    const handleResolveComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComplaint) return;

        try {
            setSubmitting(true);
            const response: any = await complaintsAPI.resolve(selectedComplaint.id, resolveForm);
            if (response && response.success) {
                toast.success("Dispute resolved successfully");
                setIsResolveOpen(false);
                fetchComplaints();
            } else {
                toast.error(response.error?.message || "Failed to resolve complaint");
            }
        } catch (error: any) {
            console.error("Resolve complaint error:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenView = (comp: Complaint) => {
        setSelectedComplaint(comp);
        setIsViewOpen(true);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-secondary shrink-0" />
                        Dispute & Protection Center
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? "Investigate complaints, read customer statements, and resolve agent billing disputes."
                            : "Raise complaints or track protection claims filed for delivery orders."
                        }
                    </p>
                </div>
                {isCustomer && (
                    <Button 
                        variant="hero"
                        className="shadow-md hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => setIsFileOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        File Complaint
                    </Button>
                )}
            </div>

            {/* List Table/Cards */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-12 h-12 text-secondary animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading claims database...</p>
                </div>
            ) : complaints.length === 0 ? (
                <Card className="border border-border/80 bg-card p-12 text-center max-w-xl mx-auto shadow-sm">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">No Disputes Logged</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        There are currently no active complaints logged in your profile database. Buy with confidence, all orders are covered under our direct agent merit protections program.
                    </p>
                </Card>
            ) : (
                <Card className="border border-border">
                    <CardHeader className="pb-3 border-b border-border/60">
                        <CardTitle className="text-lg">Logged Protection Claims</CardTitle>
                        <CardDescription>Records of complaints undergoing analysis or resolution.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-left">
                                        <th className="p-4 font-semibold text-muted-foreground">Order Ref</th>
                                        <th className="p-4 font-semibold text-muted-foreground">Category</th>
                                        {isAdmin && <th className="p-4 font-semibold text-muted-foreground">Filer</th>}
                                        {isAdmin && <th className="p-4 font-semibold text-muted-foreground">Agent</th>}
                                        <th className="p-4 font-semibold text-muted-foreground">Statement</th>
                                        <th className="p-4 font-semibold text-muted-foreground text-center">Status</th>
                                        <th className="p-4 font-semibold text-muted-foreground text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {complaints.map((comp) => {
                                        const StatusIcon = STATUS_ICONS[comp.status] || Clock;
                                        return (
                                            <tr key={comp.id} className="hover:bg-muted/10 transition-colors">
                                                <td className="p-4 font-bold text-foreground">
                                                    #{comp.order.orderNumber}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex px-2 py-1 border rounded-md text-[10px] font-extrabold capitalize ${
                                                        CATEGORY_COLORS[comp.category] || "bg-muted text-muted-foreground"
                                                    }`}>
                                                        {comp.category.toLowerCase().replace('_', ' ')}
                                                    </span>
                                                </td>
                                                {isAdmin && (
                                                    <td className="p-4">
                                                        <div className="font-semibold">{comp.customer.fullName}</div>
                                                        <div className="text-[10px] text-muted-foreground">{comp.customer.phone}</div>
                                                    </td>
                                                )}
                                                {isAdmin && (
                                                    <td className="p-4">
                                                        <div className="font-semibold">{comp.agent?.user.fullName || "Unassigned"}</div>
                                                    </td>
                                                )}
                                                <td className="p-4 max-w-xs truncate text-muted-foreground">
                                                    {comp.description}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                                                        STATUS_COLORS[comp.status] || "bg-muted text-muted"
                                                    }`}>
                                                        <StatusIcon className="w-3 h-3 shrink-0" />
                                                        {comp.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                                            onClick={() => handleOpenView(comp)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {isAdmin && comp.status === 'PENDING' && (
                                                            <Button 
                                                                variant="hero" 
                                                                size="sm"
                                                                className="text-xs"
                                                                onClick={() => handleOpenResolve(comp)}
                                                            >
                                                                Resolve
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* FILE COMPLAINT DIALOG */}
            <Dialog open={isFileOpen} onOpenChange={setIsFileOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>File Order Complaint</DialogTitle>
                        <DialogDescription>
                            If there are issues with your order delivery, file a complaint. The Super Admin team will inspect it.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFileComplaint} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="orderSelect">Select Disputed Order</Label>
                            <Select 
                                value={fileForm.orderId} 
                                onValueChange={(val) => setFileForm(prev => ({ ...prev, orderId: val }))}
                            >
                                <SelectTrigger id="orderSelect">
                                    <SelectValue placeholder="Select Order" />
                                </SelectTrigger>
                                <SelectContent>
                                    {orders
                                        .filter(o => ['READY_FOR_DELIVERY', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED_SUCCESSFULLY', 'COMPLETED'].includes(o.status))
                                        .map((order) => (
                                            <SelectItem key={order.id} value={order.id}>
                                                #{order.orderNumber} ({order.status})
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="categorySelect">Dispute Category</Label>
                            <Select 
                                value={fileForm.category} 
                                onValueChange={(val: any) => setFileForm(prev => ({ ...prev, category: val }))}
                            >
                                <SelectTrigger id="categorySelect">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WRONG_PRODUCT">Wrong Product Delivered</SelectItem>
                                    <SelectItem value="MISSING_PRODUCT">Missing Items</SelectItem>
                                    <SelectItem value="DAMAGED_PRODUCT">Damaged / Broken Items</SelectItem>
                                    <SelectItem value="FRAUDULENT_ACTIVITY">Fraudulent Sourcing / Double Charging</SelectItem>
                                    <SelectItem value="DELIVERY_ISSUES">Driver Delay / Misbehaviour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="issueDesc">Describe the Issue</Label>
                            <Textarea 
                                id="issueDesc"
                                placeholder="State clearly what went wrong, what product is missing, or details about the issue..."
                                value={fileForm.description}
                                onChange={(e) => setFileForm(prev => ({ ...prev, description: e.target.value }))}
                                className="min-h-[100px] resize-none"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsFileOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="hero" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Submit Claim
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* RESOLVE COMPLAINT DIALOG */}
            <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Resolve Protection Dispute</DialogTitle>
                        <DialogDescription>
                            Review statements and resolve this protection claim.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedComplaint && (
                        <form onSubmit={handleResolveComplaint} className="space-y-4 py-2">
                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                <p className="font-bold">Complaint Ref: #{selectedComplaint.order.orderNumber}</p>
                                <p><span className="font-medium text-slate-400">Filer:</span> {selectedComplaint.customer.fullName}</p>
                                <p className="line-clamp-2 text-slate-500 mt-1">"{selectedComplaint.description}"</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="resolveStatus">Resolution Status</Label>
                                <Select 
                                    value={resolveForm.status} 
                                    onValueChange={(val: any) => setResolveForm(prev => ({ ...prev, status: val }))}
                                >
                                    <SelectTrigger id="resolveStatus">
                                        <SelectValue placeholder="Select resolution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RESOLVED">RESOLVED (Action taken/Refund confirmed)</SelectItem>
                                        <SelectItem value="DISMISSED">DISMISSED (Invalid dispute/No fraud found)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notes">Resolution Notes</Label>
                                <Textarea 
                                    id="notes"
                                    placeholder="Enter details of investigation and outcome..."
                                    value={resolveForm.adminNotes}
                                    onChange={(e) => setResolveForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsResolveOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="hero" disabled={submitting}>
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Submit Resolution
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* VIEW COMPLAINT DETAILS DIALOG */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-secondary" />
                            Dispute File Review
                        </DialogTitle>
                        <DialogDescription>
                            Full logs for Order claim #{selectedComplaint?.order.orderNumber}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedComplaint && (
                        <div className="space-y-4 py-2 text-sm">
                            <div className="grid grid-cols-2 gap-4 border-b border-border pb-3">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Category</p>
                                    <p className="font-bold text-foreground mt-0.5 capitalize">
                                        {selectedComplaint.category.toLowerCase().replace('_', ' ')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</p>
                                    <p className="font-bold text-foreground mt-0.5 uppercase">
                                        {selectedComplaint.status}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer Statement</p>
                                <p className="bg-muted/40 p-3 rounded-lg text-xs leading-relaxed italic text-slate-600 dark:text-slate-300">
                                    "{selectedComplaint.description}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Logged At</p>
                                    <p className="text-xs font-medium mt-1 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        {format(new Date(selectedComplaint.createdAt), "MMM d, yyyy HH:mm")}
                                    </p>
                                </div>
                                {selectedComplaint.resolvedAt && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Resolved At</p>
                                        <p className="text-xs font-medium mt-1 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-success" />
                                            {format(new Date(selectedComplaint.resolvedAt), "MMM d, yyyy HH:mm")}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedComplaint.adminNotes && (
                                <div className="border-t border-border pt-3">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Administrative Notes</p>
                                    <p className="bg-success/5 border border-success/10 p-3 rounded-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                        {selectedComplaint.adminNotes}
                                    </p>
                                </div>
                            )}

                            <div className="border-t border-border pt-3 flex justify-end">
                                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                                    Close file
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardComplaints;
