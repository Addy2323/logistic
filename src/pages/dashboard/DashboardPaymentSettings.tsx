import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { paymentQRAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, QrCode, Upload } from "lucide-react";
import { toast } from "sonner";
import { API_HOST } from "@/config/api";

interface PaymentQRCode {
    id: string;
    provider: string;
    accountName: string;
    lipaNumber?: string;
    qrCodeUrl: string;
    createdAt: string;
}

const DashboardPaymentSettings = () => {
    const { t } = useTranslation();
    const [qrCodes, setQrCodes] = useState<PaymentQRCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [newQR, setNewQR] = useState({
        provider: "",
        accountName: "",
        lipaNumber: "",
        file: null as File | null,
        previewUrl: ""
    });

    useEffect(() => {
        fetchQRCodes();
    }, []);

    // Cleanup preview URL on unmount or when file changes
    useEffect(() => {
        return () => {
            if (newQR.previewUrl) {
                URL.revokeObjectURL(newQR.previewUrl);
            }
        };
    }, [newQR.previewUrl]);

    const fetchQRCodes = async () => {
        try {
            setLoading(true);
            const response: any = await paymentQRAPI.list();
            if (response && response.success) {
                setQrCodes(response.data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch QR codes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Revoke old preview URL if it exists
            if (newQR.previewUrl) {
                URL.revokeObjectURL(newQR.previewUrl);
            }
            setNewQR({
                ...newQR,
                file,
                previewUrl: URL.createObjectURL(file)
            });
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQR.file || !newQR.provider || !newQR.accountName) {
            toast.error("Please fill all required fields");
            return;
        }

        const formData = new FormData();
        formData.append("provider", newQR.provider);
        formData.append("accountName", newQR.accountName);
        if (newQR.lipaNumber) formData.append("lipaNumber", newQR.lipaNumber);
        formData.append("qrCode", newQR.file);

        try {
            const response: any = await paymentQRAPI.upload(formData);
            if (response && response.success) {
                toast.success("QR Code uploaded successfully");
                setIsNewOpen(false);
                setNewQR({
                    provider: "",
                    accountName: "",
                    lipaNumber: "",
                    file: null,
                    previewUrl: ""
                });
                fetchQRCodes();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to upload QR code");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this QR code?")) return;

        try {
            await paymentQRAPI.delete(id);
            toast.success("QR Code deleted successfully");
            fetchQRCodes();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete QR code");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payment Settings</h1>
                    <p className="text-muted-foreground">Manage payment QR codes and methods</p>
                </div>
                <Button variant="hero" onClick={() => setIsNewOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add QR Code
                </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Loading QR codes...
                    </div>
                ) : qrCodes.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No payment QR codes found. Add one to get started.
                    </div>
                ) : (
                    qrCodes.map((qr) => (
                        <div key={qr.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                        <QrCode className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{qr.provider.replace('_', ' ')}</h3>
                                        <p className="text-sm text-muted-foreground">{qr.accountName}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(qr.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="aspect-square bg-white rounded-lg p-4 mb-4 flex items-center justify-center border border-border/50">
                                <img
                                    src={qr.qrCodeUrl.replace('/uploads/', '/api/uploads/')}
                                    alt={`${qr.provider} QR Code`}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            {qr.lipaNumber && (
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Lipa Number / Paybill</p>
                                    <p className="font-mono font-bold text-lg">{qr.lipaNumber}</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Payment QR Code</DialogTitle>
                        <DialogDescription>
                            Upload a new payment QR code for customers to use during checkout.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Provider</label>
                            <Select
                                value={newQR.provider}
                                onValueChange={(val) => setNewQR({ ...newQR, provider: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M_PESA">M-Pesa</SelectItem>
                                    <SelectItem value="TIGO_PESA">Tigo Pesa</SelectItem>
                                    <SelectItem value="SELCOM">Selcom</SelectItem>
                                    <SelectItem value="RIPA">RIPA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Account Name</label>
                            <Input
                                placeholder="e.g. MHEMA LOGISTICS"
                                value={newQR.accountName}
                                onChange={(e) => setNewQR({ ...newQR, accountName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Lipa Number / Paybill (Optional)</label>
                            <Input
                                placeholder="e.g. 556677"
                                value={newQR.lipaNumber}
                                onChange={(e) => setNewQR({ ...newQR, lipaNumber: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">QR Code Image</label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    required
                                />
                                <div className="flex flex-col items-center gap-2">
                                    {newQR.previewUrl ? (
                                        <div className="relative w-full aspect-square max-h-[200px] flex items-center justify-center">
                                            <img
                                                src={newQR.previewUrl}
                                                alt="Preview"
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                Click to upload QR code image
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button type="submit" variant="hero" className="w-full">
                            Upload QR Code
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DashboardPaymentSettings;
