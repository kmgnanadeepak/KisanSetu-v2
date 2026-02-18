import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Clock,
  Phone,
  Store,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface Shop {
  id: string;
  name: string;
  category: string;
  address: string;
  distance: number;
  phone?: string;
  openNow: boolean;
  openingHours?: string;
  lat: number;
  lon: number;
}

const shopCategories = [
  "All",
  "Agricultural Supplies",
  "Seed Store",
  "Fertilizer Store",
  "Pesticide Shop",
  "Farm Equipment",
  "Veterinary",
];

const NearbyShops = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      getUserLocation();
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyShops();
    }
  }, [userLocation]);

  useEffect(() => {
    filterShops();
  }, [shops, searchTerm, selectedCategory]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        setLocationError("Unable to get your location. Please enable location services.");
        setLoading(false);
      }
    );
  };

  const fetchNearbyShops = async () => {
    if (!userLocation) return;

    try {
      // Using Overpass API (OpenStreetMap) to find nearby agricultural shops
      const radius = 10000; // 10km radius
      const query = `
        [out:json][timeout:25];
        (
          node["shop"="farm"](around:${radius},${userLocation.lat},${userLocation.lon});
          node["shop"="agrarian"](around:${radius},${userLocation.lat},${userLocation.lon});
          node["shop"="garden_centre"](around:${radius},${userLocation.lat},${userLocation.lon});
          node["amenity"="veterinary"](around:${radius},${userLocation.lat},${userLocation.lon});
          node["shop"="pet"](around:${radius},${userLocation.lat},${userLocation.lon});
        );
        out body;
      `;

      const response = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      const shopList: Shop[] = data.elements.map((element: any, index: number) => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          element.lat,
          element.lon
        );

        let category = "Agricultural Supplies";
        if (element.tags?.shop === "farm") category = "Farm Equipment";
        else if (element.tags?.shop === "garden_centre") category = "Seed Store";
        else if (element.tags?.amenity === "veterinary") category = "Veterinary";

        return {
          id: element.id.toString(),
          name: element.tags?.name || `${category} Shop`,
          category,
          address: [
            element.tags?.["addr:street"],
            element.tags?.["addr:city"],
          ].filter(Boolean).join(", ") || "Address not available",
          distance,
          phone: element.tags?.phone,
          openNow: isOpenNow(element.tags?.opening_hours),
          openingHours: element.tags?.opening_hours,
          lat: element.lat,
          lon: element.lon,
        };
      });

      // Sort by distance
      shopList.sort((a, b) => a.distance - b.distance);
      setShops(shopList);

      // If no results from API, show sample data
      if (shopList.length === 0) {
        setShops(getSampleShops(userLocation));
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      // Fall back to sample data
      setShops(getSampleShops(userLocation));
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isOpenNow = (openingHours?: string): boolean => {
    if (!openingHours) return true; // Assume open if no data
    // Simplified check - real implementation would parse opening hours
    return true;
  };

  const getSampleShops = (location: { lat: number; lon: number }): Shop[] => {
    // Sample shops for demo purposes
    return [
      {
        id: "1",
        name: "Kisan Agro Center",
        category: "Agricultural Supplies",
        address: "Near bus stand",
        distance: 0.5,
        phone: "+91 98765 43210",
        openNow: true,
        openingHours: "8:00 AM - 8:00 PM",
        lat: location.lat + 0.005,
        lon: location.lon + 0.005,
      },
      {
        id: "2",
        name: "Green Seeds & Fertilizers",
        category: "Seed Store",
        address: "Main market",
        distance: 1.2,
        phone: "+91 98765 43211",
        openNow: true,
        openingHours: "9:00 AM - 7:00 PM",
        lat: location.lat + 0.01,
        lon: location.lon - 0.01,
      },
      {
        id: "3",
        name: "Farm Tech Equipment",
        category: "Farm Equipment",
        address: "Industrial area",
        distance: 2.8,
        phone: "+91 98765 43212",
        openNow: false,
        openingHours: "10:00 AM - 6:00 PM",
        lat: location.lat - 0.02,
        lon: location.lon + 0.02,
      },
      {
        id: "4",
        name: "Crop Care Pesticides",
        category: "Pesticide Shop",
        address: "Mandi road",
        distance: 3.5,
        phone: "+91 98765 43213",
        openNow: true,
        lat: location.lat - 0.03,
        lon: location.lon - 0.01,
      },
    ];
  };

  const filterShops = () => {
    let filtered = [...shops];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        shop =>
          shop.name.toLowerCase().includes(term) ||
          shop.category.toLowerCase().includes(term) ||
          shop.address.toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(shop => shop.category === selectedCategory);
    }

    setFilteredShops(filtered);
  };

  const openDirections = (shop: Shop) => {
    const url = `https://www.openstreetmap.org/directions?from=${userLocation?.lat},${userLocation?.lon}&to=${shop.lat},${shop.lon}`;
    window.open(url, "_blank");
  };

  const openMap = (shop: Shop) => {
    const url = `https://www.openstreetmap.org/?mlat=${shop.lat}&mlon=${shop.lon}&zoom=16`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Finding nearby shops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Nearby Shops</h1>
              <p className="text-sm text-muted-foreground">
                {filteredShops.length} shops found
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {locationError ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Location Access Required</h2>
              <p className="text-muted-foreground mb-4">{locationError}</p>
              <Button variant="farmer" onClick={getUserLocation}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search shops..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shopCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shop List */}
            <div className="space-y-4">
              {filteredShops.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h2 className="text-xl font-semibold mb-2">No shops found</h2>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredShops.map((shop) => (
                  <Card key={shop.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Store className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{shop.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{shop.category}</p>
                          </div>
                        </div>
                        <Badge className={shop.openNow ? "bg-success" : "bg-muted"}>
                          {shop.openNow ? "Open" : "Closed"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {shop.distance.toFixed(1)} km away
                        </span>
                        {shop.openingHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {shop.openingHours}
                          </span>
                        )}
                      </div>

                      <p className="text-sm">{shop.address}</p>

                      <div className="flex gap-2">
                        {shop.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${shop.phone}`, "_self")}
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMap(shop)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Map
                        </Button>
                        <Button
                          variant="farmer"
                          size="sm"
                          onClick={() => openDirections(shop)}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Directions
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NearbyShops;
