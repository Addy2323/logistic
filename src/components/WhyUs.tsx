import { Shield, Eye, Banknote, Users, Clock, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const WhyUs = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Clock,
      title: t("whyUs.items.time.title"),
      description: t("whyUs.items.time.description"),
    },
    {
      icon: Shield,
      title: t("whyUs.items.assurance.title"),
      description: t("whyUs.items.assurance.description"),
    },
    {
      icon: Eye,
      title: t("whyUs.items.quality.title"),
      description: t("whyUs.items.quality.description"),
    },
    {
      icon: Banknote,
      title: t("whyUs.items.value.title"),
      description: t("whyUs.items.value.description"),
    },
    {
      icon: Users,
      title: t("whyUs.items.professional.title"),
      description: t("whyUs.items.professional.description"),
    },
    {
      icon: Heart,
      title: t("whyUs.items.partner.title"),
      description: t("whyUs.items.partner.description"),
    },
  ];
  return (
    <section id="why-us" className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
              {t("whyUs.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
              {t("whyUs.title")}
              <span className="block text-gradient">{t("whyUs.titleGradient")}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t("whyUs.description")}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: "98%", label: t("whyUs.stats.accuracy") },
                { value: "2hrs", label: t("whyUs.stats.verification") },
                { value: "0", label: t("whyUs.stats.scams") },
              ].map((stat, index) => (
                <div
                  key={index}
                  className={`text-center group cursor-default animate-zoom-in hover-pulse stagger-${index + 1}`}
                >
                  <div className="text-2xl md:text-3xl font-extrabold text-secondary mb-1 group-hover:scale-125 transition-transform duration-500">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Features Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-card rounded-xl p-6 border border-border hover:border-secondary/50 shadow-sm hover:shadow-2xl transition-all duration-500 hover-lift-lg hover-tilt animate-flip-in animate-breathe group stagger-${index + 1}`}
              >
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/30 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-secondary group-hover:animate-swing" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-secondary transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
