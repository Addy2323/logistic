import { Package, Phone, MapPin, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xl font-bold">MHEMA EXPRESS</div>
                <div className="text-sm text-primary-foreground/60">Logistics Co. Ltd</div>
              </div>
            </div>
            <p className="text-primary-foreground/70 mb-6 max-w-md leading-relaxed">
              {t("footer.description")}
            </p>
            <div className="flex gap-4">
              <a
                href="tel:+255756312736"
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
              >
                <Phone className="w-4 h-4" />
                0756 312 736
              </a>
              <a
                href="tel:+255770312736"
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-secondary transition-colors"
              >
                <Phone className="w-4 h-4" />
                0770 312 736
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6">{t("footer.servicesTitle")}</h4>
            <ul className="space-y-3">
              {[
                t("services.items.collection.title"),
                t("services.items.verification.title"),
                t("services.items.consolidation.title"),
                t("services.items.express.title"),
                t("services.items.wholesaler.title"),
                t("services.items.logistics.title"),
              ].map((service, index) => (
                <li key={index}>
                  <a
                    href="#services"
                    className="text-primary-foreground/70 hover:text-secondary transition-colors text-sm"
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6">{t("footer.contactTitle")}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                <span className="text-sm text-primary-foreground/70" dangerouslySetInnerHTML={{ __html: t("footer.address") }} />
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-secondary" />
                <div className="text-sm text-primary-foreground/70">
                  <div>Vodacom: 0756 312 736</div>
                  <div>Yas: 0770 312 736</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} MHEMA EXPRESS LOGISTICS CO. LTD. {t("footer.rights")}
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-primary-foreground/50 hover:text-secondary transition-colors">
              {t("footer.privacy")}
            </a>
            <a href="#" className="text-sm text-primary-foreground/50 hover:text-secondary transition-colors">
              {t("footer.terms")}
            </a>
          </div>
        </div>

        {/* Developer Attribution */}
        <div className="border-t border-primary-foreground/10 mt-6 pt-4 text-center">
          <p className="text-xs text-primary-foreground/40">
            Developed by <span className="text-primary-foreground/60 font-medium">Myamba Ado</span> —
            <a
              href="mailto:myambaado@gmail.com"
              className="ml-1 text-primary-foreground/60 hover:text-secondary transition-colors"
            >
              myambaado@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
