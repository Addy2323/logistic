import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  MapPin, 
  Star, 
  Award, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Percent, 
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { agentsAPI, getImageUrl } from "@/lib/api";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PublicAgent {
  id: string;
  fullName: string;
  avatarUrl?: string;
  bio: string;
  region: string;
  district: string;
  businessName: string;
  rating: number;
  commissionRate: number;
  totalDeliveries: number;
  successRate: number;
  responseRate: number;
  completionRate: number;
  followersCount: number;
  boutiqueLevel: 'PLATINUM' | 'GOLD' | 'SILVER' | 'NONE';
  availabilityStatus: 'ONLINE' | 'OFFLINE';
  productsCount: number;
}

export default function AgentsShowcase() {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      // Fetch only the top 6 best performing agents of the week
      const response = await agentsAPI.getPublicList({ limit: 6 });
      if (response.success) {
        setAgents(response.data);
      }
    } catch (err: any) {
      toast({
        title: "Error loading agents",
        description: err.message || "Failed to load top agents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBoutiqueBadge = (level: string) => {
    switch (level) {
      case "PLATINUM":
        return (
          <Badge className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-none shadow-md flex items-center gap-1 font-bold animate-pulse-subtle">
            <Award className="w-3.5 h-3.5" /> Platinum Boutique
          </Badge>
        );
      case "GOLD":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-none shadow-md flex items-center gap-1 font-bold">
            <Award className="w-3.5 h-3.5" /> Gold Boutique
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-gradient-to-r from-slate-400 to-slate-600 text-white border-none shadow-md flex items-center gap-1 font-semibold">
            <Award className="w-3.5 h-3.5" /> Silver Boutique
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <section id="agents" className="py-20 md:py-32 bg-slate-50 dark:bg-slate-900/40 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            Agents of the Week
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-6">
            Top Performing Sourcing
            <span className="text-gradient"> &amp; Logistics Agents</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Meet this week's highest-rated, verified sourcing experts in Kariakoo. Browse their rates, followers, and catalogs directly.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl h-[400px] animate-pulse relative overflow-hidden">
                <div className="h-48 bg-slate-200 dark:bg-slate-800" />
                <div className="p-6 space-y-4">
                  <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-3xl p-12 max-w-md mx-auto shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-2">No Verified Agents Active</h3>
            <p className="text-muted-foreground">
              Please check back later as verified agents are updated weekly.
            </p>
          </div>
        ) : (
          <>
            {/* Agents Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group bg-card rounded-3xl border border-border/80 hover:border-secondary/60 shadow-lg hover:shadow-2xl transition-all duration-500 hover-lift-lg relative overflow-hidden flex flex-col h-full"
                >
                  {/* Availability status glow band */}
                  <div className={`h-1.5 w-full ${agent.availabilityStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                  {/* Card Top / Header info */}
                  <div className="p-6 md:p-8 flex-grow">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      {/* Avatar or Initials */}
                      <div className="relative">
                        {agent.avatarUrl ? (
                          <img
                            src={getImageUrl(agent.avatarUrl)}
                            alt={agent.fullName}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-border shadow-sm group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary/80 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                            {agent.fullName.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        
                        {/* Availability status badge */}
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                          agent.availabilityStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`} />
                      </div>

                      {/* Boutique verification level */}
                      <div className="flex flex-col items-end">
                        {getBoutiqueBadge(agent.boutiqueLevel)}
                        <div className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-secondary" />
                          {agent.district}, {agent.region}
                        </div>
                      </div>
                    </div>

                    {/* Agent identity */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-secondary transition-colors duration-300 flex items-center gap-1.5">
                        {agent.fullName}
                        {agent.boutiqueLevel !== 'NONE' && (
                          <VerifiedBadge size={20} className="shrink-0" />
                        )}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground">
                        {agent.businessName}
                      </p>
                    </div>

                    {/* Rating & Rates Bar */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/50 border border-border/40 mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Rating</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {agent.rating ? agent.rating.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col border-l border-border/40 pl-3">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-0.5">
                          <Percent className="w-3 h-3" /> Commission
                        </span>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                          {agent.commissionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Bio Description */}
                    <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed mb-6">
                      {agent.bio}
                    </p>

                    {/* Bottom metrics & counts */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span>{agent.successRate}% Success</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span>{agent.followersCount} Followers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4 text-pink-500" />
                        <span>{agent.productsCount} Products</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer View Profile link button */}
                  <div className="p-6 pt-0 mt-auto border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/10">
                    <Button asChild className="w-full bg-gradient-to-r from-secondary to-amber-500 hover:from-secondary hover:to-amber-600 text-white font-bold h-11 rounded-xl shadow-md group/btn transition-all duration-300">
                      <Link to={`/agent/${agent.id}`} className="flex items-center justify-center gap-2">
                        View Profile &amp; Shop Products
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* View More Redirect Button */}
            <div className="text-center">
              <Button asChild size="lg" className="bg-navy hover:bg-navy-dark text-white font-extrabold px-8 py-6 rounded-2xl shadow-xl transition-all duration-300 hover-lift group">
                <Link to="/agents" className="flex items-center gap-2 text-base">
                  View More Sourcing Agents
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
