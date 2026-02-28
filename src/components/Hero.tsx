import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Truck, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState("");
  const fullText = t("hero.typingText");

  useEffect(() => {
    let i = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      setTypedText(fullText.substring(0, i));

      if (!isDeleting && i < fullText.length) {
        i++;
        timer = setTimeout(handleTyping, 100);
      } else if (isDeleting && i > 0) {
        i--;
        timer = setTimeout(handleTyping, 50);
      } else {
        isDeleting = !isDeleting;
        timer = setTimeout(handleTyping, 1500); // Pause at ends
      }
    };

    handleTyping();
    return () => clearTimeout(timer);
  }, []);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = [
    "/hero-premium.png",
    "/hero-warehouse.png",
    "/hero-delivery.png",
    "/hero-cargo.png",
    "/hero-verification.png"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 pt-24 pb-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-sm font-medium mb-6 animate-fade-in">
              <Shield className="w-4 h-4" />
              <span>{t("hero.badge")}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6 animate-slide-up">
              {t("hero.title")}
              <span className="block text-secondary">{t("hero.subtitle")}</span>
            </h1>

            <div className="h-8 mb-6">
              <p className="text-xl md:text-2xl font-bold text-secondary/90">
                {typedText}<span className="animate-pulse">|</span>
              </p>
            </div>

            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {t("hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="hero" size="xl" onClick={handleGetStarted} className="hover-lift hover-glow group">
                {t("hero.getStarted")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="heroOutline" size="xl" className="hover-lift hover-scale-sm" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                {t("hero.learnMore")}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {[
                { icon: CheckCircle, text: t("hero.badges.quality") },
                { icon: Truck, text: t("hero.badges.express") },
                { icon: Shield, text: t("hero.badges.secure") },
              ].map((badge, index) => (
                <div key={index} className="flex items-center gap-2 text-primary-foreground/70 hover:text-secondary transition-colors cursor-default group">
                  <badge.icon className="w-5 h-5 text-secondary group-hover:animate-bounce-sm" />
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Image Container */}
          <div className="relative hidden lg:block animate-reveal">
            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-primary-foreground/10 group hover-scale-sm transition-all duration-500">
              {heroImages.map((img, index) => (
                <img
                  key={img}
                  src={img}
                  alt={`MHEMA EXPRESS Logistics - ${img.replace('/hero-', '').replace('.png', '').replace('-', ' ')} service`}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 ${index === currentImageIndex ? "opacity-100" : "opacity-0"
                    }`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
            </div>

            {/* Floating Element */}
            <div className="absolute -bottom-8 -left-8 bg-secondary rounded-2xl p-6 shadow-glow animate-float border border-white/20 hover:shadow-[0_0_60px_hsl(35_95%_55%_/_0.4)] transition-shadow duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-secondary-foreground/10 flex items-center justify-center">
                  <Truck className="w-8 h-8 text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-lg font-bold text-secondary-foreground">{t("hero.floating.title")}</div>
                  <div className="text-sm text-secondary-foreground/70">{t("hero.floating.subtitle")}</div>
                </div>
              </div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute -bottom-8 left-64 bg-card/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-border animate-slide-up whitespace-nowrap">
              <div className="text-3xl font-extrabold text-secondary mb-1 text-center">{t("hero.stats.value")}</div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("hero.stats.label")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
