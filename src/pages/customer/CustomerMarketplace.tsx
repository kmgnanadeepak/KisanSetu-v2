import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
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
  ShoppingCart,
  Loader2,
  Star,
  Package,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface FarmerCard {
  farmer_id: string;
  full_name: string;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  crop_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_rating: number;
  total_reviews: number;
  categories: string[];
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

const categories = ["All", "Vegetables", "Fruits", "Grains", "Pulses", "Spices", "Dairy", "Other"];

const CustomerMarketplace = () => {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState<FarmerCard[]>([]);
  const [filtered, setFiltered] = useState<FarmerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPossiblePrice, setMaxPossiblePrice] = useState(1000);
  const [showFilters, setShowFilters] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      // Try to get customer location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setCustomerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {} // silently fail
        );
      }

      await fetchFarmers();
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    filterAndSort();
  }, [farmers, searchTerm, sortBy, categoryFilter, priceRange, customerLocation]);

  const fetchFarmers = async () => {
    // Get all active listings
    const { data: listings } = await supabase
      .from("marketplace_listings")
      .select("farmer_id, title, category, price, unit, quantity, latitude, longitude")
      .eq("status", "active");

    if (!listings || listings.length === 0) { setFarmers([]); return; }

    // Group by farmer
    const farmerMap = new Map<string, { prices: number[]; categories: Set<string>; count: number; lat: number | null; lng: number | null }>();
    for (const l of listings) {
      if (!farmerMap.has(l.farmer_id)) {
        farmerMap.set(l.farmer_id, { prices: [], categories: new Set(), count: 0, lat: l.latitude, lng: l.longitude });
      }
      const entry = farmerMap.get(l.farmer_id)!;
      entry.prices.push(l.price);
      entry.categories.add(l.category);
      entry.count++;
    }

    const farmerIds = [...farmerMap.keys()];

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, city, state, avatar_url, latitude, longitude")
      .in("user_id", farmerIds);

    // Fetch ratings
    const { data: ratings } = await supabase
      .from("farmer_ratings")
      .select("farmer_id, rating")
      .in("farmer_id", farmerIds);

    const ratingMap = new Map<string, number[]>();
    for (const r of (ratings || [])) {
      if (!ratingMap.has(r.farmer_id)) ratingMap.set(r.farmer_id, []);
      ratingMap.get(r.farmer_id)!.push(r.rating);
    }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const result: FarmerCard[] = farmerIds.map(fid => {
      const entry = farmerMap.get(fid)!;
      const prof = profileMap.get(fid);
      const rats = ratingMap.get(fid) || [];
      const avgRating = rats.length ? rats.reduce((a, b) => a + b, 0) / rats.length : 0;
      const avgPrice = entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length;

      return {
        farmer_id: fid,
        full_name: prof?.full_name || "Unknown Farmer",
        city: prof?.city || null,
        state: prof?.state || null,
        avatar_url: (prof as any)?.avatar_url || null,
        crop_count: entry.count,
        avg_price: Math.round(avgPrice),
        min_price: Math.min(...entry.prices),
        max_price: Math.max(...entry.prices),
        avg_rating: Math.round(avgRating * 10) / 10,
        total_reviews: rats.length,
        categories: [...entry.categories],
        latitude: prof?.latitude ?? entry.lat,
        longitude: prof?.longitude ?? entry.lng,
      };
    });

    const globalMax = Math.max(...result.map(f => f.max_price), 100);
    setMaxPossiblePrice(globalMax);
    setPriceRange([0, globalMax]);
    setFarmers(result);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filterAndSort = () => {
    let list = farmers.map(f => {
      let distance: number | undefined;
      if (customerLocation && f.latitude && f.longitude) {
        distance = haversineDistance(customerLocation.lat, customerLocation.lng, f.latitude, f.longitude);
      }
      return { ...f, distance };
    });

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(f =>
        f.full_name.toLowerCase().includes(term) ||
        f.city?.toLowerCase().includes(term) ||
        f.categories.some(c => c.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (categoryFilter !== "All") {
      list = list.filter(f => f.categories.includes(categoryFilter));
    }

    // Price range
    list = list.filter(f => f.avg_price >= priceRange[0] && f.avg_price <= priceRange[1]);

    // Sort
    switch (sortBy) {
      case "price-low":
        list.sort((a, b) => a.avg_price - b.avg_price);
        break;
      case "price-high":
        list.sort((a, b) => b.avg_price - a.avg_price);
        break;
      case "nearest":
        list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
        break;
      case "farthest":
        list.sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0));
        break;
      case "rating":
        list.sort((a, b) => b.avg_rating - a.avg_rating);
        break;
      default:
        break;
    }

    setFiltered(list);
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

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
            <Button variant="ghost" size="icon" onClick={() => navigate("/customer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Farmers Marketplace</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} farmers available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/customer/cart")}>
              <ShoppingCart className="w-5 h-5" />
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5">
        {/* Search & Sort */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search farmers by name, location or crop..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest First</SelectItem>
                <SelectItem value="farthest">Farthest First</SelectItem>
                <SelectItem value="price-low">Lowest Avg Price</SelectItem>
                <SelectItem value="price-high">Highest Avg Price</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">
                    Average Price Range: ₹{priceRange[0]} – ₹{priceRange[1]}
                  </p>
                  <Slider
                    min={0}
                    max={maxPossiblePrice}
                    step={10}
                    value={priceRange}
                    onValueChange={(v) => setPriceRange(v as [number, number])}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Farmer Cards */}
        <div className="space-y-4 stagger-children">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No farmers found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filtered.map((farmer) => (
              <Card
                key={farmer.farmer_id}
                className="cursor-pointer group"
                onClick={() => navigate(`/customer/farmer/${farmer.farmer_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/30 group-hover:border-primary transition-colors">
                      {farmer.avatar_url ? (
                        <AvatarImage src={farmer.avatar_url} alt={farmer.full_name} />
                      ) : null}
                      <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                        {getInitials(farmer.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base truncate">{farmer.full_name}</h3>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>

                      {(farmer.city || farmer.state) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[farmer.city, farmer.state].filter(Boolean).join(", ")}
                          {farmer.distance != null && (
                            <span className="ml-1 text-primary font-medium">
                              • {farmer.distance < 1 ? `${Math.round(farmer.distance * 1000)}m` : `${farmer.distance.toFixed(1)}km`}
                            </span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1">
                          <Package className="w-3 h-3" />
                          {farmer.crop_count} crops
                        </Badge>
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Avg ₹{farmer.avg_price}/kg
                        </Badge>
                        {farmer.avg_rating > 0 && (
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                            <span className="font-medium">{farmer.avg_rating}</span>
                            <span className="text-muted-foreground">({farmer.total_reviews})</span>
                          </span>
                        )}
                      </div>

                      {farmer.categories.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {farmer.categories.slice(0, 4).map(cat => (
                            <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              {cat}
                            </span>
                          ))}
                          {farmer.categories.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{farmer.categories.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerMarketplace;
