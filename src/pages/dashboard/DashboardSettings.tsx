import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Globe, Moon, Sun, Bell, Lock, Palette, CreditCard, Smartphone, Plus, Trash2, Building, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { agentsAPI } from "@/lib/api";

const DashboardSettings = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        orderUpdates: true,
        marketing: false,
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const isAgent = user?.role === 'AGENT';
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    const [paymentProfile, setPaymentProfile] = useState({
        mobileMoneyNumbers: [] as any[],
        bankAccounts: [] as any[],
        lipaNumbers: [] as any[],
        qrCodeUrls: [] as string[],
        cashCollectionAvailable: true
    });

    // Temp form items
    const [newMobile, setNewMobile] = useState({ provider: "M-Pesa", phone: "", name: "" });
    const [newBank, setNewBank] = useState({ bankName: "CRDB", accountName: "", accountNumber: "" });
    const [newLipa, setNewLipa] = useState({ provider: "M-Pesa", name: "", number: "" });

    useEffect(() => {
        if (isAgent) {
            fetchPaymentProfile();
        }
    }, [isAgent]);

    const fetchPaymentProfile = async () => {
        try {
            setLoadingProfile(true);
            const response: any = await agentsAPI.getPaymentProfile();
            if (response && response.success && response.data) {
                const data = response.data;
                setPaymentProfile({
                    mobileMoneyNumbers: Array.isArray(data.mobileMoneyNumbers) ? data.mobileMoneyNumbers : [],
                    bankAccounts: Array.isArray(data.bankAccounts) ? data.bankAccounts : [],
                    lipaNumbers: Array.isArray(data.lipaNumbers) ? data.lipaNumbers : [],
                    qrCodeUrls: Array.isArray(data.qrCodeUrls) ? data.qrCodeUrls : [],
                    cashCollectionAvailable: data.cashCollectionAvailable !== undefined ? data.cashCollectionAvailable : true
                });
            }
        } catch (error) {
            console.error("Failed to fetch payment profile:", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    const handleSavePaymentProfile = async () => {
        try {
            setSavingProfile(true);
            const response: any = await agentsAPI.savePaymentProfile(paymentProfile);
            if (response && response.success) {
                toast.success("Payment profile saved successfully!");
                fetchPaymentProfile();
            } else {
                toast.error("Failed to save payment profile");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("language", lang);
        toast.success(`Language changed to ${lang === "en" ? "English" : "Swahili"}`);
    };

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else if (newTheme === "light") {
            document.documentElement.classList.remove("dark");
        } else {
            // System preference
            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
        localStorage.setItem("theme", newTheme);
        toast.success(`Theme changed to ${newTheme}`);
    };

    const handleNotificationChange = (key: keyof typeof notifications) => {
        setNotifications((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
        toast.success("Notification settings updated");
    };

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        // TODO: Implement actual password change API call
        toast.success("Password changed successfully");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Language Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Language
                        </CardTitle>
                        <CardDescription>
                            Choose your preferred language
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={i18n.language}
                            onValueChange={handleLanguageChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="sw">Swahili</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Theme Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize the look and feel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button
                                variant={theme === "light" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleThemeChange("light")}
                                className="flex-1"
                            >
                                <Sun className="w-4 h-4 mr-2" />
                                Light
                            </Button>
                            <Button
                                variant={theme === "dark" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleThemeChange("dark")}
                                className="flex-1"
                            >
                                <Moon className="w-4 h-4 mr-2" />
                                Dark
                            </Button>
                            <Button
                                variant={theme === "system" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleThemeChange("system")}
                                className="flex-1"
                            >
                                System
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </CardTitle>
                        <CardDescription>
                            Manage how you receive notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Email Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive updates via email
                                </p>
                            </div>
                            <Switch
                                checked={notifications.email}
                                onCheckedChange={() => handleNotificationChange("email")}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Push Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive push notifications in browser
                                </p>
                            </div>
                            <Switch
                                checked={notifications.push}
                                onCheckedChange={() => handleNotificationChange("push")}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Order Updates</Label>
                                <p className="text-sm text-muted-foreground">
                                    Get notified about order status changes
                                </p>
                            </div>
                            <Switch
                                checked={notifications.orderUpdates}
                                onCheckedChange={() => handleNotificationChange("orderUpdates")}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Marketing Emails</Label>
                                <p className="text-sm text-muted-foreground">
                                    Receive promotional content and offers
                                </p>
                            </div>
                            <Switch
                                checked={notifications.marketing}
                                onCheckedChange={() => handleNotificationChange("marketing")}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Password Change */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            Change Password
                        </CardTitle>
                        <CardDescription>
                            Update your account password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Current Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                currentPassword: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                newPassword: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Confirm Password</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                confirmPassword: e.target.value,
                                            })
                                        }
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="hero">
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Agent Payment Profile config (only visible to AGENT) */}
                {isAgent && (
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-secondary" />
                                Direct Sourcing Settle Configurations
                            </CardTitle>
                            <CardDescription>
                                Set up your mobile money numbers, bank accounts, Lipa numbers, and QR codes. Customers will settle payments directly with you using these details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loadingProfile ? (
                                <div className="text-center py-6 text-muted-foreground flex justify-center items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading payment profile...
                                </div>
                            ) : (
                                <>
                                    {/* Mobile Money configuration */}
                                    <div className="space-y-4 border-b border-border pb-4">
                                        <h3 className="font-bold text-sm flex items-center gap-1.5">
                                            <Smartphone className="w-4 h-4 text-slate-400" />
                                            Mobile Money Options
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl items-end">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Network Provider</Label>
                                                <Select value={newMobile.provider} onValueChange={(val) => setNewMobile(prev => ({ ...prev, provider: val }))}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                                                        <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                                                        <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                                                        <SelectItem value="HaloPesa">HaloPesa</SelectItem>
                                                        <SelectItem value="Mixx by Yas">Mixx by Yas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Registered Phone Number</Label>
                                                <Input 
                                                    placeholder="e.g. 0712345678" 
                                                    value={newMobile.phone}
                                                    onChange={(e) => setNewMobile(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Account Owner Name</Label>
                                                <Input 
                                                    placeholder="e.g. John Doe" 
                                                    value={newMobile.name}
                                                    onChange={(e) => setNewMobile(prev => ({ ...prev, name: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="md:col-span-3 mt-2"
                                                onClick={() => {
                                                    if (!newMobile.phone || !newMobile.name) {
                                                        toast.error("Please fill phone number and owner name");
                                                        return;
                                                    }
                                                    setPaymentProfile(prev => ({
                                                        ...prev,
                                                        mobileMoneyNumbers: [...prev.mobileMoneyNumbers, newMobile]
                                                    }));
                                                    setNewMobile({ provider: "M-Pesa", phone: "", name: "" });
                                                    toast.success("Mobile Money option added");
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Mobile Money Option
                                            </Button>
                                        </div>
                                        {paymentProfile.mobileMoneyNumbers.length > 0 && (
                                            <div className="space-y-2">
                                                {paymentProfile.mobileMoneyNumbers.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-border text-xs">
                                                        <div>
                                                            <span className="font-bold text-secondary mr-2">[{m.provider}]</span>
                                                            <span className="font-semibold">{m.phone}</span>
                                                            <span className="text-muted-foreground ml-2">({m.name})</span>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                setPaymentProfile(prev => ({
                                                                    ...prev,
                                                                    mobileMoneyNumbers: prev.mobileMoneyNumbers.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bank accounts configuration */}
                                    <div className="space-y-4 border-b border-border pb-4">
                                        <h3 className="font-bold text-sm flex items-center gap-1.5">
                                            <Building className="w-4 h-4 text-slate-400" />
                                            Bank Account Options
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl items-end">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Bank Name</Label>
                                                <Input 
                                                    placeholder="e.g. CRDB, NMB, NBC" 
                                                    value={newBank.bankName}
                                                    onChange={(e) => setNewBank(prev => ({ ...prev, bankName: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Account Number</Label>
                                                <Input 
                                                    placeholder="e.g. 015XXXXXXXX" 
                                                    value={newBank.accountNumber}
                                                    onChange={(e) => setNewBank(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Account Name</Label>
                                                <Input 
                                                    placeholder="e.g. John Doe" 
                                                    value={newBank.accountName}
                                                    onChange={(e) => setNewBank(prev => ({ ...prev, accountName: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="md:col-span-3 mt-2"
                                                onClick={() => {
                                                    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
                                                        toast.error("Please fill bank name, account number, and account name");
                                                        return;
                                                    }
                                                    setPaymentProfile(prev => ({
                                                        ...prev,
                                                        bankAccounts: [...prev.bankAccounts, newBank]
                                                    }));
                                                    setNewBank({ bankName: "CRDB", accountName: "", accountNumber: "" });
                                                    toast.success("Bank account added");
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Bank Account
                                            </Button>
                                        </div>
                                        {paymentProfile.bankAccounts.length > 0 && (
                                            <div className="space-y-2">
                                                {paymentProfile.bankAccounts.map((b, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-border text-xs">
                                                        <div>
                                                            <span className="font-bold text-secondary mr-2">[{b.bankName}]</span>
                                                            <span className="font-semibold">{b.accountNumber}</span>
                                                            <span className="text-muted-foreground ml-2">({b.accountName})</span>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                setPaymentProfile(prev => ({
                                                                    ...prev,
                                                                    bankAccounts: prev.bankAccounts.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Lipa number configurations */}
                                    <div className="space-y-4 border-b border-border pb-4">
                                        <h3 className="font-bold text-sm flex items-center gap-1.5">
                                            <DollarSign className="w-4 h-4 text-slate-400" />
                                            LIPA Numbers / QR Codes Paybill
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl items-end">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Network Provider</Label>
                                                <Select value={newLipa.provider} onValueChange={(val) => setNewLipa(prev => ({ ...prev, provider: val }))}>
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                                                        <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                                                        <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                                                        <SelectItem value="HaloPesa">HaloPesa</SelectItem>
                                                        <SelectItem value="Selcom">Selcom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Merchant Account Name</Label>
                                                <Input 
                                                    placeholder="e.g. LotusRise Logistics" 
                                                    value={newLipa.name}
                                                    onChange={(e) => setNewLipa(prev => ({ ...prev, name: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Lipa / Paybill Number</Label>
                                                <Input 
                                                    placeholder="e.g. 556677" 
                                                    value={newLipa.number}
                                                    onChange={(e) => setNewLipa(prev => ({ ...prev, number: e.target.value }))}
                                                    className="bg-white"
                                                />
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                className="md:col-span-3 mt-2"
                                                onClick={() => {
                                                    if (!newLipa.name || !newLipa.number) {
                                                        toast.error("Please fill merchant name and lipa number");
                                                        return;
                                                    }
                                                    setPaymentProfile(prev => ({
                                                        ...prev,
                                                        lipaNumbers: [...prev.lipaNumbers, newLipa]
                                                    }));
                                                    setNewLipa({ provider: "M-Pesa", name: "", number: "" });
                                                    toast.success("Lipa number config added");
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add LIPA Number
                                            </Button>
                                        </div>
                                        {paymentProfile.lipaNumbers.length > 0 && (
                                            <div className="space-y-2">
                                                {paymentProfile.lipaNumbers.map((l, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-border text-xs">
                                                        <div>
                                                            <span className="font-bold text-secondary mr-2">[{l.provider}]</span>
                                                            <span className="font-semibold">Merchant: {l.name}</span>
                                                            <span className="text-muted-foreground ml-2">Number: {l.number}</span>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                            onClick={() => {
                                                                setPaymentProfile(prev => ({
                                                                    ...prev,
                                                                    lipaNumbers: prev.lipaNumbers.filter((_, i) => i !== idx)
                                                                }));
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cash on delivery availability */}
                                    <div className="flex items-center justify-between p-4 bg-muted/35 rounded-xl border border-border/40">
                                        <div>
                                            <Label className="text-sm font-semibold">Cash Collection Available</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Toggle if you are willing to collect physical cash upon package delivery.</p>
                                        </div>
                                        <Switch 
                                            checked={paymentProfile.cashCollectionAvailable}
                                            onCheckedChange={(checked) => setPaymentProfile(prev => ({ ...prev, cashCollectionAvailable: checked }))}
                                        />
                                    </div>

                                    <Button 
                                        type="button" 
                                        variant="hero" 
                                        className="w-full mt-4" 
                                        onClick={handleSavePaymentProfile}
                                        disabled={savingProfile}
                                    >
                                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Save Direct Payment Configs
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default DashboardSettings;
