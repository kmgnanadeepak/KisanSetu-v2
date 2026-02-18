import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Loader2,
  Leaf,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface ListingWithFarmer {
  id: string;
  farmer_id: string;
  title: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  location: string | null;
  farming_method: string | null;
  farmer_name?: string;
  avg_rating?: number;
}

const categories = ["All", "Vegetables", "Fruits", "Grains", "Pulses", "Spices", "Dairy", "Other"];

const PriceComparison = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCrop = searchParams.get("crop") || "";
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialCrop);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"price-low" | "price-high" | "rating" | "distance">("price-low");
  const [listings, setListings] = useState<ListingWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await fetchListings();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchListings = async () => {
    const { data: listingsData } = await supabase
      .from("marketplace_listings")
      .select("id, farmer_id, title, category, price, unit, quantity, location, farming_method")
      .eq("status", "active")
      .gt("quantity", 0);

    if (!listingsData) {
      setListings([]);
      return;
    }

    // Fetch farmer profiles
    const farmerIds = [...new Set(listingsData.map(l => l.farmer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", farmerIds);

    // Fetch ratings
    const { data: ratings } = await supabase
      .from("farmer_ratings")
      .select("farmer_id, rating")
      .in("farmer_id", farmerIds);

    const farmerRatings: Record<string, number[]> = {};
    ratings?.forEach(r => {
      if (!farmerRatings[r.farmer_id]) farmerRatings[r.farmer_id] = [];
      farmerRatings[r.farmer_id].push(r.rating);
    });

    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = p.full_name;
    });

    const enrichedListings = listingsData.map(listing => ({
      ...listing,
      farmer_name: profileMap[listing.farmer_id] || "Unknown Farmer",
      avg_rating: farmerRatings[listing.farmer_id]
        ? farmerRatings[listing.farmer_id].reduce((a, b) => a + b, 0) / farmerRatings[listing.farmer_id].length
        : 0,
    }));

    setListings(enrichedListings);
  };

  const filteredListings = listings
    .filter(l => {
      const matchesSearch = !searchTerm || 
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || l.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low": return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "rating": return (b.avg_rating || 0) - (a.avg_rating || 0);
        default: return 0;
      }
    });

  // Group by title for comparison
  const groupedByTitle: Record<string, ListingWithFarmer[]> = {};
  filteredListings.forEach(l => {
    const key = l.title.toLowerCase();
    if (!groupedByTitle[key]) groupedByTitle[key] = [];
    groupedByTitle[key].push(l);
  });

  const getPriceIndicator = (price: number, allPrices: number[]) => {
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    if (allPrices.length === 1) return null;
    if (price === min) return { icon: TrendingDown, label: "Lowest", color: "text-success" };
    if (price === max) return { icon: TrendingUp, label: "Highest", color: "text-destructive" };
    return null;
  };

  const addToCart = async (listing: ListingWithFarmer) => {
    if (!currentUserId) return;

    const { data: existing } = await supabase
      .from("customer_cart")
      .select("id, quantity")
      .eq("customer_id", currentUserId)
      .eq("listing_id", listing.id)
      .single();

    if (existing) {
      await supabase
        .from("customer_cart")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("customer_cart")
        .insert({ customer_id: currentUserId, listing_id: listing.id, quantity: 1 });
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
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/customer/marketplace")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Price Comparison</h1>
              <p className="text-sm text-muted-foreground">Compare prices across farmers</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search crops to compare..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Best Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grouped Comparisons */}
        {Object.keys(groupedByTitle).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No products found for comparison</p>
          </div>
        ) : (
          Object.entries(groupedByTitle).map(([title, items]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{title}</span>
                  <Badge variant="outline">{items.length} sellers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map((listing) => {
                    const priceIndicator = getPriceIndicator(listing.price, items.map(i => i.price));
                    const PriceIcon = priceIndicator?.icon;
                    
                    return (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/customer/farmer/${listing.farmer_id}`)}
                            >
                              {listing.farmer_name}
                            </span>
                            {listing.farming_method === "organic" && (
                              <Badge className="bg-success text-success-foreground text-xs">
                                <Leaf className="w-3 h-3 mr-1" />
                                Organic
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            {listing.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {listing.location}
                              </span>
                            )}
                            {listing.avg_rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-warning fill-warning" />
                                {listing.avg_rating.toFixed(1)}
                              </span>
                            )}
                            <span>Qty: {listing.quantity} {listing.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">₹{listing.price}</span>
                              <span className="text-sm text-muted-foreground">/{listing.unit}</span>
                              {priceIndicator && PriceIcon && (
                                <PriceIcon className={`w-4 h-4 ${priceIndicator.color}`} />
                              )}
                            </div>
                            {priceIndicator && (
                              <span className={`text-xs ${priceIndicator.color}`}>
                                {priceIndicator.label}
                              </span>
                            )}
                          </div>
                          <Button size="sm" onClick={() => addToCart(listing)}>
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default PriceComparison;
