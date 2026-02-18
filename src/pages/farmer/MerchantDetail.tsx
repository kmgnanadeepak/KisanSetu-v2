import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft, MapPin, Loader2, Package, Store, ShoppingCart, Phone, Plus, Minus, Search,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  quantity: number;
  unit: string;
}

interface MerchantInfo {
  full_name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  avatar_url: string | null;
}

const MerchantDetail = () => {
  const navigate = useNavigate();
  const { merchantId } = useParams<{ merchantId: string }>();
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (merchantId) fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/"); return; }

    const [profileRes, productsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, city, state, address, phone, avatar_url").eq("user_id", merchantId!).maybeSingle(),
      supabase.from("products").select("*").eq("merchant_id", merchantId!).gt("quantity", 0).order("created_at", { ascending: false }),
    ]);

    setMerchant(profileRes.data as MerchantInfo | null);
    setProducts(productsRes.data || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOrder = async () => {
    if (!selectedProduct) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please login"); return; }
    if (orderQuantity > selectedProduct.quantity) { toast.error("Exceeds stock"); return; }

    setOrdering(true);
    const { error } = await supabase.from("orders").insert({
      farmer_id: session.user.id,
      merchant_id: selectedProduct.merchant_id,
      product_id: selectedProduct.id,
      quantity: orderQuantity,
      total_price: selectedProduct.price * orderQuantity,
      status: "pending",
    });

    if (error) { toast.error("Failed to place order"); }
    else { toast.success("Order placed!"); setSelectedProduct(null); setOrderQuantity(1); }
    setOrdering(false);
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer/merchant-marketplace")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Merchant Details</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Merchant Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-accent/30">
                {merchant?.avatar_url ? <AvatarImage src={merchant.avatar_url} alt={merchant.full_name} /> : null}
                <AvatarFallback className="text-xl bg-accent/10 text-accent font-bold">
                  {merchant ? getInitials(merchant.full_name) : <Store className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{merchant?.full_name || "Unknown Merchant"}</h2>
                {(merchant?.city || merchant?.state) && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {[merchant?.address, merchant?.city, merchant?.state].filter(Boolean).join(", ")}
                  </p>
                )}
                {merchant?.phone && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="w-4 h-4" /> {merchant.phone}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary"><Package className="w-3 h-3 mr-1" />{products.length} items</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Products */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">No products found</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <Card key={product.id} className="cursor-pointer group hover:border-accent/50 transition-colors" onClick={() => setSelectedProduct(product)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.category && <Badge variant="secondary" className="mt-1">{product.category}</Badge>}
                    </div>
                    <Badge className={product.quantity > 10 ? "bg-primary" : "bg-destructive"}>
                      {product.quantity} {product.unit}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {product.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">₹{product.price}<span className="text-sm font-normal text-muted-foreground">/{product.unit}</span></span>
                    <Button size="sm" variant="farmer"><ShoppingCart className="w-4 h-4 mr-1" />Order</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>Order {selectedProduct?.name} from {merchant?.full_name}</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedProduct.name}</h4>
                <p className="text-sm text-muted-foreground">₹{selectedProduct.price} per {selectedProduct.unit}</p>
                <p className="text-sm text-muted-foreground">Available: {selectedProduct.quantity} {selectedProduct.unit}</p>
              </div>
              <div className="space-y-2">
                <Label>Quantity ({selectedProduct.unit})</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}><Minus className="w-4 h-4" /></Button>
                  <Input type="number" min="1" max={selectedProduct.quantity} value={orderQuantity} onChange={(e) => setOrderQuantity(Math.min(selectedProduct.quantity, Math.max(1, parseInt(e.target.value) || 1)))} className="w-20 text-center" />
                  <Button variant="outline" size="icon" onClick={() => setOrderQuantity(Math.min(selectedProduct.quantity, orderQuantity + 1))}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{(selectedProduct.price * orderQuantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>Cancel</Button>
            <Button variant="farmer" onClick={handleOrder} disabled={ordering}>
              {ordering ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Placing...</> : <><ShoppingCart className="w-4 h-4 mr-2" />Place Order</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantDetail;
