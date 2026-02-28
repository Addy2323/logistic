import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Send,
    Users,
    History,
    CheckCircle2,
    AlertCircle,
    Smartphone,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";

interface SmsLog {
    id: string;
    phone: string;
    message: string;
    status: string;
    error?: string;
    createdAt: string;
}

const DashboardSMS = () => {
    const { t } = useTranslation();
    const [message, setMessage] = useState("");
    const [targetGroup, setTargetGroup] = useState("agents");
    const [isSending, setIsSending] = useState(false);
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [status, setStatus] = useState<{ configured: boolean; enabled: boolean } | null>(null);

    useEffect(() => {
        fetchLogs();
        fetchStatus();
    }, []);

    const fetchLogs = async () => {
        try {
            setIsLoadingLogs(true);
            const response: any = await api.get("/sms/logs?limit=10");
            if (response && response.success) {
                setLogs(response.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch SMS logs:", error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const response: any = await api.get("/sms/status");
            if (response && response.success) {
                setStatus(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch SMS status:", error);
        }
    };

    const handleSendBulk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error("Please enter a message");
            return;
        }

        try {
            setIsSending(true);
            const response: any = await api.post("/sms/bulk", {
                targetGroup,
                message
            });

            if (response && response.success) {
                toast.success(`SMS broadcast sent to ${response.data.sent} recipients!`);
                setMessage("");
                fetchLogs();
            } else {
                toast.error(response.error?.message || "Failed to send SMS broadcast");
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred while sending SMS");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">SMS Broadcast</h1>
                    <p className="text-muted-foreground">
                        Send bulk SMS notifications to your agents and customers.
                    </p>
                </div>
                {status && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${status.enabled ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}>
                        {status.enabled ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        SMS Service: {status.enabled ? "Active" : "Disabled/Unconfigured"}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Send Form */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="w-5 h-5 text-secondary" />
                            New Broadcast
                        </CardTitle>
                        <CardDescription>
                            Compose a message and select the target audience.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendBulk} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Target Audience</label>
                                <Select value={targetGroup} onValueChange={setTargetGroup}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="agents">All Agents</SelectItem>
                                        <SelectItem value="customers">All Customers</SelectItem>
                                        <SelectItem value="all">Everyone (Agents & Customers)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Message</label>
                                    <span className={`text-[10px] ${message.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                                        {message.length} / 160 characters (1 SMS)
                                    </span>
                                </div>
                                <Textarea
                                    placeholder="Enter your message here..."
                                    className="min-h-[120px] resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={480}
                                    required
                                />
                                <p className="text-[10px] text-muted-foreground italic">
                                    Note: Messages longer than 160 characters may be split into multiple SMS.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                variant="hero"
                                className="w-full"
                                disabled={isSending || !status?.enabled}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending Broadcast...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Broadcast
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Quick Stats / Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="w-4 h-4 text-secondary" />
                                Audience Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Provider</span>
                                <span className="font-medium">BRIQ Tanzania</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Sender ID</span>
                                <span className="font-medium">BRIQ</span>
                            </div>
                            <div className="pt-2 border-t border-border">
                                <p className="text-[10px] text-muted-foreground">
                                    Bulk SMS allows you to reach all your users instantly. Use this for system updates, holiday greetings, or promotional alerts.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-secondary" />
                                Formatting Tip
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Ensure all users have their phone numbers in the correct format (255... or 7...) to receive these messages.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Logs */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5 text-secondary" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>
                                The last 10 SMS messages sent through the system.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoadingLogs}>
                            {isLoadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="pb-3 font-medium text-muted-foreground">Recipient</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Message</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {isLoadingLogs ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                                Loading logs...
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                                No SMS activity found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 font-medium">{log.phone}</td>
                                                <td className="py-3 text-muted-foreground max-w-xs truncate">
                                                    {log.message}
                                                </td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === "SENT"
                                                        ? "bg-success/10 text-success"
                                                        : log.status === "FAILED"
                                                            ? "bg-destructive/10 text-destructive"
                                                            : "bg-muted text-muted-foreground"
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-muted-foreground">
                                                    {format(!isNaN(new Date(log.createdAt).getTime()) ? new Date(log.createdAt) : new Date(), "MMM d, HH:mm")}
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
        </div>
    );
};

export default DashboardSMS;
