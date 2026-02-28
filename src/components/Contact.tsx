import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, MessageCircle, LogIn, UserPlus, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    Swal.fire({
      title: t("contact.alerts.whatsapp.title"),
      text: t("contact.alerts.whatsapp.text"),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t("contact.alerts.whatsapp.confirm"),
      cancelButtonText: t("contact.alerts.whatsapp.cancel"),
      confirmButtonColor: '#25D366',
    }).then((result) => {
      if (result.isConfirmed) {
        window.open('https://wa.me/255756312736', '_blank');
      }
    });
  };

  const handleCall = () => {
    Swal.fire({
      title: t("contact.alerts.call.title"),
      text: t("contact.alerts.call.text"),
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: t("contact.alerts.call.confirm"),
      cancelButtonText: t("contact.alerts.call.cancel"),
      confirmButtonColor: 'hsl(var(--secondary))',
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = 'tel:+255756312736';
      }
    });
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-hero-gradient relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-secondary rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Contact Info */}
          <div className="text-primary-foreground animate-reveal">
            <span className="inline-block px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm font-semibold mb-4">
              {t("contact.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6">
              {t("contact.title")}
              <span className="block text-secondary">{t("contact.titleGradient")}</span>
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-md">
              {t("contact.description")}
            </p>

            {/* Contact Cards */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 hover-lift">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-sm text-primary-foreground/70">{t("contact.items.phone.label")}</div>
                  <div className="text-lg font-bold">0756 312 736 / 0770 312 736</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 hover-lift">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm text-primary-foreground/70">{t("contact.items.location.label")}</div>
                  <div className="text-lg font-bold">{t("contact.items.location.address")}</div>
                  <div className="flex items-center gap-2 text-sm text-secondary font-medium mt-1">
                    {t("contact.items.location.welcome")} <Heart className="w-4 h-4 fill-secondary" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 hover-lift">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm text-primary-foreground/70">{t("contact.items.hours.label")}</div>
                  <div className="text-lg font-bold">{t("contact.items.hours.value")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right - CTA Card */}
          <div className="bg-card rounded-3xl p-8 md:p-10 shadow-lg animate-scale-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
                <LogIn className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {t("contact.cta.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("contact.cta.description")}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                variant="hero"
                size="xl"
                className="w-full hover-lift"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="w-5 h-5" />
                {t("contact.cta.login")}
              </Button>

              <Button
                variant="outline"
                size="xl"
                className="w-full hover-lift"
                onClick={() => navigate("/auth")}
              >
                <UserPlus className="w-5 h-5" />
                {t("contact.cta.register")}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t("contact.cta.help")} <button onClick={handleWhatsApp} className="font-semibold text-secondary hover:underline" aria-label="Chat with us on WhatsApp">{t("contact.cta.chat")}</button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
