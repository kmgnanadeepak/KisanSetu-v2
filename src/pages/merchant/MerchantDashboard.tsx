import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Store, 
  Package, 
  ClipboardList, 
  Plus, 
  User, 
  LogOut, 
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/hooks/useTheme";

interface OrderStats { pending: number; accepted: number; completed: number; }
interface Product { id: string; name: string; quantity: number; price: number; unit: string; }

const MerchantDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({ pending: 0, accepted: 0, completed: 0 });
  const theme = useTheme();

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }
      const { data: profileData } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      setProfile(profileData);
      const { data: productsData } = await supabase.from("products").select("id, name, quantity, price, unit").eq("merchant_id", session.user.id).order("created_at", { ascending: false }).limit(5);
      setProducts(productsData || []);
      const { data: ordersData } = await supabase.from("orders").select("status").eq("merchant_id", session.user.id);
      if (ordersData) {
        const stats = ordersData.reduce((acc, order) => {
          if (order.status === 'pending') acc.pending++;
          else if (order.status === 'accepted') acc.accepted++;
          else if (order.status === 'completed') acc.completed++;
          return acc;
        }, { pending: 0, accepted: 0, completed: 0 });
        setOrderStats(stats);
      }
      setLoading(false);
    };
    checkAuthAndFetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (!session) navigate("/"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); toast.success("Logged out successfully"); navigate("/"); };
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statsCards = [
    { icon: Clock, label: "Pending Orders", value: orderStats.pending, color: "text-warning" },
    { icon: TrendingUp, label: "In Progress", value: orderStats.accepted, color: "text-primary" },
    { icon: CheckCircle2, label: "Completed", value: orderStats.completed, color: "text-success" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-subtle border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <Store className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold">KisanSetu</span>
            <Badge variant="secondary" className="ml-2">Merchant</Badge>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher mode={theme.mode} onModeChange={theme.setMode} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-accent/30">
                    <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                      {profile?.full_name ? getInitials(profile.full_name) : "M"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="end">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{profile?.full_name || "Merchant"}</p>
                  <p className="text-xs text-muted-foreground">Merchant Account</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/merchant/profile")}>
                  <User className="mr-2 h-4 w-4" /> Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold">Welcome, {profile?.full_name?.split(" ")[0] || "Merchant"}! 👋</h1>
          <p className="text-muted-foreground mt-1">Manage your inventory and serve farmers better</p>
        </div>

        <div className="gradient-divider mb-8" />

        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-children">
          {statsCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="kpi-pulse">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="group cursor-pointer" onClick={() => navigate("/merchant/orders")}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent group-hover:shadow-glow transition-all duration-300">
                <ClipboardList className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                View Requests
                {orderStats.pending > 0 && <Badge variant="destructive" className="animate-pulse-gentle">{orderStats.pending} new</Badge>}
              </CardTitle>
              <CardDescription>Manage incoming orders from farmers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-all">View All Requests</Button>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer" onClick={() => navigate("/merchant/stock")}>
            <CardHeader>
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent group-hover:shadow-glow transition-all duration-300">
                <Package className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
              </div>
              <CardTitle className="text-xl">Manage Stock</CardTitle>
              <CardDescription>View and update your product inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-all">Manage Inventory</Button>
            </CardContent>
          </Card>
        </div>

        <div className="gradient-divider my-8" />

        {/* Recent Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Products</CardTitle>
              <CardDescription>Your latest inventory items</CardDescription>
            </div>
            <Button onClick={() => navigate("/merchant/stock")} variant="merchant" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Stock
            </Button>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No products yet</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/merchant/stock")}>Add Your First Product</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">₹{product.price} per {product.unit}</p>
                    </div>
                    <Badge variant={product.quantity > 10 ? "default" : "destructive"} className={product.quantity > 10 ? "bg-primary" : ""}>
                      {product.quantity} {product.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MerchantDashboard;
