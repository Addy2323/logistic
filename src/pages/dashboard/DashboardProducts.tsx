import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { productsAPI, agentsAPI, ordersAPI, getImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, RefreshCw, Trash2, ShoppingBag, ExternalLink, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  sourceLink?: string;
  views: number;
  clicks: number;
  createdAt: string;
  agent?: {
    user: {
      fullName: string;
    };
  };
}

export default function DashboardProducts() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";

  const [products, setProducts] = useState<Product[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    description: "",
    sourceLink: "",
    imageUrl: "",
    agentId: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState("");

  useEffect(() => {
    if (isAdmin || isAgent) {
      fetchProducts();
      if (isAdmin) {
        fetchAgents();
      }
    }
  }, [isAdmin, isAgent]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response: any = await productsAPI.list();
      if (response && response.success) {
        setProducts(response.data || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await agentsAPI.getPublicList();
      if (response.success) {
        setAgents(response.data || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch agents:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("productImages", file);

      const response: any = await ordersAPI.uploadProductImage(formData);
      if (response && response.success && response.data.productImageUrls.length > 0) {
        setNewProduct(prev => ({
          ...prev,
          imageUrl: response.data.productImageUrls[0]
        }));
        toast.success("Product image uploaded successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
      setUploadPreview("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.name || !newProduct.price) {
      toast.error("Please fill in name and price");
      return;
    }

    if (isAdmin && !newProduct.agentId) {
      toast.error("Please assign this product to an agent");
      return;
    }

    try {
      const payload = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        description: newProduct.description,
        sourceLink: newProduct.sourceLink,
        imageUrl: newProduct.imageUrl || undefined,
        agentId: isAdmin ? newProduct.agentId : undefined,
      };

      const response: any = await productsAPI.create(payload);
      if (response && response.success) {
        toast.success("Product added to catalog successfully!");
        setIsNewProductOpen(false);
        setNewProduct({
          name: "",
          price: "",
          description: "",
          sourceLink: "",
          imageUrl: "",
          agentId: "",
        });
        setUploadPreview("");
        fetchProducts();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product from the catalog?")) {
      return;
    }

    try {
      const response: any = await productsAPI.delete(id);
      if (response && response.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  if (!isAdmin && !isAgent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          Only authorized sourcing agents and administrators can manage the promoted product catalog.
        </p>
      </div>
    );
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.agent?.user.fullName && product.agent.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalog Management</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage promoted products for all agents" : "Post products and sourcing links to your profile"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="hero" onClick={() => setIsNewProductOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name, description, or agent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl p-12">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold mb-2">No Products Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Get started by adding sourcing products with images and external links to promote them to customers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="rounded-2xl border-border/80 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative">
              
              {/* Product Image */}
              <div className="h-44 bg-slate-100 dark:bg-slate-900/40 relative overflow-hidden flex items-center justify-center">
                {product.imageUrl ? (
                  <img 
                    src={getImageUrl(product.imageUrl)} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-slate-900/95 text-white font-extrabold text-xs py-1 px-2.5 rounded-full shadow">
                  TSh {product.price.toLocaleString()}
                </div>
              </div>

              <CardHeader className="p-4 flex-grow">
                <CardTitle className="text-base font-bold group-hover:text-secondary transition-colors duration-300 truncate">
                  {product.name}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-3 leading-relaxed mt-1.5 min-h-[3.3rem]">
                  {product.description || "No description provided."}
                </CardDescription>
                {isAdmin && product.agent && (
                  <div className="mt-2.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-1 rounded-lg w-fit">
                    Agent: {product.agent.user.fullName}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-0 border-t border-border/40 mt-auto bg-slate-50/30 dark:bg-slate-900/5 flex items-center justify-between gap-3">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Views: {product.views} | Clicks: {product.clicks}
                </span>

                <div className="flex items-center gap-1.5">
                  {product.sourceLink && (
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="View Sourcing Link">
                      <a href={product.sourceLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleDeleteProduct(product.id)}
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      <Dialog open={isNewProductOpen} onOpenChange={setIsNewProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product to Catalog</DialogTitle>
            <DialogDescription>
              Create a promoted product catalog listing. Customers can order this product directly from the agent profile.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            
            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Agent</label>
                <Select
                  value={newProduct.agentId}
                  onValueChange={(val) => setNewProduct({ ...newProduct, agentId: val })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.fullName} ({agent.businessName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input
                placeholder="e.g. Designer Sneakers, Silk Dress"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Price (TSh)</label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="Enter price"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sourcing/Supplier Link (Optional)</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. Alibaba, 1688, Taobao product URL"
                  value={newProduct.sourceLink}
                  onChange={(e) => setNewProduct({ ...newProduct, sourceLink: e.target.value })}
                  className="pl-10"
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">Add the sourcing url from 1688, Taobao or Alibaba for quick reference.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="Details about colors, sizes, specifications..."
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Image</label>
              <div className="flex flex-col gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                
                {uploadPreview ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border bg-slate-50 dark:bg-slate-900/20 flex items-center justify-center">
                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-contain" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Uploading image...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 opacity-30" />
                    <span>Upload a product image to display in catalog</span>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={isUploading}>
              Create Product Catalog Entry
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
