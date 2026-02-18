import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingBag,
  Heart,
  Package,
  User,
  Loader2,
  ShoppingCart,
  Search,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/hooks/useTheme";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    cartItems: 0,
    wishlistItems: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });
  const [progressAnimated, setProgressAnimated] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).single();
      if (profile) setUserName(profile.full_name);

      const [cartResult, wishlistResult, ordersResult] = await Promise.all([
        supabase.from("customer_cart").select("id", { count: "exact" }).eq("customer_id", session.user.id),
        supabase.from("customer_wishlist").select("id", { count: "exact" }).eq("customer_id", session.user.id),
        supabase.from("customer_orders").select("status").eq("customer_id", session.user.id),
      ]);

      const orders = ordersResult.data || [];
      setStats({
        cartItems: cartResult.count || 0,
        wishlistItems: wishlistResult.count || 0,
        pendingOrders: orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length,
        completedOrders: orders.filter(o => o.status === "delivered").length,
      });
      setLoading(false);
      setTimeout(() => setProgressAnimated(true), 200);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalOrders = stats.pendingOrders + stats.completedOrders;
  const completionRate = totalOrders > 0 ? Math.round((stats.completedOrders / totalOrders) * 100) : 0;

  const kpiStats = [
    { icon: ShoppingCart, label: "Cart Items", value: stats.cartItems, color: "text-primary" },
    { icon: Heart, label: "Wishlist", value: stats.wishlistItems, color: "text-warning" },
    { icon: Package, label: "Active Orders", value: stats.pendingOrders, color: "text-accent" },
    { icon: ShoppingBag, label: "Completed", value: stats.completedOrders, color: "text-success" },
  ];

  const quickActions = [
    { icon: Search, label: "Browse Produce", path: "/customer/marketplace" },
    { icon: ShoppingCart, label: "My Cart", path: "/customer/cart" },
    { icon: Heart, label: "Wishlist", path: "/customer/wishlist" },
    { icon: Package, label: "My Orders", path: "/customer/orders" },
    { icon: BarChart3, label: "Compare Prices", path: "/customer/compare" },
    { icon: User, label: "Profile", path: "/customer/profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient particles */}
      <div className="fixed top-0 left-0 right-0 h-32 pointer-events-none overflow-hidden z-0">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/5 animate-float-particle"
            style={{
              width: `${10 + i * 5}px`,
              height: `${10 + i * 5}px`,
              left: `${20 + i * 30}%`,
              top: `${15 + (i % 2) * 20}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${5 + i}s`,
            }}
          />
        ))}
      </div>

      <header className="sticky top-0 z-50 glass-subtle border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Welcome, {userName || "Customer"}!</h1>
            <p className="text-sm text-muted-foreground">Find fresh produce from local farmers</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher mode={theme.mode} onModeChange={theme.setMode} />
            <NotificationBell />
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/customer/profile")}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10 space-y-8">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {kpiStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5 text-center">
                <div className="kpi-pulse inline-flex mx-auto mb-3">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion rate */}
        {totalOrders > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Order Completion Rate</span>
                </div>
                <span className="text-sm font-bold text-primary">{completionRate}%</span>
              </div>
              <Progress value={progressAnimated ? completionRate : 0} className="h-2" />
            </CardContent>
          </Card>
        )}

        <div className="gradient-divider" />

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
            {quickActions.map((action) => (
              <Card
                key={action.label}
                className="cursor-pointer group btn-ripple"
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:shadow-glow transition-all duration-300">
                    <action.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <span className="font-medium text-sm">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="gradient-divider" />

        {/* CTA Banner */}
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary to-primary-glow p-6 flex items-center justify-between">
              <div className="text-primary-foreground">
                <h3 className="text-xl font-bold mb-1">Fresh from the Farm</h3>
                <p className="opacity-90 text-sm">Discover organic produce directly from local farmers</p>
              </div>
              <Button 
                variant="secondary" 
                size="lg"
                className="shadow-lg"
                onClick={() => navigate("/customer/marketplace")}
              >
                Shop Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerDashboard;
