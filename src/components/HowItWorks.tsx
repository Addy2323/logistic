import { ClipboardList, Camera, CreditCard, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      number: "01",
      icon: ClipboardList,
      title: t("howItWorks.steps.submit.title"),
      description: t("howItWorks.steps.submit.description"),
    },
    {
      number: "02",
      icon: Camera,
      title: t("howItWorks.steps.verify.title"),
      description: t("howItWorks.steps.verify.description"),
    },
    {
      number: "03",
      icon: CreditCard,
      title: t("howItWorks.steps.approve.title"),
      description: t("howItWorks.steps.approve.description"),
    },
    {
      number: "04",
      icon: Truck,
      title: t("howItWorks.steps.delivery.title"),
      description: t("howItWorks.steps.delivery.description"),
    },
  ];
  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-muted/50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {t("howItWorks.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
            {t("howItWorks.title")}
            <span className="text-gradient">{t("howItWorks.titleGradient")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("howItWorks.description")}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-secondary via-primary to-secondary" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative text-center group animate-slide-up stagger-${index + 1}`}
              >
                {/* Step Number Circle */}
                <div className="relative z-10 w-20 h-20 mx-auto mb-6 rounded-full bg-hero-gradient flex items-center justify-center shadow-lg hover:shadow-glow group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 hover-bounce">
                  <step.icon className="w-8 h-8 text-primary-foreground group-hover:animate-swing" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-sm font-bold text-secondary-foreground shadow-md animate-bounce-in group-hover:scale-125 transition-transform">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-secondary transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
