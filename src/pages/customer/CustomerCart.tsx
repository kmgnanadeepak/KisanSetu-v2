import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  listing: {
    id: string;
    farmer_id: string;
    title: string;
    price: number;
    unit: string;
    quantity: number;
    location: string | null;
  };
}

interface GroupedCart {
  farmer_id: string;
  items: CartItem[];
  total: number;
}

const CustomerCart = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [groupedCart, setGroupedCart] = useState<GroupedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await fetchCart(session.user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    groupCartByFarmer();
  }, [cartItems]);

  const fetchCart = async (userId: string) => {
    const { data, error } = await supabase
      .from("customer_cart")
      .select(`
        id,
        listing_id,
        quantity,
        listing:marketplace_listings (
          id,
          farmer_id,
          title,
          price,
          unit,
          quantity,
          location
        )
      `)
      .eq("customer_id", userId);

    if (error) {
      console.error("Error fetching cart:", error);
      return;
    }

    // Filter out items where listing doesn't exist
    const validItems = (data || []).filter(item => item.listing) as unknown as CartItem[];
    setCartItems(validItems);
  };

  const groupCartByFarmer = () => {
    const grouped: Record<string, GroupedCart> = {};

    cartItems.forEach((item) => {
      const farmerId = item.listing.farmer_id;
      if (!grouped[farmerId]) {
        grouped[farmerId] = {
          farmer_id: farmerId,
          items: [],
          total: 0,
        };
      }
      grouped[farmerId].items.push(item);
      grouped[farmerId].total += item.listing.price * item.quantity;
    });

    setGroupedCart(Object.values(grouped));
  };

  const updateQuantity = async (itemId: string, newQuantity: number, maxQuantity: number) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      toast.error(`Only ${maxQuantity} available`);
      return;
    }

    setUpdating(itemId);
    const { error } = await supabase
      .from("customer_cart")
      .update({ quantity: newQuantity })
      .eq("id", itemId);

    if (!error) {
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
    setUpdating(null);
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from("customer_cart")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      toast.success("Removed from cart");
    }
  };

  const grandTotal = groupedCart.reduce((sum, group) => sum + group.total, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/customer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">My Cart</h1>
              <p className="text-sm text-muted-foreground">{cartItems.length} items</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-4">Browse the marketplace to add items</p>
            <Button variant="farmer" onClick={() => navigate("/customer/marketplace")}>
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <>
            {/* Cart items grouped by farmer */}
            {groupedCart.map((group, idx) => (
              <Card key={group.farmer_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Seller {idx + 1}
                    </CardTitle>
                    <Badge variant="outline">₹{group.total.toFixed(2)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.listing.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.listing.price}/{item.listing.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.listing.quantity)}
                          disabled={updating === item.id || item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.listing.quantity)}
                          disabled={updating === item.id}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="w-20 text-right font-medium">
                        ₹{(item.listing.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groupedCart.map((group, idx) => (
                  <div key={group.farmer_id} className="flex justify-between text-sm">
                    <span>Seller {idx + 1} ({group.items.length} items)</span>
                    <span>₹{group.total.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  * Orders will be split by seller for individual tracking
                </p>
                <Button
                  variant="farmer"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/customer/checkout")}
                >
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerCart;
