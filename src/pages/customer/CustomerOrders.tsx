import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface Order {
  id: string;
  customer_id: string;
  farmer_id: string;
  listing_id: string;
  quantity: number;
  total_price: number;
  status: string;
  delivery_preference: string | null;
  estimated_delivery: string | null;
  notes: string | null;
  created_at: string;
  listing?: {
    title: string;
    unit: string;
    price: number;
  };
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-warning", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "bg-primary", label: "Confirmed" },
  packed: { icon: Package, color: "bg-accent", label: "Packed" },
  dispatched: { icon: Truck, color: "bg-info", label: "Dispatched" },
  delivered: { icon: CheckCircle, color: "bg-success", label: "Delivered" },
  cancelled: { icon: XCircle, color: "bg-destructive", label: "Cancelled" },
};

const CustomerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      await fetchOrders(session.user.id);
      setLoading(false);

      // Subscribe to realtime updates
      const channel = supabase
        .channel("customer-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_orders",
            filter: `customer_id=eq.${session.user.id}`,
          },
          () => {
            fetchOrders(session.user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    init();
  }, [navigate]);

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("customer_orders")
      .select(`
        *,
        listing:marketplace_listings (
          title,
          unit,
          price
        )
      `)
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }
    setOrders((data || []) as unknown as Order[]);
  };

  const reorder = async (order: Order) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !order.listing) return;

    // Add to cart
    const { error } = await supabase
      .from("customer_cart")
      .upsert({
        customer_id: session.user.id,
        listing_id: order.listing_id,
        quantity: order.quantity,
      });

    if (!error) {
      toast.success("Added to cart");
      navigate("/customer/cart");
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return !["delivered", "cancelled"].includes(order.status);
    if (activeTab === "completed") return order.status === "delivered";
    return true;
  });

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
              <h1 className="text-lg font-semibold">My Orders</h1>
              <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No orders found</h2>
                <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
                <Button variant="farmer" onClick={() => navigate("/customer/marketplace")}>
                  Browse Marketplace
                </Button>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className={`h-1 ${config.color}`} />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {order.listing?.title || "Product"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(0, 8)}
                          </p>
                        </div>
                        <Badge className={config.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{order.quantity} {order.listing?.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">₹{order.total_price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ordered</p>
                          <p className="font-medium">{format(new Date(order.created_at), "dd MMM yyyy")}</p>
                        </div>
                        {order.estimated_delivery && (
                          <div>
                            <p className="text-muted-foreground">Est. Delivery</p>
                            <p className="font-medium">
                              {format(new Date(order.estimated_delivery), "dd MMM yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Order Timeline */}
                      <div className="flex items-center justify-between pt-2">
                        {["pending", "confirmed", "packed", "dispatched", "delivered"].map((step, idx) => {
                          const stepIdx = ["pending", "confirmed", "packed", "dispatched", "delivered"].indexOf(order.status);
                          const isCompleted = idx <= stepIdx;
                          const isCurrent = step === order.status;

                          return (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  isCompleted ? "bg-primary" : "bg-muted"
                                } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                              />
                              <span className="text-xs mt-1 text-muted-foreground capitalize">
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {order.status === "delivered" && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => reorder(order)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reorder
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CustomerOrders;
