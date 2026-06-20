import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Phone, ArrowLeft, ShieldCheck, Timer, Smartphone, LogIn, RefreshCw } from "lucide-react";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN = 60; // 60 seconds

// ─── Step 2: OTP Verification Panel (For Signups Only) ────────
const OtpPanel = ({
  phone,
  onBack,
}: {
  phone: string;
  onBack: () => void;
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const { toast } = useToast();

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / OTP_EXPIRY_SECONDS) * 100;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === OTP_LENGTH) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    const newOtp = [...otp];
    for (let i = 0; i < text.length; i++) {
      newOtp[i] = text[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(text.length, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();

    if (newOtp.every((d) => d !== "") && newOtp.join("").length === OTP_LENGTH) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleSubmit = useCallback(
    async (code?: string) => {
      const otpCode = code || otp.join("");
      if (otpCode.length !== OTP_LENGTH) {
        toast({ title: "Invalid OTP", description: "Please enter all 6 digits.", variant: "destructive" });
        return;
      }
      if (timeLeft <= 0) {
        toast({ title: "OTP Expired", description: "Please resend a new code.", variant: "destructive" });
        return;
      }

      setIsLoading(true);
      try {
        const result = await verifyOtp(phone, otpCode);
        if (result.success) {
          toast({ title: "✅ Welcome!", description: "Account created successfully!" });
          navigate(redirectPath);
        } else {
          toast({ title: "Verification Failed", description: result.error, variant: "destructive" });
          setOtp(new Array(OTP_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [otp, timeLeft, phone, verifyOtp, navigate, toast]
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const result = await resendOtp(phone);
      if (result.success) {
        toast({ title: "📲 OTP Resent!", description: "A new code has been sent to your phone." });
        setTimeLeft(OTP_EXPIRY_SECONDS);
        setResendCooldown(RESEND_COOLDOWN);
        setOtp(new Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        toast({ title: "Resend Failed", description: result.error, variant: "destructive" });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/30 shadow-lg shadow-secondary/10">
          <ShieldCheck className="w-10 h-10 text-secondary" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        Verify Your Phone
      </h2>
      <p className="text-muted-foreground text-center mb-2 text-sm">
        We sent a 6-digit code to
      </p>
      <p className="text-center mb-6 font-semibold text-foreground text-lg tracking-wider">
        +{phone}
      </p>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-20 h-20 mb-2">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="currentColor"
              className={`transition-all duration-1000 ${timeLeft > 120 ? 'text-secondary' : timeLeft > 60 ? 'text-yellow-500' : 'text-red-500'}`}
              strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-0.5">
              <Timer className={`w-3 h-3 ${timeLeft <= 60 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-mono font-bold ${timeLeft <= 60 ? 'text-red-500' : 'text-foreground'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {timeLeft > 0 ? "Code expires in" : "Code has expired"}
        </span>
      </div>

      <div className="flex justify-center gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isLoading || timeLeft <= 0}
            className={`
              w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 bg-background outline-none transition-all duration-200
              ${digit ? "border-secondary shadow-md shadow-secondary/20 scale-105" : "border-border hover:border-muted-foreground/50"}
              focus:border-secondary focus:ring-2 focus:ring-secondary/30 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        ))}
      </div>

      <Button variant="hero" size="xl" className="w-full mb-4" disabled={isLoading || otp.some((d) => !d) || timeLeft <= 0} onClick={() => handleSubmit()}>
        {isLoading ? (
          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</span>
        ) : (
          <span className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Verify & Sign In</span>
        )}
      </Button>

      <div className="text-center mb-4">
        {resendCooldown > 0 ? (
          <p className="text-sm text-muted-foreground">Resend code in <span className="font-mono font-semibold text-foreground">{resendCooldown}s</span></p>
        ) : (
          <button type="button" onClick={handleResend} disabled={isResending} className="text-sm text-secondary hover:text-secondary/80 font-semibold transition-colors flex items-center gap-1.5 mx-auto">
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? "Sending…" : "Resend Code"}
          </button>
        )}
      </div>

      <div className="text-center">
        <button type="button" onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto">
          <ArrowLeft className="w-3.5 h-3.5" /> Change phone number
        </button>
      </div>
    </div>
  );
};

// ─── Main Auth Page ─────────────────────────────────────────────
const Auth = () => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { loginOrSignup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^(255|0?7)\d{8,9}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Enter a valid Tanzanian number (e.g., 255712345678 or 0712345678)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('0')) cleaned = '255' + cleaned.substring(1);
      else if (cleaned.length === 9) cleaned = '255' + cleaned;
      setNormalizedPhone(cleaned);

      const result = await loginOrSignup(cleaned);
      if (result.success) {
        if (result.action === 'login') {
          toast({ title: "✅ Welcome back!", description: "You're now signed in instantly to LotusRise Logistics!" });
          navigate(redirectPath);
        } else if (result.action === 'require_otp') {
          toast({ title: "New Account", description: "You are new here! We've sent a code via SMS to verify your number." });
          setStep("otp");
        }
      } else {
        toast({ title: "Login Failed", description: result.error, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In | LotusRise Logistics</title>
        <meta name="description" content="Sign in to LotusRise Logistics with your phone number. Instant access — start shipping instantly." />
        <link rel="canonical" href="https://lotusriselogistics.com/auth" />
      </Helmet>

      <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row overflow-y-auto">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
            <a href="/" className="flex items-center gap-3 mb-12">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg">
                <img src="/logo.png" alt="LotusRise Logistics Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-2xl font-bold">LotusRise Logistics</div>
                <div className="text-sm text-primary-foreground/70">Co. Ltd</div>
              </div>
            </a>

            <h1 className="text-4xl font-extrabold mb-6">
              Kariakoo to
              <span className="block text-secondary">Your Doorstep</span>
            </h1>

            <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">
              The fastest way to ship goods from Kariakoo market. Express login for returning users, and simple phone validation for new users.
            </p>

            <div className="space-y-4">
              {[
                "Instant login for returning users",
                "Secure signing up for new users",
                "Direct access to your dashboard",
                "Track your deliveries in real-time",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="w-4 h-4 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-primary-foreground/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Auth Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {step === "phone" && (
              <a href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to home
              </a>
            )}

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="LotusRise Logistics Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">LotusRise Logistics</div>
                <div className="text-xs text-muted-foreground">Co. Ltd</div>
              </div>
            </div>

            {step === "otp" ? (
              <OtpPanel phone={normalizedPhone} onBack={() => setStep("phone")} />
            ) : (
              <div className="animate-in fade-in duration-300">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/30 shadow-lg shadow-secondary/10">
                    <Smartphone className="w-10 h-10 text-secondary" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                  Welcome to LotusRise Logistics
                </h2>
                <p className="text-muted-foreground text-center mb-8 text-sm">
                  Enter your phone number to continue. New users will be asked to verify their number.
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium border-r border-border pr-2">+255</span>
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="712 345 678"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPhone(val);
                        }}
                        className="pl-24 h-14 text-lg tracking-wider"
                        required
                        autoFocus
                        autoComplete="tel"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter your number without the country code (e.g., 712345678)
                    </p>
                  </div>

                  <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading || phone.replace(/\D/g, '').length < 9}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" /> Continue
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Direct Login Enabled</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        If you already have an account, you will securely log in immediately. Otherwise, you'll be shown an OTP panel to create a new account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
