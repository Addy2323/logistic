import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
    MapPin,
    Home,
    Briefcase,
    Store,
    Database,
    Plus,
    Trash2,
    Loader2,
    Compass,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { addressesAPI } from "@/lib/api";
import LocationPicker from "@/components/dashboard/LocationPicker";

interface SavedAddress {
    id: string;
    name: string;
    type: 'HOME' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER';
    address: string;
    lat: number | string;
    lng: number | string;
    street?: string;
    ward?: string;
    district?: string;
    region?: string;
    country: string;
    createdAt: string;
}

const TYPE_ICONS = {
    HOME: Home,
    OFFICE: Briefcase,
    SHOP: Store,
    WAREHOUSE: Database,
    OTHER: MapPin
};

const DashboardSavedAddresses = () => {
    const { t } = useTranslation();
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: "",
        type: "HOME" as 'HOME' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'OTHER',
        address: "",
        lat: 0,
        lng: 0,
        street: "",
        ward: "",
        district: "",
        region: "",
        country: "Tanzania"
    });

    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const response: any = await addressesAPI.list();
            if (response && response.success) {
                setAddresses(response.data || []);
            } else {
                toast.error("Failed to load saved addresses");
            }
        } catch (error: any) {
            console.error("Fetch addresses failed:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleLocationSelected = (lat: number, lng: number, address: string) => {
        // Simple heuristic to extract parts of the address from Nominatim display name
        const parts = address.split(',').map(p => p.trim());
        
        let street = "";
        let ward = "";
        let district = "";
        let region = "";

        if (parts.length > 0) street = parts[0];
        if (parts.length > 1) ward = parts[1];
        if (parts.length > 2) district = parts[2];
        if (parts.length > 3) region = parts[3];

        setForm(prev => ({
            ...prev,
            lat,
            lng,
            address,
            street: prev.street || street,
            ward: prev.ward || ward,
            district: prev.district || district,
            region: prev.region || region
        }));
        
        toast.info("Map pin coordinates updated!");
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("Please provide a name for this address");
            return;
        }
        if (!form.address.trim() || form.lat === 0 || form.lng === 0) {
            toast.error("Please drop a pin on the map to choose coordinates");
            return;
        }

        try {
            setSubmitting(true);
            const response: any = await addressesAPI.create(form);
            if (response && response.success) {
                toast.success("Location saved successfully!");
                setIsOpen(false);
                setForm({
                    name: "",
                    type: "HOME",
                    address: "",
                    lat: 0,
                    lng: 0,
                    street: "",
                    ward: "",
                    district: "",
                    region: "",
                    country: "Tanzania"
                });
                fetchAddresses();
            } else {
                toast.error(response.error?.message || "Failed to save address");
            }
        } catch (error: any) {
            console.error("Add address error:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this saved location?")) {
            return;
        }
        try {
            const response: any = await addressesAPI.delete(id);
            if (response && response.success) {
                toast.success("Location deleted successfully");
                fetchAddresses();
            } else {
                toast.error(response.error?.message || "Failed to delete address");
            }
        } catch (error: any) {
            console.error("Delete address failed:", error);
            toast.error(error.message || "An error occurred");
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Saved Delivery Locations</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your frequently used delivery destinations (Home, Office, Sourcing Shop, Warehouse) with exact GPS coordinates.
                    </p>
                </div>
                <Button 
                    variant="hero" 
                    className="shadow-md hover:scale-[1.02] transition-transform duration-200"
                    onClick={() => setIsOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Address
                </Button>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 className="w-12 h-12 text-secondary animate-spin" />
                    <p className="text-muted-foreground font-medium">Loading saved locations...</p>
                </div>
            ) : addresses.length === 0 ? (
                <Card className="border border-border/85 bg-card p-12 text-center max-w-xl mx-auto shadow-sm">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold">No Saved Addresses</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        You haven't saved any locations yet. Add your home, office, or sourcing warehouse details to autofill maps instantly during checkout.
                    </p>
                    <Button variant="hero" size="sm" className="mt-6" onClick={() => setIsOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Save First Address
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {addresses.map((addr) => {
                        const Icon = TYPE_ICONS[addr.type] || MapPin;
                        return (
                            <Card key={addr.id} className="border border-border/60 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
                                <CardHeader className="flex flex-row items-start justify-between pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold capitalize">{addr.name}</CardTitle>
                                            <CardDescription className="text-[10px] uppercase font-bold tracking-wider mt-0.5 text-muted-foreground">
                                                {addr.type}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteAddress(addr.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="text-xs text-muted-foreground space-y-2.5">
                                    <p className="line-clamp-2 leading-relaxed">{addr.address}</p>
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[10px] uppercase tracking-wide">
                                        <div>
                                            <span className="font-semibold text-slate-400">Lat:</span> {Number(addr.lat).toFixed(6)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-400">Lng:</span> {Number(addr.lng).toFixed(6)}
                                        </div>
                                    </div>
                                    {(addr.street || addr.ward || addr.district || addr.region) && (
                                        <div className="pt-2 border-t border-border/40 space-y-1 text-[11px]">
                                            {addr.street && <div><span className="font-medium text-slate-400">Street:</span> {addr.street}</div>}
                                            {addr.ward && <div><span className="font-medium text-slate-400">Ward:</span> {addr.ward}</div>}
                                            {addr.district && <div><span className="font-medium text-slate-400">District:</span> {addr.district}</div>}
                                            {addr.region && <div><span className="font-medium text-slate-400">Region:</span> {addr.region}</div>}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="py-3 px-6 bg-muted/20 border-t border-border/40 flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground">Country: {addr.country}</span>
                                    <span className="text-secondary font-medium flex items-center gap-1">
                                        <Compass className="w-3.5 h-3.5" />
                                        GPS Confirmed
                                    </span>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ADD ADDRESS DIALOG */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-secondary" />
                            Save New Destination
                        </DialogTitle>
                        <DialogDescription>
                            Type in address details and drop a pin on the map to capture exact GPS coordinates.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAddress} className="space-y-4 py-2">
                        {/* Map Location Picker */}
                        <div className="space-y-1.5">
                            <Label>Drop Location Pin (Tanzania default)</Label>
                            <LocationPicker 
                                onLocationSelect={handleLocationSelected}
                                restrictToKariakoo={false}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="addrName">Address Label Name</Label>
                                <Input 
                                    id="addrName"
                                    placeholder="e.g. My Kariakoo Warehouse, Dodoma Office"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="addrType">Destination Type</Label>
                                <Select 
                                    value={form.type} 
                                    onValueChange={(val: any) => setForm(prev => ({ ...prev, type: val }))}
                                >
                                    <SelectTrigger id="addrType">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="HOME">HOME</SelectItem>
                                        <SelectItem value="OFFICE">OFFICE</SelectItem>
                                        <SelectItem value="SHOP">SHOP</SelectItem>
                                        <SelectItem value="WAREHOUSE">WAREHOUSE</SelectItem>
                                        <SelectItem value="OTHER">OTHER</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="fullAddr">Full Address Details</Label>
                            <Input 
                                id="fullAddr"
                                placeholder="Enter street address, building, or specific landmark"
                                value={form.address}
                                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="street">Street</Label>
                                <Input 
                                    id="street"
                                    value={form.street}
                                    onChange={(e) => setForm(prev => ({ ...prev, street: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="ward">Ward</Label>
                                <Input 
                                    id="ward"
                                    value={form.ward}
                                    onChange={(e) => setForm(prev => ({ ...prev, ward: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="district">District</Label>
                                <Input 
                                    id="district"
                                    value={form.district}
                                    onChange={(e) => setForm(prev => ({ ...prev, district: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="region">Region</Label>
                                <Input 
                                    id="region"
                                    value={form.region}
                                    onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg text-xs">
                            <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wide mr-1">Latitude:</span>
                                {form.lat ? form.lat.toFixed(6) : "Not selected"}
                            </div>
                            <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wide mr-1">Longitude:</span>
                                {form.lng ? form.lng.toFixed(6) : "Not selected"}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="hero" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Address
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardSavedAddresses;
