import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { transportAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Truck, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface TransportMethod {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    pricePerKm?: number;
    pricePerKg?: number;
    isActive: boolean;
}

const DashboardTransportSettings = () => {
    const { t } = useTranslation();
    const [methods, setMethods] = useState<TransportMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        basePrice: "",
        pricePerKm: "",
        pricePerKg: ""
    });

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        try {
            setLoading(true);
            const response: any = await transportAPI.list();
            if (response && response.success) {
                setMethods(response.data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch transport methods:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                basePrice: parseFloat(formData.basePrice),
                pricePerKm: formData.pricePerKm ? parseFloat(formData.pricePerKm) : undefined,
                pricePerKg: formData.pricePerKg ? parseFloat(formData.pricePerKg) : undefined
            };

            if (editingId) {
                await transportAPI.update(editingId, payload);
                toast.success("Transport method updated");
            } else {
                await transportAPI.create(payload);
                toast.success("Transport method created");
            }

            setIsNewOpen(false);
            setEditingId(null);
            setFormData({
                name: "",
                description: "",
                basePrice: "",
                pricePerKm: "",
                pricePerKg: ""
            });
            fetchMethods();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        }
    };

    const handleEdit = (method: TransportMethod) => {
        setEditingId(method.id);
        setFormData({
            name: method.name,
            description: method.description || "",
            basePrice: method.basePrice.toString(),
            pricePerKm: method.pricePerKm?.toString() || "",
            pricePerKg: method.pricePerKg?.toString() || ""
        });
        setIsNewOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this transport method?")) return;
        try {
            await transportAPI.delete(id);
            toast.success("Transport method deleted");
            fetchMethods();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Transport Settings</h1>
                    <p className="text-muted-foreground">Manage transportation methods and pricing</p>
                </div>
                <Button variant="hero" onClick={() => {
                    setEditingId(null);
                    setFormData({ name: "", description: "", basePrice: "", pricePerKm: "", pricePerKg: "" });
                    setIsNewOpen(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Method
                </Button>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : methods.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No transport methods found.</div>
                ) : (
                    methods.map((method) => (
                        <div key={method.id} className="bg-card rounded-xl border border-border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{method.name}</h3>
                                    <p className="text-muted-foreground text-sm mb-2">{method.description}</p>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                        <span className="bg-muted px-2 py-1 rounded-md">
                                            Base: TZS {Number(method.basePrice).toLocaleString()}
                                        </span>
                                        {method.pricePerKm && (
                                            <span className="bg-muted px-2 py-1 rounded-md">
                                                + TZS {Number(method.pricePerKm).toLocaleString()} / km
                                            </span>
                                        )}
                                        {method.pricePerKg && (
                                            <span className="bg-muted px-2 py-1 rounded-md">
                                                + TZS {Number(method.pricePerKg).toLocaleString()} / kg
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(method)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(method.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Transport Method" : "Add Transport Method"}</DialogTitle>
                        <DialogDescription>
                            Configure transportation methods and their pricing rules.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Method Name</label>
                            <Input
                                placeholder="e.g. Bodaboda Express"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Short description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Base Price (TZS)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.basePrice}
                                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Price per KM (Optional)</label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={formData.pricePerKm}
                                    onChange={(e) => setFormData({ ...formData, pricePerKm: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Price per KG (Optional)</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formData.pricePerKg}
                                onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                            />
                        </div>
                        <Button type="submit" variant="hero" className="w-full">
                            {editingId ? "Update Method" : "Create Method"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardTransportSettings;
