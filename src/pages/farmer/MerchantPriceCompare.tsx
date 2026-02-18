import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BarChart3, Loader2, Store } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface ProductWithMerchant {
  id: string;
  name: string;
  category: string | null;
  price: number;
  quantity: number;
  unit: string;
  merchant_id: string;
  merchant_name: string;
}

const MerchantPriceCompare = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithMerchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [merchants, setMerchants] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/"); return; }

    const { data: prods } = await supabase
      .from("products")
      .select("id, name, category, price, quantity, unit, merchant_id")
      .gt("quantity", 0);

    if (!prods || prods.length === 0) { setLoading(false); return; }

    const merchantIds = [...new Set(prods.map(p => p.merchant_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", merchantIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

    const enriched: ProductWithMerchant[] = prods.map(p => ({
      ...p,
      merchant_name: profileMap.get(p.merchant_id) || "Unknown",
    }));

    const cats = [...new Set(enriched.map(p => p.category).filter(Boolean))] as string[];
    setCategories(["All", ...cats]);
    setMerchants(merchantIds.map(id => ({ id, name: profileMap.get(id) || "Unknown" })));
    setProducts(enriched);
    setLoading(false);
  };

  const toggleMerchant = (id: string) => {
    setSelectedMerchants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (selectedMerchants.size > 0 && !selectedMerchants.has(p.merchant_id)) return false;
    return true;
  });

  // Group products by name for comparison
  const grouped = new Map<string, ProductWithMerchant[]>();
  for (const p of filteredProducts) {
    const key = p.name.toLowerCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }

  // Only show products available from multiple merchants
  const comparableGroups = [...grouped.entries()].filter(([, items]) => items.length > 1);

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
            <div>
              <h1 className="text-lg font-semibold">Compare Merchant Prices</h1>
              <p className="text-sm text-muted-foreground">Find the best deals</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Filter by Category</p>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Select Merchants to Compare</p>
              <div className="flex flex-wrap gap-3">
                {merchants.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedMerchants.has(m.id)} onCheckedChange={() => toggleMerchant(m.id)} />
                    <span className="text-sm">{m.name}</span>
                  </label>
                ))}
              </div>
              {selectedMerchants.size === 0 && <p className="text-xs text-muted-foreground mt-1">Select merchants or leave empty to compare all</p>}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {comparableGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No comparable products</p>
            <p className="text-sm">Products must be listed by multiple merchants to compare</p>
          </div>
        ) : (
          comparableGroups.map(([name, items]) => {
            const sorted = [...items].sort((a, b) => a.price - b.price);
            const lowestPrice = sorted[0].price;

            return (
              <Card key={name}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sorted.map((item, idx) => (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <Store className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium">{item.merchant_name}</p>
                            <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} available</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${idx === 0 ? "text-primary" : ""}`}>₹{item.price}/{item.unit}</p>
                          {idx === 0 && <Badge className="bg-primary text-primary-foreground text-xs">Best Price</Badge>}
                          {idx > 0 && (
                            <p className="text-xs text-destructive">+₹{(item.price - lowestPrice).toFixed(0)} more</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default MerchantPriceCompare;
