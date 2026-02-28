import {
  Package,
  Shield,
  Truck,
  Boxes,
  Camera,
  ShoppingBag,
  ArrowRight
} from "lucide-react";
import { useTranslation } from "react-i18next";

const Services = () => {
  const { t } = useTranslation();

  const services = [
    {
      icon: ShoppingBag,
      title: t("services.items.collection.title"),
      description: t("services.items.collection.description"),
      color: "bg-navy",
    },
    {
      icon: Camera,
      title: t("services.items.verification.title"),
      description: t("services.items.verification.description"),
      color: "bg-secondary",
    },
    {
      icon: Boxes,
      title: t("services.items.consolidation.title"),
      description: t("services.items.consolidation.description"),
      color: "bg-success",
    },
    {
      icon: Truck,
      title: t("services.items.express.title"),
      description: t("services.items.express.description"),
      color: "bg-navy-light",
    },
    {
      icon: Shield,
      title: t("services.items.wholesaler.title"),
      description: t("services.items.wholesaler.description"),
      color: "bg-amber-dark",
    },
    {
      icon: Package,
      title: t("services.items.logistics.title"),
      description: t("services.items.logistics.description"),
      color: "bg-navy-dark",
    },
  ];
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            {t("services.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
            {t("services.title")}
            <span className="text-gradient">{t("services.titleGradient")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("services.description")}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`group bg-card rounded-2xl p-8 border border-border hover:border-secondary/50 shadow-sm hover:shadow-2xl transition-all duration-500 hover-lift-lg animate-slide-in-bottom animate-breathe-slow relative overflow-hidden stagger-${index + 1}`}
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />

              <div className={`relative z-10 w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 group-hover:shadow-lg transition-all duration-500`}>
                <service.icon className="w-7 h-7 text-primary-foreground group-hover:animate-pulse-subtle" />
              </div>

              <h3 className="relative z-10 text-xl font-bold text-foreground mb-3 group-hover:text-secondary transition-colors duration-300">
                {service.title}
              </h3>

              <p className="relative z-10 text-muted-foreground mb-6 leading-relaxed">
                {service.description}
              </p>

              <a
                href="#contact"
                className="relative z-10 inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-amber-dark transition-all duration-300 group/link"
                aria-label={`${t("services.learnMore")} about ${service.title}`}
              >
                {t("services.learnMore")}
                <ArrowRight className="w-4 h-4 group-hover/link:translate-x-2 transition-transform duration-300" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
