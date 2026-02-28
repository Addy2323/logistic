import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Package, Mail, Lock, User, ArrowLeft, Eye, EyeOff, ShieldCheck, Timer } from "lucide-react";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600; // 10 minutes

// ─── OTP Verification Panel ────────────────────────────────────────
const OtpPanel = ({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / OTP_EXPIRY_SECONDS) * 100;

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next box
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
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
        toast({ title: "OTP Expired", description: "Please go back and register again.", variant: "destructive" });
        return;
      }

      setIsLoading(true);
      try {
        const result = await verifyOtp(userId, otpCode);
        if (result.success) {
          toast({ title: "✅ Phone Verified!", description: "Welcome to MHEMA Express!" });
          navigate("/dashboard");
        } else {
          toast({ title: "Verification Failed", description: result.error, variant: "destructive" });
          setOtp(new Array(OTP_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [otp, timeLeft, userId, verifyOtp, navigate, toast]
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Shield icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border border-secondary/30 shadow-lg shadow-secondary/10">
          <ShieldCheck className="w-10 h-10 text-secondary" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground text-center mb-2">
        Verify Your Phone
      </h2>
      <p className="text-muted-foreground text-center mb-8 text-sm">
        We sent a 6-digit verification code via SMS.
        <br />
        Enter it below to activate your account.
      </p>

      {/* Countdown Timer */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-20 h-20 mb-2">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="currentColor"
              className="text-muted/20"
              strokeWidth="5"
            />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="currentColor"
              className={`transition-all duration-1000 ${timeLeft > 60 ? 'text-secondary' : timeLeft > 30 ? 'text-yellow-500' : 'text-red-500'}`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-0.5">
              <Timer className={`w-3 h-3 ${timeLeft <= 30 ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-mono font-bold ${timeLeft <= 30 ? 'text-red-500' : 'text-foreground'}`}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {timeLeft > 0 ? "Code expires in" : "Code has expired"}
        </span>
      </div>

      {/* OTP Input Boxes */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-8" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={isLoading || timeLeft <= 0}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-2xl font-bold
              rounded-xl border-2
              bg-background
              outline-none
              transition-all duration-200
              ${digit
                ? "border-secondary shadow-md shadow-secondary/20 scale-105"
                : "border-border hover:border-muted-foreground/50"
              }
              focus:border-secondary focus:ring-2 focus:ring-secondary/30 focus:scale-105
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        ))}
      </div>

      {/* Verify Button */}
      <Button
        variant="hero"
        size="xl"
        className="w-full mb-4"
        disabled={isLoading || otp.some((d) => !d) || timeLeft <= 0}
        onClick={() => handleSubmit()}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying…
          </span>
        ) : (
          "Verify & Continue"
        )}
      </Button>

      {/* Back link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
        >
          ← Back to sign up
        </button>
      </div>
    </div>
  );
};

// ─── Main Auth Page ────────────────────────────────────────────────
const Auth = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isLogin = mode !== "register";

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP state (only for signup)
  const [showOtpPanel, setShowOtpPanel] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleMode = () => {
    setSearchParams({ mode: isLogin ? "register" : "login" });
    setShowOtpPanel(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // ── LOGIN ── no OTP, just login directly
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast({ title: t("auth.toasts.welcome"), description: t("auth.toasts.loginSuccess") });
          navigate("/dashboard");
        } else {
          toast({ title: t("auth.toasts.loginFailed"), description: result.error, variant: "destructive" });
        }
      } else {
        // ── REGISTER ── with OTP verification
        if (!formData.name.trim()) {
          toast({ title: t("auth.toasts.nameRequired"), description: t("auth.toasts.nameRequiredDesc"), variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const phoneRegex = /^(255|7)\d{8,9}$/;
        if (!phoneRegex.test(formData.phone)) {
          toast({
            title: "Invalid Phone Number",
            description: "Phone number must start with 255 or 7 (e.g., 255712345678 or 712345678)",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const result = await register(formData.name, formData.email, formData.password, formData.phone);
        if (result.success) {
          if (result.requiresOtp && result.userId) {
            setRegisteredUserId(result.userId);
            setShowOtpPanel(true);
            toast({ title: "OTP Sent! 📲", description: "Please check your phone for the verification code." });
          } else {
            toast({ title: t("auth.toasts.accountCreated"), description: t("auth.toasts.welcomeMhema") });
            navigate("/dashboard");
          }
        } else {
          toast({ title: t("auth.toasts.regFailed"), description: result.error, variant: "destructive" });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isLogin ? "Login" : "Register"} | MHEMA EXPRESS</title>
        <meta
          name="description"
          content={
            isLogin
              ? "Login to your MHEMA EXPRESS account to manage your orders and deliveries."
              : "Create a MHEMA EXPRESS account to start shipping from Kariakoo with ease."
          }
        />
        <link rel="canonical" href={`https://mhemalogistics.co.tz/auth?mode=${isLogin ? "login" : "register"}`} />
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
                <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-2xl font-bold">MHEMA EXPRESS</div>
                <div className="text-sm text-primary-foreground/70">Logistics Co. Ltd</div>
              </div>
            </a>

            <h1 className="text-4xl font-extrabold mb-6">
              {t("auth.branding.title")}
              <span className="block text-secondary">{t("auth.branding.titleSuffix")}</span>
            </h1>

            <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">{t("auth.branding.desc")}</p>

            <div className="space-y-4">
              {(t("auth.branding.features", { returnObjects: true }) as string[]).map((feature, i) => (
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

        {/* Right Panel */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {!showOtpPanel && (
              <a href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                {t("auth.backToHome")}
              </a>
            )}

            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">MHEMA EXPRESS</div>
                <div className="text-xs text-muted-foreground">Logistics Co. Ltd</div>
              </div>
            </div>

            {/* ─── OTP Panel (signup only) ─── */}
            {showOtpPanel && registeredUserId ? (
              <OtpPanel
                userId={registeredUserId}
                onBack={() => {
                  setShowOtpPanel(false);
                  setRegisteredUserId(null);
                }}
              />
            ) : (
              /* ─── Login / Register Form ─── */
              <div className="animate-in fade-in duration-300">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {isLogin ? t("auth.loginDesc") : t("auth.registerDesc")}
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("auth.fullName")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder={t("auth.fullNamePlaceholder")}
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-10 h-12"
                        />
                      </div>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (255... or 7...)</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground font-bold text-xs">
                          +
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="255712345678 or 712345678"
                          value={formData.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            if (val.startsWith("0")) return;
                            setFormData({ ...formData, phone: val });
                          }}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Format: 2557XXXXXXXX or 7XXXXXXXX (No leading 0)</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t("auth.emailPlaceholder")}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t("auth.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 pr-10 h-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
                    {isLoading ? t("auth.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.signUp")}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-muted-foreground">
                    {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                    <button type="button" onClick={toggleMode} className="text-secondary font-semibold hover:underline">
                      {isLogin ? t("auth.signUp") : t("auth.signIn")}
                    </button>
                  </p>
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
