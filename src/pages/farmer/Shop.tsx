import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Search, Package, ShoppingCart, Plus, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

const Shop = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .gt("quantity", 0)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOrder = async () => {
    if (!selectedProduct) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please login to place an order");
      return;
    }

    if (orderQuantity > selectedProduct.quantity) {
      toast.error("Quantity exceeds available stock");
      return;
    }

    setOrdering(true);

    const totalPrice = selectedProduct.price * orderQuantity;

    const { error } = await supabase.from("orders").insert({
      farmer_id: session.user.id,
      merchant_id: selectedProduct.merchant_id,
      product_id: selectedProduct.id,
      quantity: orderQuantity,
      total_price: totalPrice,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to place order");
    } else {
      toast.success("Order placed successfully!");
      setSelectedProduct(null);
      setOrderQuantity(1);
    }

    setOrdering(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Shop Products</h1>
            <p className="text-sm text-muted-foreground">Browse agricultural supplies</p>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="container mx-auto px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      <main className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Products will appear here when merchants add them"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      {product.category && (
                        <Badge variant="secondary" className="mt-1">{product.category}</Badge>
                      )}
                    </div>
                    <Badge className={product.quantity > 10 ? "bg-primary" : "bg-destructive"}>
                      {product.quantity} {product.unit}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      ₹{product.price}
                      <span className="text-sm font-normal text-muted-foreground">/{product.unit}</span>
                    </span>
                    <Button size="sm" variant="farmer">
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Order Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>
              Order {selectedProduct?.name} from merchant
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedProduct.name}</h4>
                <p className="text-sm text-muted-foreground">
                  ₹{selectedProduct.price} per {selectedProduct.unit}
                </p>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedProduct.quantity} {selectedProduct.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Quantity ({selectedProduct.unit})</Label>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setOrderQuantity(Math.max(1, orderQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={selectedProduct.quantity}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(Math.min(selectedProduct.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setOrderQuantity(Math.min(selectedProduct.quantity, orderQuantity + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">
                    ₹{(selectedProduct.price * orderQuantity).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Cancel
            </Button>
            <Button 
              variant="farmer" 
              onClick={handleOrder}
              disabled={ordering}
            >
              {ordering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Placing Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shop;
