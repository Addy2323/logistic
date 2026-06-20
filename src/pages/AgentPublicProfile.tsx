import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  MapPin, 
  Star, 
  Award, 
  Users, 
  ShoppingBag, 
  Phone, 
  MessageSquare, 
  ArrowLeft,
  CheckCircle,
  Clock,
  ThumbsUp,
  Heart,
  ExternalLink,
  MessageCircle,
  BadgeCheck
} from "lucide-react";
import { agentsAPI, getImageUrl, productsAPI } from "@/lib/api";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ProfileProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl?: string;
  views: number;
  clicks: number;
}

interface ProfileReview {
  id: string;
  customerName: string;
  customerAvatar?: string;
  overallScore: number;
  comment: string;
  createdAt: string;
}

interface AgentDetails {
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
  isFollowing: boolean;
  phone?: string;
  products: ProfileProduct[];
  reviews: ProfileReview[];
}

export default function AgentPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchAgentDetails();
    }
  }, [id]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);
      const response = await agentsAPI.getPublicProfile(id!);
      if (response.success) {
        const updatedAgent = { ...response.data };
        if (updatedAgent.products && updatedAgent.products.length > 0) {
          updatedAgent.products = updatedAgent.products.map((p: ProfileProduct) => {
            productsAPI.trackView(p.slug).catch(err => {
              console.error("Failed to track view for product:", p.slug, err);
            });
            return {
              ...p,
              views: p.views + 1
            };
          });
        }
        setAgent(updatedAgent);
        setIsFollowing(updatedAgent.isFollowing);
        setFollowersCount(updatedAgent.followersCount);
      }
    } catch (err: any) {
      toast({
        title: "Error loading profile",
        description: err.message || "Failed to load agent profile details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow agents and receive updates.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    try {
      const response = await agentsAPI.toggleFollow(agent!.id);
      if (response.success) {
        setIsFollowing(response.data.isFollowing);
        setFollowersCount(prev => response.data.isFollowing ? prev + 1 : prev - 1);
        toast({
          title: response.data.isFollowing ? "Following agent" : "Unfollowed agent",
          description: response.data.isFollowing 
            ? `You are now following ${agent!.fullName}` 
            : `You unfollowed ${agent!.fullName}`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message || "Could not toggle follow status",
        variant: "destructive"
      });
    }
  };

  const handleOrderClick = (product: ProfileProduct) => {
    if (!agent) return;

    // Track product click in backend
    productsAPI.trackClick(product.slug).catch(err => {
      console.error("Failed to track product click:", err);
    });

    // Locally increment click count in state
    setAgent(prev => {
      if (!prev || !prev.products) return prev;
      return {
        ...prev,
        products: prev.products.map(p => 
          p.id === product.id ? { ...p, clicks: p.clicks + 1 } : p
        )
      };
    });

    const orderParams = new URLSearchParams({
      action: "new",
      agentId: agent.id,
      productId: product.id,
      productName: product.name,
      productPrice: product.price.toString(),
      productImage: product.imageUrl || "",
      productDesc: product.description || ""
    }).toString();

    const targetPath = `/dashboard/orders?${orderParams}`;

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to order products directly from this agent.",
      });
      navigate(`/auth?redirect=${encodeURIComponent(targetPath)}`);
    } else {
      navigate(targetPath);
    }
  };

  const getBoutiqueBadge = (level: string) => {
    switch (level) {
      case "PLATINUM":
        return (
          <Badge className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-none py-1.5 px-4 shadow-md flex items-center gap-1.5 font-bold animate-pulse-subtle">
            <Award className="w-4 h-4" /> Platinum Boutique Partner
          </Badge>
        );
      case "GOLD":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-none py-1.5 px-4 shadow-md flex items-center gap-1.5 font-bold">
            <Award className="w-4 h-4" /> Gold Verified Boutique
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-gradient-to-r from-slate-400 to-slate-600 text-white border-none py-1.5 px-3 shadow-md flex items-center gap-1.5 font-semibold">
            <Award className="w-4 h-4" /> Silver Verified Boutique
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground font-semibold">Loading agent profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive font-bold">Agent Not Found</CardTitle>
              <CardDescription>
                The requested sourcing agent profile does not exist or has been deactivated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-secondary text-white hover:bg-secondary/90">
                <Link to="/">Return to Homepage</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/20 flex flex-col">
      <Header />
      
      {/* Top Banner Cover */}
      <div className="h-48 md:h-64 w-full bg-gradient-to-r from-navy via-navy-light to-secondary/80 relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="container mx-auto px-4 h-full flex items-end">
          <Link 
            to="/" 
            className="absolute top-6 left-6 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Agents
          </Link>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="container mx-auto px-4 -mt-16 md:-mt-24 mb-20 flex-grow relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Agent Bio & Card */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="rounded-3xl border-border/80 shadow-xl overflow-hidden backdrop-blur-md bg-opacity-95">
              <CardContent className="pt-8 flex flex-col items-center text-center">
                
                {/* Profile Avatar */}
                <div className="relative mb-6">
                  {agent.avatarUrl ? (
                    <img 
                      src={getImageUrl(agent.avatarUrl)} 
                      alt={agent.fullName} 
                      className="w-32 h-32 rounded-3xl object-cover border-4 border-card shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-secondary to-primary/80 flex items-center justify-center text-white text-4xl font-bold border-4 border-card shadow-lg">
                      {agent.fullName.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-card ${
                    agent.availabilityStatus === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                </div>

                {/* Identity */}
                <h1 className="text-2xl font-extrabold text-foreground mb-1 flex items-center justify-center gap-1.5">
                  {agent.fullName}
                  {agent.boutiqueLevel !== 'NONE' && (
                    <VerifiedBadge size={24} className="shrink-0" />
                  )}
                </h1>
                <p className="text-sm font-semibold text-secondary mb-3">{agent.businessName}</p>
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-6">
                  <MapPin className="w-4 h-4 text-secondary" /> {agent.district}, {agent.region}
                </div>

                {/* Boutique badge */}
                {agent.boutiqueLevel !== 'NONE' && (
                  <div className="mb-6">
                    {getBoutiqueBadge(agent.boutiqueLevel)}
                  </div>
                )}

                {/* Follow & Action buttons */}
                <div className="flex gap-3 w-full mb-6">
                  <Button 
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "outline" : "default"}
                    className={`flex-1 font-bold h-11 rounded-xl shadow-sm transition-all ${
                      isFollowing 
                        ? "border-pink-500 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/20" 
                        : "bg-pink-500 hover:bg-pink-600 text-white"
                    }`}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFollowing ? "fill-pink-500 text-pink-500" : ""}`} />
                    {isFollowing ? "Following" : "Follow Agent"}
                  </Button>
                </div>

                {/* Contact information details */}
                <div className="w-full border-t border-border/60 pt-6 space-y-4 text-left">
                  <h3 className="text-sm font-bold text-foreground mb-3">Direct Contact</h3>
                  
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">WhatsApp Sourcing</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold h-8 rounded-lg">
                      <a 
                        href={(() => {
                          const phoneNum = agent.phone || '255768828247';
                          let cleaned = phoneNum.replace(/\D/g, '');
                          if (cleaned.startsWith('0')) {
                            cleaned = '255' + cleaned.substring(1);
                          }
                          return `https://wa.me/${cleaned}?text=Hello%20${encodeURIComponent(agent.fullName)},%20I%20saw%20your%20sourcing%20profile%20on%20LotusRise.`;
                        })()}
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Message
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Call Inquiry</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-bold h-8 rounded-lg">
                      <a href={(() => {
                        const phoneNum = agent.phone || '255768828247';
                        let cleaned = phoneNum.trim();
                        if (!cleaned.startsWith('+') && !cleaned.startsWith('tel:')) {
                          if (cleaned.startsWith('0')) {
                            cleaned = '+255' + cleaned.substring(1);
                          } else if (cleaned.startsWith('255')) {
                            cleaned = '+' + cleaned;
                          }
                        }
                        return `tel:${cleaned}`;
                      })()}>
                        Call
                      </a>
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Sourcing Stats card */}
            <Card className="rounded-3xl border-border/80 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Agent Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Sourcing Success Rate
                  </span>
                  <span className="font-bold text-foreground">{agent.successRate}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" /> Avg. Response Speed
                  </span>
                  <span className="font-bold text-foreground">{agent.responseRate}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-indigo-500" /> Completion Rate
                  </span>
                  <span className="font-bold text-foreground">{agent.completionRate}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-pink-500" /> Completed Orders
                  </span>
                  <span className="font-bold text-foreground">{agent.totalDeliveries} deliveries</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Bio & Products Showcase */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bio Card */}
            <Card className="rounded-3xl border-border/80 shadow-md p-8">
              <h2 className="text-xl font-bold text-foreground mb-4">About Sourcing Agent</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                {agent.bio}
              </p>
            </Card>

            {/* Performance Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-2xl border-border/80 shadow-sm text-center p-4">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400 mx-auto mb-2" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overall Rating</span>
                <p className="text-2xl font-extrabold text-foreground mt-1">{agent.rating.toFixed(1)} / 5.0</p>
              </Card>

              <Card className="rounded-2xl border-border/80 shadow-sm text-center p-4">
                <Users className="w-6 h-6 text-pink-500 mx-auto mb-2" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Followers</span>
                <p className="text-2xl font-extrabold text-foreground mt-1">{followersCount}</p>
              </Card>

              <Card className="rounded-2xl border-border/80 shadow-sm text-center p-4">
                <ShoppingBag className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active Catalog</span>
                <p className="text-2xl font-extrabold text-foreground mt-1">{agent.products.length} Items</p>
              </Card>

              <Card className="rounded-2xl border-border/80 shadow-sm text-center p-4">
                <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-2 font-bold text-xs">%</div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Commission Rate</span>
                <p className="text-2xl font-extrabold text-foreground mt-1">{agent.commissionRate}%</p>
              </Card>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-border">
              <button 
                onClick={() => setActiveTab('products')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'products' 
                    ? 'border-secondary text-secondary font-extrabold' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Promoted Products ({agent.products.length})
              </button>
              <button 
                onClick={() => setActiveTab('reviews')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'reviews' 
                    ? 'border-secondary text-secondary font-extrabold' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Customer Reviews ({agent.reviews.length})
              </button>
            </div>

            {/* Tabs Contents */}
            {activeTab === 'products' ? (
              agent.products.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl p-12">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">No Promoted Products</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    This agent hasn't uploaded any products to their public catalog yet. Check back later!
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {agent.products.map((product) => (
                    <Card key={product.id} className="rounded-2xl border-border/60 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                      
                      {/* Product Image */}
                      <div className="h-48 bg-slate-100 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={getImageUrl(product.imageUrl)} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400">
                            <ShoppingBag className="w-10 h-10" />
                          </div>
                        )}
                        
                        {/* Price Badge */}
                        <div className="absolute top-4 right-4 bg-slate-900/90 text-white font-extrabold text-xs py-1.5 px-3 rounded-full shadow">
                          TSh {product.price.toLocaleString()}
                        </div>
                      </div>

                      <CardHeader className="p-5 flex-grow">
                        <CardTitle className="text-lg font-bold group-hover:text-secondary transition-colors duration-300">
                          {product.name}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-3 leading-relaxed mt-2">
                          {product.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 border-t border-border/40 mt-auto bg-slate-50/30 dark:bg-slate-900/5 flex items-center justify-between gap-4">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                          Views: {product.views} | Clicks: {product.clicks}
                        </span>

                        <Button 
                          onClick={() => handleOrderClick(product)}
                          size="sm" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Place Order
                        </Button>
                      </CardContent>

                    </Card>
                  ))}
                </div>
              )
            ) : (
              /* Reviews tab list */
              agent.reviews.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl p-12">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    This agent hasn't received any review ratings from customers yet. Placing an order will allow you to leave a rating.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {agent.reviews.map((review) => (
                    <Card key={review.id} className="rounded-2xl border-border/80 shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            {review.customerAvatar ? (
                              <img 
                                src={getImageUrl(review.customerAvatar)} 
                                alt={review.customerName} 
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                                {review.customerName[0]}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{review.customerName}</h4>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {review.overallScore.toFixed(1)}
                          </div>
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed">
                          "{review.comment}"
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}

          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
