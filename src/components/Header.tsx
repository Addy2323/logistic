import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, Package, Phone, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Header = () => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const navLinks = [
    { name: t("nav.services"), href: "#services" },
    { name: t("nav.howItWorks"), href: "#how-it-works" },
    { name: t("nav.whyUs"), href: "#why-us" },
    { name: "About Us", href: "/about", isLink: true },
    { name: t("nav.contact"), href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="/" className="flex items-center gap-3 group" aria-label="MHEMA EXPRESS Home">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-border flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground leading-tight">MHEMA EXPRESS</span>
              <span className="text-xs text-muted-foreground leading-tight">Logistics Co. Ltd</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.isLink ? (
                <Link
                  key={link.name}
                  to={link.href}
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                  {link.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
                </a>
              )
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <a href="tel:+255756312736" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-secondary transition-all duration-300 hover-scale-sm group">
              <Phone className="w-4 h-4 group-hover:animate-bounce-sm" />
              <span>0756 312 736</span>
            </a>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="hero" size="sm" className="hover-glow">
                  <User className="w-4 h-4" />
                  {t("nav.dashboard")}
                </Button>
              </Link>
            ) : (
              <Link to="/auth?mode=login">
                <Button variant="hero" size="sm" className="hover-glow">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.isLink ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-base font-medium text-muted-foreground hover:text-secondary hover:translate-x-1 transition-all duration-300"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-base font-medium text-muted-foreground hover:text-secondary hover:translate-x-1 transition-all duration-300"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                )
              ))}
              <div className="pt-4 flex flex-col gap-3">
                <a href="tel:+255756312736" className="flex items-center gap-2 text-base font-medium text-foreground">
                  <Phone className="w-4 h-4" />
                  <span>0756 312 736</span>
                </a>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Language</span>
                  <LanguageSwitcher />
                </div>
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button variant="hero" className="w-full">
                      <User className="w-4 h-4" />
                      {t("nav.dashboard")}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth?mode=login">
                    <Button variant="hero" className="w-full">
                      {t("nav.login")}
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
