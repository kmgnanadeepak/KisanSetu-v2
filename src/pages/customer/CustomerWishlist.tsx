import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  MapPin,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface WishlistItem {
  id: string;
  listing_id: string;
  listing: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    price: number;
    quantity: number;
    unit: string;
    location: string | null;
    status: string;
    farmer_id: string;
  };
}

const CustomerWishlist = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await fetchWishlist(session.user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchWishlist = async (userId: string) => {
    const { data, error } = await supabase
      .from("customer_wishlist")
      .select(`
        id,
        listing_id,
        listing:marketplace_listings (
          id,
          title,
          description,
          category,
          price,
          quantity,
          unit,
          location,
          status,
          farmer_id
        )
      `)
      .eq("customer_id", userId)
      .not("listing_id", "is", null);

    if (error) {
      console.error("Error fetching wishlist:", error);
      return;
    }

    // Filter out items where listing doesn't exist or is not active
    const validItems = (data || []).filter(
      item => item.listing && item.listing.status === "active"
    ) as unknown as WishlistItem[];
    
    setWishlist(validItems);
  };

  const removeFromWishlist = async (itemId: string) => {
    const { error } = await supabase
      .from("customer_wishlist")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setWishlist(prev => prev.filter(item => item.id !== itemId));
      toast.success("Removed from wishlist");
    }
  };

  const addToCart = async (item: WishlistItem) => {
    if (!currentUserId) return;

    const { data: existing } = await supabase
      .from("customer_cart")
      .select("id, quantity")
      .eq("customer_id", currentUserId)
      .eq("listing_id", item.listing_id)
      .single();

    if (existing) {
      await supabase
        .from("customer_cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("customer_cart")
        .insert({
          customer_id: currentUserId,
          listing_id: item.listing_id,
          quantity: 1,
        });
    }

    toast.success("Added to cart");
  };

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
              <h1 className="text-lg font-semibold">My Wishlist</h1>
              <p className="text-sm text-muted-foreground">{wishlist.length} items saved</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {wishlist.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Wishlist is empty</h2>
            <p className="text-muted-foreground mb-4">Save items you like for later</p>
            <Button variant="farmer" onClick={() => navigate("/customer/marketplace")}>
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlist.map((item) => (
              <Card key={item.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.listing.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.listing.category}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge className="bg-primary">
                    ₹{item.listing.price}/{item.listing.unit}
                  </Badge>

                  {item.listing.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.listing.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Available: {item.listing.quantity} {item.listing.unit}</span>
                    {item.listing.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {item.listing.location}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="farmer"
                    className="w-full"
                    onClick={() => addToCart(item)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerWishlist;
