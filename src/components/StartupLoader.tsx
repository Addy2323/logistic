import { Package } from "lucide-react";

const StartupLoader = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-subtle" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] animate-pulse-subtle" style={{ animationDelay: "1s" }} />

            <div className="relative flex flex-col items-center gap-12 animate-scale-in">
                <div className="cube-container">
                    <div className="cube">
                        <div className="cube-face cube-face-front">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                        <div className="cube-face cube-face-back">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                        <div className="cube-face cube-face-right">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                        <div className="cube-face cube-face-left">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                        <div className="cube-face cube-face-top">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                        <div className="cube-face cube-face-bottom">
                            <img src="/logo.png" alt="Logo" className="cube-logo" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground tracking-tight">MHEMA</span>
                        <span className="text-2xl font-bold text-secondary tracking-tight">EXPRESS</span>
                    </div>
                    <div className="h-1 w-48 bg-muted rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-accent-gradient animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] animate-fade-in" style={{ animationDelay: "0.5s" }}>
                        Logistics Co. Ltd
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StartupLoader;
