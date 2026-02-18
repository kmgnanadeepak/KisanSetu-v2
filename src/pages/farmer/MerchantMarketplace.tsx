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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Search, MapPin, Loader2, Package, ChevronRight, SlidersHorizontal, Store, BarChart3,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface MerchantCard {
  merchant_id: string;
  full_name: string;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  item_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  categories: string[];
  latitude: number | null;
  longitude: number | null;
  distance?: number;
}

const productCategories = ["All", "Seeds", "Fertilizers", "Pesticides", "Equipment", "Feed", "Other"];

const MerchantMarketplace = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<MerchantCard[]>([]);
  const [filtered, setFiltered] = useState<MerchantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nearest");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxPossiblePrice, setMaxPossiblePrice] = useState(10000);
  const [showFilters, setShowFilters] = useState(false);
  const [farmerLocation, setFarmerLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setFarmerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}
        );
      }

      await fetchMerchants();
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    filterAndSort();
  }, [merchants, searchTerm, sortBy, categoryFilter, priceRange, farmerLocation]);

  const fetchMerchants = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("merchant_id, name, category, price, unit, quantity")
      .gt("quantity", 0);

    if (!products || products.length === 0) { setMerchants([]); return; }

    const merchantMap = new Map<string, { prices: number[]; categories: Set<string>; count: number }>();
    for (const p of products) {
      if (!merchantMap.has(p.merchant_id)) {
        merchantMap.set(p.merchant_id, { prices: [], categories: new Set(), count: 0 });
      }
      const entry = merchantMap.get(p.merchant_id)!;
      entry.prices.push(p.price);
      if (p.category) entry.categories.add(p.category);
      entry.count++;
    }

    const merchantIds = [...merchantMap.keys()];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, city, state, avatar_url, latitude, longitude")
      .in("user_id", merchantIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const result: MerchantCard[] = merchantIds.map(mid => {
      const entry = merchantMap.get(mid)!;
      const prof = profileMap.get(mid);
      const avgPrice = entry.prices.reduce((a, b) => a + b, 0) / entry.prices.length;

      return {
        merchant_id: mid,
        full_name: prof?.full_name || "Unknown Merchant",
        city: prof?.city || null,
        state: prof?.state || null,
        avatar_url: prof?.avatar_url || null,
        item_count: entry.count,
        avg_price: Math.round(avgPrice),
        min_price: Math.min(...entry.prices),
        max_price: Math.max(...entry.prices),
        categories: [...entry.categories],
        latitude: prof?.latitude ?? null,
        longitude: prof?.longitude ?? null,
      };
    });

    const globalMax = Math.max(...result.map(m => m.max_price), 100);
    setMaxPossiblePrice(globalMax);
    setPriceRange([0, globalMax]);
    setMerchants(result);
  };

  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const filterAndSort = () => {
    let list = merchants.map(m => {
      let distance: number | undefined;
      if (farmerLocation && m.latitude && m.longitude) {
        distance = haversineDistance(farmerLocation.lat, farmerLocation.lng, m.latitude, m.longitude);
      }
      return { ...m, distance };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m =>
        m.full_name.toLowerCase().includes(term) ||
        m.city?.toLowerCase().includes(term) ||
        m.categories.some(c => c.toLowerCase().includes(term))
      );
    }

    if (categoryFilter !== "All") {
      list = list.filter(m => m.categories.includes(categoryFilter));
    }

    list = list.filter(m => m.avg_price >= priceRange[0] && m.avg_price <= priceRange[1]);

    switch (sortBy) {
      case "price-low": list.sort((a, b) => a.avg_price - b.avg_price); break;
      case "price-high": list.sort((a, b) => b.avg_price - a.avg_price); break;
      case "nearest": list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999)); break;
      case "farthest": list.sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0)); break;
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Merchant Marketplace</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} merchants available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/farmer/merchant-compare")}>
              <BarChart3 className="w-4 h-4 mr-1" /> Compare
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search merchants by name, location or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant={showFilters ? "default" : "outline"} size="icon" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">Nearest First</SelectItem>
                <SelectItem value="farthest">Farthest First</SelectItem>
                <SelectItem value="price-low">Lowest Avg Price</SelectItem>
                <SelectItem value="price-high">Highest Avg Price</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {productCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showFilters && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Average Price Range: ₹{priceRange[0]} – ₹{priceRange[1]}</p>
                  <Slider min={0} max={maxPossiblePrice} step={10} value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 stagger-children">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No merchants found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            filtered.map(merchant => (
              <Card
                key={merchant.merchant_id}
                className="cursor-pointer group"
                onClick={() => navigate(`/farmer/merchant/${merchant.merchant_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-accent/30 group-hover:border-accent transition-colors">
                      {merchant.avatar_url ? <AvatarImage src={merchant.avatar_url} alt={merchant.full_name} /> : null}
                      <AvatarFallback className="text-lg bg-accent/10 text-accent font-bold">
                        {getInitials(merchant.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base truncate">{merchant.full_name}</h3>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
                      </div>

                      {(merchant.city || merchant.state) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {[merchant.city, merchant.state].filter(Boolean).join(", ")}
                          {merchant.distance != null && (
                            <span className="ml-1 text-accent font-medium">
                              • {merchant.distance < 1 ? `${Math.round(merchant.distance * 1000)}m` : `${merchant.distance.toFixed(1)}km`}
                            </span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1">
                          <Package className="w-3 h-3" />
                          {merchant.item_count} items
                        </Badge>
                        <Badge className="bg-accent/10 text-accent border-accent/20">
                          Avg ₹{merchant.avg_price}
                        </Badge>
                      </div>

                      {merchant.categories.length > 0 && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {merchant.categories.slice(0, 4).map(cat => (
                            <span key={cat} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{cat}</span>
                          ))}
                          {merchant.categories.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{merchant.categories.length - 4} more</span>
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

export default MerchantMarketplace;
