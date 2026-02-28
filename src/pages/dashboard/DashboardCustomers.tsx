import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { customersAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Mail, Phone, MapPin, Calendar, MoreVertical, Trash2, RefreshCw, X, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_HOST } from "@/config/api";


interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    status: string;
    joinedAt: string;
    ordersCount: number;
    avatarUrl?: string;
}


const DashboardCustomers = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
    });
    const [phoneError, setPhoneError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    /**
     * Format phone input with 255 prefix
     * Accepts: 0712345678, 712345678, 255712345678, +255712345678
     * Returns: 255712345678
     */
    const formatPhoneInput = (value: string): string => {
        // Remove all non-digit characters
        let cleaned = value.replace(/\D/g, '');

        // Handle different formats
        if (cleaned.startsWith('0')) {
            // Local format: 0712345678 -> 255712345678
            cleaned = '255' + cleaned.substring(1);
        } else if (cleaned.startsWith('255')) {
            // Already in international format
        } else if (cleaned.length <= 9 && cleaned.length > 0) {
            // Just the number without prefix: 712345678
            cleaned = '255' + cleaned;
        }

        return cleaned;
    };

    /**
     * Display phone number in readable format: +255 712 345 678
     */
    const formatPhoneDisplay = (phone: string): string => {
        if (!phone || phone === 'N/A') return phone;

        // Ensure it starts with 255
        let formatted = phone.replace(/\D/g, '');
        if (!formatted.startsWith('255')) {
            if (formatted.startsWith('0')) {
                formatted = '255' + formatted.substring(1);
            } else if (formatted.length === 9) {
                formatted = '255' + formatted;
            }
        }

        // Format as +255 XXX XXX XXX
        if (formatted.length === 12) {
            return `+${formatted.slice(0, 3)} ${formatted.slice(3, 6)} ${formatted.slice(6, 9)} ${formatted.slice(9)}`;
        }

        return phone;
    };

    /**
     * Validate Tanzania phone number
     */
    const validatePhone = (phone: string): { isValid: boolean; error: string } => {
        const cleaned = phone.replace(/\D/g, '');

        if (!cleaned) {
            return { isValid: false, error: "Phone number is required" };
        }

        // Format to 255 prefix
        let formatted = cleaned;
        if (cleaned.startsWith('0')) {
            formatted = '255' + cleaned.substring(1);
        } else if (!cleaned.startsWith('255') && cleaned.length === 9) {
            formatted = '255' + cleaned;
        }

        // Tanzania phone numbers should be 12 digits (255 + 9 digits)
        if (formatted.length !== 12) {
            return { isValid: false, error: "Phone must be 9 digits after country code (e.g., 0712345678)" };
        }

        // Check for valid Tanzania prefixes (61, 62, 65, 67, 68, 69, 71, 72, 73, 74, 75, 76, 77, 78, 79)
        const validPrefixes = ['61', '62', '65', '67', '68', '69', '71', '72', '73', '74', '75', '76', '77', '78', '79'];
        const prefix = formatted.substring(3, 5);
        if (!validPrefixes.includes(prefix)) {
            return { isValid: false, error: `Invalid Tanzania mobile prefix. Use prefixes like 71, 75, 76, 78, etc.` };
        }

        return { isValid: true, error: "" };
    };

    /**
     * Validate password - must be at least 6 characters
     */
    const validatePassword = (password: string): { isValid: boolean; error: string } => {
        if (!password) {
            return { isValid: false, error: "Password is required" };
        }
        if (password.length < 6) {
            return { isValid: false, error: "Password must be at least 6 characters" };
        }
        return { isValid: true, error: "" };
    };

    const handlePasswordChange = (value: string) => {
        setFormData({ ...formData, password: value });
        const validation = validatePassword(value);
        setPasswordError(validation.error);
    };

    const handlePhoneChange = (value: string) => {
        setFormData({ ...formData, phone: value });
        const validation = validatePhone(value);
        setPhoneError(validation.error);
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response: any = await customersAPI.list({});
            if (response && response.success) {
                setCustomers(response.data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (!window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
            return;
        }
        try {
            await customersAPI.delete(customerId);
            toast.success("Customer deleted successfully");
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete customer");
        }
    };

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate phone
        const phoneValidation = validatePhone(formData.phone);
        if (!phoneValidation.isValid) {
            setPhoneError(phoneValidation.error);
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
            setPasswordError(passwordValidation.error);
            return;
        }

        try {
            setIsSubmitting(true);
            const response: any = await customersAPI.create({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });

            if (response && response.success) {
                toast.success("Customer added successfully!");
                setIsAddDialogOpen(false);
                setFormData({ fullName: "", email: "", phone: "", password: "" });
                setPhoneError("");
                setPasswordError("");
                fetchCustomers();
            } else {
                toast.error(response.error?.message || "Failed to add customer");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add customer");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ fullName: "", email: "", phone: "", password: "" });
        setPhoneError("");
        setPasswordError("");
        setShowPassword(false);
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("dashboard.customers.title")}</h1>
                    <p className="text-muted-foreground">{t("dashboard.customers.desc")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCustomers}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="hero" onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                        <UserPlus className="w-4 h-4" />
                        {t("dashboard.customers.addCustomer")}
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder={t("dashboard.customers.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Loading customers...
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                        <p className="text-muted-foreground">{t("dashboard.customers.noCustomers")}</p>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <div key={customer.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-all hover-lift">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border border-border">
                                        <AvatarImage src={customer.avatarUrl ? customer.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined} className="object-cover" />
                                        <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
                                            {getInitials(customer.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>

                                        <h3 className="font-bold text-foreground">{customer.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${customer.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {customer.status === "active" ? t("dashboard.customers.statusActive") : t("dashboard.customers.statusInactive")}
                                        </span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>{t("dashboard.customers.actions.viewProfile")}</DropdownMenuItem>
                                        <DropdownMenuItem>{t("dashboard.customers.actions.editDetails")}</DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {t("dashboard.customers.actions.delete")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="w-4 h-4" />
                                    <span>{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="w-4 h-4" />
                                    <span className="font-medium text-foreground">{formatPhoneDisplay(customer.phone)}</span>
                                </div>
                                {customer.location && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        <span>{customer.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    <span>{t("dashboard.customers.joined")} {format(new Date(customer.joinedAt), "MMM yyyy")}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-foreground">{customer.ordersCount || 0}</p>
                                    <p className="text-xs text-muted-foreground">{t("dashboard.customers.orders")}</p>
                                </div>
                                <Button variant="outline" size="sm">{t("dashboard.customers.viewOrders")}</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Customer Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-secondary" />
                            Add New Customer
                        </DialogTitle>
                        <DialogDescription>
                            Enter customer details below. Phone number will be formatted with Tanzania country code (255).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                                id="fullName"
                                placeholder="Enter customer's full name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="customer@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    +255
                                </div>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="712 345 678"
                                    value={formData.phone}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    className={`pl-16 ${phoneError ? 'border-destructive' : ''}`}
                                    required
                                />
                            </div>
                            {phoneError && (
                                <p className="text-xs text-destructive">{phoneError}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Enter number without country code (e.g., 0712345678 or 712345678)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password (min 6 characters)"
                                    value={formData.password}
                                    onChange={(e) => handlePasswordChange(e.target.value)}
                                    className={`pl-10 pr-10 ${passwordError ? 'border-destructive' : ''}`}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordError && (
                                <p className="text-xs text-destructive">{passwordError}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                This password will be sent to the customer via SMS
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsAddDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="hero"
                                className="flex-1"
                                disabled={isSubmitting || !!phoneError || !!passwordError || !formData.password}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add Customer
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardCustomers;
