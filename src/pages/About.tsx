import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import {
    Package,
    Truck,
    ShoppingBag,
    Camera,
    Users,
    MapPin,
    Phone,
    Clock,
    CheckCircle,
    Shield,
    Zap,
    Star,
    Heart,
    Target,
    Award,
    BoxIcon,
    Ship,
    ArrowRight,
    Sparkles,
    BadgeCheck,
    Timer,
    Palette,
    Scale,
    Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const About = () => {
    const navigate = useNavigate();

    // Rotating hero images
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
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const services = [
        {
            icon: ShoppingBag,
            title: "Kukusanya Oda (Order Collection)",
            description:
                "Tunakusanya oda zako kutoka maduka mbalimbali ya Kariakoo - hasa kama uko busy kazini, una dharura, au ni mara yako ya kwanza kufanya biashara na duka husika.",
            color: "bg-navy",
        },
        {
            icon: BoxIcon,
            title: "Ufungaji na Usafirishaji",
            description:
                "Tunafunga mizigo kwa umakini na usalama mkubwa. Tunatuma mizigo ndani na nje ya Dar es Salaam, Zanzibar na Visiwa kwa njia za Cargo, Mabasi na Boat.",
            color: "bg-secondary",
        },
        {
            icon: Zap,
            title: "Express / Fast Delivery",
            description:
                "Tunatoa huduma ya usafirishaji wa haraka (Express Delivery) kwa wateja wanaohitaji mizigo yao kwa muda mfupi.",
            color: "bg-success",
        },
        {
            icon: Camera,
            title: "Uhakiki wa Ubora wa Bidhaa",
            description:
                "Tunakagua bidhaa kabla ya mteja kufanya malipo. Tunakutumia picha halisi za bidhaa kwa uthibitisho - hakuna mshangao baada ya mzigo kufika!",
            color: "bg-amber-dark",
        },
        {
            icon: Users,
            title: "Huduma kwa Mawinga",
            description:
                "Mawinga wanaweza kununua bidhaa chache, kumtumia mteja moja kwa moja, kuokoa gharama za nauli, na kufanya biashara kwa uaminifu na uhakika mkubwa.",
            color: "bg-navy-light",
        },
    ];

    const whatWeProvide = [
        {
            icon: Truck,
            title: "Huduma za Logistics",
            items: [
                "Pickup ya bidhaa kutoka dukani",
                "Kuhifadhi (warehouse)",
                "Kusafirisha kwa truck / ship / bus",
                "Delivery mpaka mlangoni",
            ],
        },
        {
            icon: Zap,
            title: "Usafirishaji wa Haraka",
            items: ["Express Delivery Services"],
        },
        {
            icon: Package,
            title: "Supply Chain",
            items: ["Kununua malighafi"],
        },
        {
            icon: Ship,
            title: "Cargo Collection",
            items: ["Pickup kutoka shop, warehouse au muuzaji"],
        },
    ];

    const benefits = [
        {
            icon: Timer,
            title: "Kuokoa Muda",
            description: "Usingeweza kufika Kariakoo? Sisi tunafanya kazi hiyo kwa ajili yako!",
        },
        {
            icon: BadgeCheck,
            title: "Uhakika wa Oda",
            description: "Uhakika wa oda uliyofungiwa - tunakuhakikishia unachopata ni sahihi.",
        },
        {
            icon: Palette,
            title: "Quality, Size na Rangi",
            description: "Tunahakiki size, rangi, material na ubora kabla ya mzigo kufungwa.",
        },
        {
            icon: Scale,
            title: "Thamani Halisi",
            description: "Thamani halisi ya pesa yako - huduma za ubora kwa bei shindani.",
        },
    ];

    const challenges = [
        { icon: Clock, text: "Kukosa muda wa kufika Kariakoo" },
        { icon: MapPin, text: "Kuwa mbali (mikoani)" },
        { icon: Shield, text: "Kukosa uhakika wa uaminifu wa maduka" },
        { icon: Package, text: "Kununuliwa bidhaa zisizo sahihi (copy, size au rangi tofauti)" },
    ];

    return (
        <>
            <Helmet>
                <title>Kuhusu Sisi | MHEMA EXPRESS LOGISTICS CO. LTD</title>
                <meta
                    name="description"
                    content="MHEMA EXPRESS LOGISTICS - Kampuni ya kitaalamu inayojihusisha na kukusanya oda kutoka maduka mbalimbali na kutoa huduma ya Express Delivery ndani na nje ya Dar es Salaam."
                />
                <meta
                    name="keywords"
                    content="MHEMA EXPRESS, Kariakoo, logistics, Tanzania, Dar es Salaam, Zanzibar, delivery, shipping, cargo"
                />
            </Helmet>

            <div className="min-h-screen bg-background">
                <Header />

                {/* Hero Section - Split Layout with Full Image */}
                <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
                    {/* Left Side - Content with Navy Background */}
                    <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-navy">
                        {/* Background Effects */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl animate-pulse-subtle" />
                            <div
                                className="absolute bottom-20 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl animate-pulse-subtle"
                                style={{ animationDelay: "1s" }}
                            />
                        </div>

                        {/* Grid Pattern */}
                        <div
                            className="absolute inset-0 opacity-5"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            }}
                        />
                    </div>

                    {/* Right Side - Image Background */}
                    <div className="absolute inset-y-0 right-0 w-full lg:w-1/2 hidden lg:block">
                        <div className="relative h-full w-full overflow-hidden">
                            {heroImages.map((img, index) => (
                                <img
                                    key={img}
                                    src={img}
                                    alt={`MHEMA EXPRESS Logistics - ${img.replace('/hero-', '').replace('.png', '').replace('-', ' ')} huduma`}
                                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${index === currentImageIndex ? "opacity-100" : "opacity-0"}`}
                                />
                            ))}
                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/40 to-transparent" />
                            <div className="absolute inset-0 bg-navy/20" />

                            {/* Floating Truck Branding Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="absolute top-1/3 left-1/4 text-white/30 font-bold text-xl tracking-wider uppercase rotate-[-5deg]">
                                    DELIVERING SPEED & CERTAINTY
                                </div>
                            </div>

                            {/* Quality Badge - Right Side */}
                            <div className="absolute top-1/3 right-8 bg-success rounded-2xl px-5 py-3 shadow-lg animate-float border border-white/20" style={{ animationDelay: "2s" }}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                    <span className="text-white font-bold text-base">98% Uhakika</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Background */}
                    <div className="absolute inset-0 lg:hidden bg-navy" />

                    {/* Content Container */}
                    <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            {/* Left - Text Content */}
                            <div className="text-left max-w-xl">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground text-sm font-medium mb-6 animate-fade-in">
                                    <Sparkles className="w-4 h-4 text-secondary" />
                                    <span>Uaminifu Wetu, Fahari Yako</span>
                                </div>

                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6 animate-slide-up">
                                    MHEMA EXPRESS
                                    <span className="block text-secondary">LOGISTICS CO. LTD</span>
                                </h1>

                                <p
                                    className="text-base md:text-lg text-primary-foreground/80 mb-8 leading-relaxed animate-slide-up"
                                    style={{ animationDelay: "0.1s" }}
                                >
                                    Kampuni ya kitaalamu inayojihusisha na kukusanya oda (mizigo) kutoka maduka mbalimbali na kutoa huduma ya Express Delivery ndani na nje ya Dar es Salaam, pamoja na Zanzibar na visiwa vyake.
                                </p>

                                <div
                                    className="flex flex-col sm:flex-row gap-4 mb-10 animate-slide-up"
                                    style={{ animationDelay: "0.2s" }}
                                >
                                    <Button variant="hero" size="xl" onClick={() => navigate("/auth")} className="hover-lift hover-glow group">
                                        Anza Sasa
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    <Button
                                        variant="heroOutline"
                                        size="xl"
                                        className="hover-lift hover-scale-sm"
                                        onClick={() => document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })}
                                    >
                                        Soma Zaidi
                                    </Button>
                                </div>
                            </div>

                            {/* Right Side - Empty for image background */}
                            <div className="hidden lg:block" />
                        </div>
                    </div>

                    {/* Wave Divider */}
                    <div className="absolute bottom-0 left-0 right-0 z-20">
                        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                            <path
                                d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
                                fill="hsl(var(--background))"
                            />
                        </svg>
                    </div>
                </section>

                {/* Story Section */}
                <section id="story" className="py-20 md:py-32 bg-background">
                    <div className="container mx-auto px-4">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left - Story Content */}
                            <div className="animate-slide-in-left">
                                <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
                                    <Target className="w-4 h-4 inline mr-2" />
                                    Historia Yetu
                                </span>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
                                    Kwa Nini Tulianza
                                    <span className="block text-gradient">MHEMA EXPRESS?</span>
                                </h2>
                                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                                    Kampuni ilianzishwa baada ya kubaini changamoto kubwa kwa wateja wengi wanapojaribu
                                    kununua bidhaa kutoka Kariakoo. Tuliamua kuwa suluhisho la matatizo hayo.
                                </p>

                                <p className="text-muted-foreground mb-8 leading-relaxed">
                                    <strong className="text-foreground">Lengo letu</strong> ni kuwapa wateja uhakika,
                                    uaminifu na urahisi katika manunuzi na usafirishaji wa mizigo yao.
                                </p>
                            </div>

                            {/* Right - Challenges Cards */}
                            <div className="grid sm:grid-cols-2 gap-4 animate-slide-in-right">
                                {challenges.map((challenge, index) => (
                                    <div
                                        key={index}
                                        className={`bg-card rounded-xl p-6 border border-border hover:border-secondary/50 shadow-sm hover:shadow-2xl transition-all duration-500 hover-lift-lg group stagger-${index + 1}`}
                                    >
                                        <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-destructive/20 group-hover:scale-110 transition-all duration-500">
                                            <challenge.icon className="w-6 h-6 text-destructive" />
                                        </div>
                                        <p className="text-foreground font-medium group-hover:text-secondary transition-colors">
                                            {challenge.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="py-20 md:py-32 bg-muted/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
                                <Star className="w-4 h-4 inline mr-2" />
                                Huduma Zetu
                            </span>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
                                Tunakusaidia
                                <span className="text-gradient"> Vipi?</span>
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Huduma zote hutolewa kwa bei shindani, uaminifu wa hali ya juu na weledi mkubwa.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                            {services.map((service, index) => (
                                <div
                                    key={index}
                                    className={`group bg-card rounded-2xl p-8 border border-border hover:border-secondary/50 shadow-sm hover:shadow-2xl transition-all duration-500 hover-lift-lg animate-slide-in-bottom relative overflow-hidden stagger-${index + 1}`}
                                >
                                    {/* Shimmer overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                                    {/* Glow effect */}
                                    <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl" />

                                    <div
                                        className={`relative z-10 w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 group-hover:shadow-lg transition-all duration-500`}
                                    >
                                        <service.icon className="w-7 h-7 text-primary-foreground group-hover:animate-pulse-subtle" />
                                    </div>

                                    <h3 className="relative z-10 text-xl font-bold text-foreground mb-3 group-hover:text-secondary transition-colors duration-300">
                                        {service.title}
                                    </h3>

                                    <p className="relative z-10 text-muted-foreground leading-relaxed">{service.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* What We Provide Section */}
                <section className="py-20 md:py-32 bg-hero-gradient relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-10 w-64 h-64 bg-secondary rounded-full blur-3xl animate-pulse-subtle" />
                        <div
                            className="absolute bottom-10 left-10 w-80 h-80 bg-secondary rounded-full blur-3xl animate-pulse-subtle"
                            style={{ animationDelay: "1.5s" }}
                        />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <span className="inline-block px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-sm font-semibold text-primary-foreground mb-4">
                                <Gem className="w-4 h-4 inline mr-2" />
                                WE PROVIDE
                            </span>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-6">
                                Tunatoa
                                <span className="block text-secondary">Nini?</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {whatWeProvide.map((item, index) => (
                                <div
                                    key={index}
                                    className={`bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-all duration-500 hover-lift group stagger-${index + 1}`}
                                >
                                    <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <item.icon className="w-7 h-7 text-secondary-foreground" />
                                    </div>
                                    <h3 className="text-lg font-bold text-primary-foreground mb-4 group-hover:text-secondary transition-colors">
                                        {item.title}
                                    </h3>
                                    <ul className="space-y-2">
                                        {item.items.map((listItem, i) => (
                                            <li key={i} className="flex items-start gap-2 text-primary-foreground/80 text-sm">
                                                <CheckCircle className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                                                <span>{listItem}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20 md:py-32 bg-background relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
                                <Award className="w-4 h-4 inline mr-2" />
                                Faida ya Kufanya Kazi na Sisi
                            </span>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
                                Kwa Nini
                                <span className="text-gradient"> MHEMA EXPRESS?</span>
                            </h2>
                            <p className="text-lg text-muted-foreground">
                                Huduma zetu hutolewa kwa makubaliano ya pande zote, kwa uaminifu mkubwa na weledi wa
                                kitaalamu (professionalism).
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className={`text-center bg-card rounded-2xl p-8 border border-border hover:border-secondary/50 shadow-sm hover:shadow-2xl transition-all duration-500 hover-lift-lg group stagger-${index + 1}`}
                                >
                                    <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-secondary/30 group-hover:scale-110 transition-all duration-500">
                                        <benefit.icon className="w-8 h-8 text-secondary group-hover:animate-bounce-sm" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-secondary transition-colors">
                                        {benefit.title}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section className="py-20 md:py-32 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-12">
                                <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
                                    <Phone className="w-4 h-4 inline mr-2" />
                                    Mawasiliano
                                </span>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
                                    Wasiliana
                                    <span className="text-gradient"> Nasi</span>
                                </h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Contact Info */}
                                <div className="space-y-6">
                                    <div className="bg-card rounded-2xl p-6 border border-border hover:border-secondary/50 shadow-sm hover:shadow-lg transition-all duration-300 hover-lift group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Phone className="w-7 h-7 text-secondary-foreground" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground mb-1">Simu</div>
                                                <div className="font-bold text-foreground">0756 312 736 – Vodacom</div>
                                                <div className="font-bold text-foreground">0770 312 736 – Yas</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-card rounded-2xl p-6 border border-border hover:border-secondary/50 shadow-sm hover:shadow-lg transition-all duration-300 hover-lift group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-navy rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <MapPin className="w-7 h-7 text-primary-foreground" />
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground mb-1">Mahali Tulipo</div>
                                                <div className="font-bold text-foreground">KARIAKOO – Msimbazi A</div>
                                                <div className="text-secondary font-medium">(Big Bon Shell)</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA Card */}
                                <div className="bg-card rounded-3xl p-8 shadow-xl border border-border animate-scale-in">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-subtle">
                                            <Heart className="w-10 h-10 text-secondary" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-foreground mb-3">Karibuni Sana!</h3>
                                        <p className="text-muted-foreground mb-6">
                                            MHEMA EXPRESS LOGISTICS CO. LTD
                                            <br />
                                            <span className="text-secondary font-semibold">Uaminifu Wetu, Fahari Yako</span>
                                        </p>
                                        <Button
                                            variant="hero"
                                            size="xl"
                                            className="w-full hover-lift hover-glow"
                                            onClick={() => navigate("/auth")}
                                        >
                                            Anza Kufanya Biashara
                                            <ArrowRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </>
    );
};

export default About;
