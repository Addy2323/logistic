import React, { useRef, useState } from "react";
import { format } from "date-fns";
import { Printer, X, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReceiptProps {
    order: any;
    onClose: () => void;
    autoDownload?: boolean;
}

const Receipt: React.FC<ReceiptProps> = ({ order, onClose, autoDownload = false }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const hasDownloadedRef = useRef(false);

    // Helper to replace spaces with spans having explicit margin to force spacing in PDF
    // Using inline-block on words ensures margins are respected by html2canvas
    const fixSpacing = (text: string) => {
        if (!text) return null;
        return text.split(' ').map((word, i, arr) => (
            <span key={i} style={{ display: 'inline-block', marginRight: i < arr.length - 1 ? '5px' : '0' }}>
                {word}
            </span>
        ));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        if (!receiptRef.current || isDownloading) return;

        try {
            setIsDownloading(true);

            // Create a clone of the receipt content to capture
            // This avoids issues with scrolling, sticky headers, and mobile viewports
            const element = receiptRef.current;
            const clone = element.cloneNode(true) as HTMLElement;

            // Style the clone to ensure full visibility and correct dimensions
            // We force a standard width to ensure the PDF looks good (like desktop) even on mobile
            clone.style.position = 'fixed';
            clone.style.top = '-10000px';
            clone.style.left = '-10000px';
            clone.style.width = '800px'; // Force desktop width for better PDF layout
            // Force height to include footer with extra buffer
            clone.style.height = (element.scrollHeight + 50) + 'px';
            clone.style.overflow = 'visible';
            clone.style.zIndex = '-1000';
            clone.style.background = 'white'; // Ensure background is white

            // Fix text rendering issues in PDF
            clone.style.fontFamily = 'Arial, Helvetica, sans-serif';
            clone.style.letterSpacing = '0.2px'; // Default to 0.2px to prevent merging
            clone.style.fontVariantLigatures = 'none';

            // Apply font fix to all children recursively
            const allElements = clone.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
                const el = allElements[i] as HTMLElement;
                el.style.fontFamily = 'Arial, Helvetica, sans-serif';

                // Targeted fixes for specific sections
                if (el.classList.contains('delivery-header')) {
                    el.style.letterSpacing = '0px'; // Fix "D elivery" split ONLY here
                } else if (el.classList.contains('order-ref-text')) {
                    el.style.letterSpacing = '3px'; // Fix Order Reference overlap
                } else {
                    el.style.letterSpacing = '0.2px'; // Prevent merging elsewhere
                }

                el.style.wordSpacing = '5px';
                el.style.fontVariantLigatures = 'none';

                // Remove tailwind tracking classes that might interfere
                el.classList.remove('tracking-tighter', 'tracking-tight', 'tracking-widest', 'tracking-wide', 'tracking-[0.2em]');
            }

            // Append to body so html2canvas can render it
            document.body.appendChild(clone);

            try {
                const canvas = await html2canvas(clone, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                    windowWidth: 800, // Match the forced width
                    height: element.scrollHeight + 50, // Explicitly set capture height
                    windowHeight: element.scrollHeight + 50, // Explicitly set window height
                    onclone: (clonedDoc) => {
                        // Additional safety check to ensure styles are applied
                        const clonedElement = clonedDoc.body.lastChild as HTMLElement;
                        if (clonedElement) {
                            clonedElement.style.fontFamily = 'Arial, Helvetica, sans-serif';
                            clonedElement.style.letterSpacing = '0.2px';
                            clonedElement.style.wordSpacing = '5px';
                        }
                    }
                });

                const imgData = canvas.toDataURL("image/png");

                // Calculate PDF dimensions to match the image aspect ratio
                // We use A4 width (210mm) as the base, but allow height to vary
                const pdfWidth = 210;
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4",
                });

                const imgProps = pdf.getImageProperties(imgData);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                // Re-initialize PDF with dynamic height if content is taller than A4
                const finalPdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: [pdfWidth, pdfHeight], // Dynamic height to prevent cutoff
                });

                finalPdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                finalPdf.save(`Receipt-${order.orderNumber}.pdf`);

                if (autoDownload) {
                    onClose();
                }
            } finally {
                // Always remove the clone
                document.body.removeChild(clone);
            }
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsDownloading(false);
        }
    };

    // Auto-download effect
    React.useEffect(() => {
        if (autoDownload && !hasDownloadedRef.current && receiptRef.current) {
            hasDownloadedRef.current = true;
            // Small delay to ensure render
            setTimeout(() => {
                handleDownloadPDF();
            }, 500);
        }
    }, [autoDownload]);

    const ReceiptContent = () => (
        <div ref={receiptRef} id="receipt-content" className="p-6 sm:p-16 pb-40 bg-white text-slate-900 print:p-0 rounded-b-none sm:rounded-b-3xl relative z-10 w-[800px] sm:w-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 mb-12 border-b-2 border-slate-100 pb-10">
                <div className="text-center sm:text-left space-y-2">
                    <div className="h-20 w-20 mx-auto sm:mx-0 mb-4 rounded-md overflow-hidden border-2 border-slate-100 shadow-sm flex items-center justify-center bg-white">
                        <img src="/logo.png" alt="Mhema Express" className="h-full w-full object-cover" />
                    </div>
                    <div className="text-sm font-bold text-emerald-700 uppercase tracking-widest">{fixSpacing("MHEMA EXPRESS LOGISTICS")}</div>
                    <div className="text-xs text-slate-500 max-w-[250px]">
                        {fixSpacing("Kariakoo, Dar es Salaam, Tanzania")}<br />
                        +255&nbsp;700&nbsp;000&nbsp;000 | info@mhemaexpress.com<br />
                        www.mhemaexpress.com
                    </div>
                </div>
                <div className="text-center sm:text-right space-y-1">
                    <div className="text-4xl font-black text-secondary tracking-tighter">RECEIPT</div>
                    <div className="text-sm font-bold text-slate-400">#{order.orderNumber}</div>
                    <div className="flex justify-center sm:justify-end mt-2">
                        <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {order.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-12">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{fixSpacing("Proof of Delivery Note")}</h1>
                <div className="w-20 h-1.5 bg-secondary mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{fixSpacing("Delivery Date")}</h4>
                        <p className="text-lg font-bold text-slate-800">
                            {fixSpacing(format(new Date(order.completedAt || order.updatedAt || new Date()), "MMMM d, yyyy"))}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{fixSpacing("Sender Details")}</h4>
                        <p className="font-bold text-slate-800">{fixSpacing("MHEMA EXPRESS LOGISTICS")}</p>
                        <p className="text-sm text-slate-500">{fixSpacing("Kariakoo, Dar es Salaam")}</p>
                        <p className="text-sm text-slate-500">+255&nbsp;700&nbsp;000&nbsp;000</p>
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{fixSpacing("Recipient Details")}</h4>
                        <p className="font-bold text-slate-800">{fixSpacing(order.customer.fullName)}</p>
                        <p className="text-sm text-slate-500">{order.customer.email}</p>
                        <p className="text-sm text-slate-500">{fixSpacing(order.deliveryAddress)}</p>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{fixSpacing("Order Reference")}</h4>
                        {/* Added order-ref-text class for targeted letter-spacing in PDF generation */}
                        <p className="font-mono font-bold text-secondary tracking-widest order-ref-text">{order.orderNumber}</p>
                    </div>
                </div>
            </div>

            {/* Delivery Details Table */}
            <div className="mb-12 overflow-x-auto">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 delivery-header">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    Delivery&nbsp;Details
                </h3>
                <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm min-w-[600px] sm:min-w-0">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">{fixSpacing("Item Description")}</th>
                                <th className="text-center p-4 font-bold text-xs text-slate-500 uppercase tracking-wider w-24">Qty</th>
                                <th className="text-center p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="text-right p-4 font-bold text-xs text-slate-500 uppercase tracking-wider">{fixSpacing("Delivered By")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.description || "Package Delivery").split('\n').filter((item: string) => item.trim() !== "").map((item: string, index: number) => (
                                <tr key={index} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                                    <td className="p-4 font-bold text-slate-800">{fixSpacing(item)}</td>
                                    <td className="p-4 text-center text-slate-600 font-medium">1</td>
                                    <td className="p-4 text-center text-slate-600 font-medium">
                                        {fixSpacing(format(new Date(order.completedAt || order.updatedAt || new Date()), "MMM d, yyyy"))}
                                    </td>
                                    <td className="p-4 text-right font-bold text-secondary">{fixSpacing(order.agent?.user?.fullName || "Mhema Agent")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="mb-12">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 delivery-header">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    Pricing&nbsp;Breakdown&nbsp;({order.orderType?.replace('TYPE_', 'Type ') || 'Type A'})
                </h3>
                <div className="bg-slate-50 rounded-2xl p-6 space-y-3 border border-slate-100">
                    {order.productPrice > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{fixSpacing("Product Price")}</span>
                            <span className="font-bold text-slate-800">TSh {order.productPrice.toLocaleString()}</span>
                        </div>
                    )}
                    {order.agentMargin > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{fixSpacing("Agent Margin")}</span>
                            <span className="font-bold text-slate-800">TSh {order.agentMargin.toLocaleString()}</span>
                        </div>
                    )}
                    {order.pickupFee > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{fixSpacing("Pickup Fee")}</span>
                            <span className="font-bold text-slate-800">TSh {order.pickupFee.toLocaleString()}</span>
                        </div>
                    )}
                    {order.packingFee > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{fixSpacing("Packing Fee")}</span>
                            <span className="font-bold text-slate-800">TSh {order.packingFee.toLocaleString()}</span>
                        </div>
                    )}
                    {order.transportFee > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">{fixSpacing("Transport Fee")}</span>
                            <span className="font-bold text-slate-800">TSh {order.transportFee.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-center">
                        <span className="text-base font-black text-slate-800 uppercase tracking-wider">{fixSpacing("Total Amount")}</span>
                        <span className="text-2xl font-black text-secondary">
                            TSh {(order.totalAmount || order.actualCost || 0).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Signature & Confirmation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                <div className="space-y-8">
                    <div className="space-y-4">
                        {/* Added delivery-header class for targeted 0px letter-spacing */}
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 delivery-header">
                            <div className="w-2 h-2 rounded-full bg-secondary"></div>
                            Delivery&nbsp;Confirmation
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            This note serves as confirmation that the above items were delivered to <span className="font-bold text-slate-700">{fixSpacing(order.customer.fullName)}</span> on{" "}
                            <span className="font-bold text-slate-700">{fixSpacing(format(new Date(order.completedAt || order.updatedAt || new Date()), "MMMM d, yyyy"))}</span>, at the address of{" "}
                            <span className="font-bold text-slate-700">{fixSpacing(order.deliveryAddress)}</span>. The recipient has received and acknowledged the delivery.
                        </p>
                    </div>

                    {/* Authorized Signature removed to match screenshot */}
                </div>

                <div className="space-y-4 text-center md:text-right">
                    <div className="flex flex-col items-center md:items-end gap-8">
                        {/* Customer Signature */}
                        <div className="text-center md:text-right w-full">
                            <div className="inline-block border-b-2 border-slate-200 w-full max-w-[200px] py-4">
                                <span className="font-serif italic text-3xl text-slate-400 opacity-50 select-none">Signature</span>
                            </div>
                            <p className="font-bold text-slate-800 mt-2">{fixSpacing(order.customer.fullName)}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{fixSpacing("Customer Signature")}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">{fixSpacing("THANK YOU FOR CHOOSING MHEMA EXPRESS LOGISTICS")}</p>
                <div className="flex justify-center gap-6 items-center">
                    <a href="https://mhemaexpress.com" className="text-xs font-bold text-secondary hover:underline">mhemaexpress.com</a>
                    <span className="text-slate-200">|</span>
                    <span className="text-xs font-bold text-slate-400">{fixSpacing("Trusted Delivery Partner")}</span>
                </div>
            </div>
        </div>
    );

    // If auto-downloading, render invisible container
    if (autoDownload) {
        return (
            <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', visibility: 'hidden' }}>
                <ReceiptContent />
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm print:static print:bg-white print:p-0 print:overflow-visible"
            onClick={onClose}
        >
            <div className="flex min-h-full items-center justify-center p-4 print:block print:p-0 print:h-auto">
                {/* Modal Card */}
                <div
                    className="relative w-full max-w-4xl bg-card rounded-none sm:rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300 print:shadow-none print:border-0 print:w-full print:max-w-none print:rounded-none"
                    onClick={(e) => e.stopPropagation()}
                >

                    {/* Actions Header - Sticky at top of modal */}
                    <div className="sticky top-0 p-4 sm:p-6 border-b border-border flex flex-wrap justify-between items-center gap-4 bg-card/95 backdrop-blur-md z-[100] shrink-0 print:hidden rounded-t-none sm:rounded-t-3xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6 text-secondary" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold truncate">Order Receipt</h2>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.orderNumber}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-3 items-center ml-auto relative z-[101]">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadPDF}
                                disabled={isDownloading}
                                className="rounded-full px-3 sm:px-5 hover:bg-secondary hover:text-white transition-all duration-300 h-9 sm:h-10 cursor-pointer relative z-[102]"
                            >
                                {isDownloading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                <span className="hidden xs:inline">{isDownloading ? "Generating..." : "Download PDF"}</span>
                                <span className="xs:hidden">{isDownloading ? "" : "PDF"}</span>
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handlePrint}
                                className="rounded-full px-3 sm:px-5 shadow-lg shadow-secondary/20 transition-all duration-300 hover:scale-105 h-9 sm:h-10 cursor-pointer relative z-[102]"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                <span className="hidden xs:inline">Print</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors h-9 w-9 sm:h-10 sm:w-10 cursor-pointer relative z-[102]"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Receipt Content */}
                    <ReceiptContent />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}} />
        </div>
    );
};

export default Receipt;
