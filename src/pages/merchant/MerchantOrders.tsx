import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Clock, CheckCircle2, XCircle, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  notes: string | null;
  products: {
    id: string;
    name: string;
    unit: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, class: "status-pending" },
  accepted: { label: "Accepted", icon: Package, class: "status-accepted" },
  completed: { label: "Completed", icon: CheckCircle2, class: "status-completed" },
  rejected: { label: "Rejected", icon: XCircle, class: "status-rejected" },
};

const MerchantOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        quantity,
        total_price,
        status,
        created_at,
        notes,
        products (id, name, unit)
      `)
      .eq("merchant_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Map the data to include a placeholder for profiles since we can't join directly
      const ordersWithProfiles = data.map(order => ({
        ...order,
        profiles: { full_name: "Farmer" } // Simplified - in production fetch separately
      }));
      setOrders(ordersWithProfiles as Order[]);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, productId?: string, quantity?: number) => {
    setUpdatingOrder(orderId);

    // If accepting, we need to reduce stock
    if (newStatus === "accepted" && productId && quantity) {
      // First get current stock
      const { data: product } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", productId)
        .single();

      if (product && product.quantity < quantity) {
        toast.error("Insufficient stock to accept this order");
        setUpdatingOrder(null);
        return;
      }

      // Reduce stock
      const { error: stockError } = await supabase
        .from("products")
        .update({ quantity: product!.quantity - quantity })
        .eq("id", productId);

      if (stockError) {
        toast.error("Failed to update stock");
        setUpdatingOrder(null);
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    }

    setUpdatingOrder(null);
  };

  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter(order => order.status === activeTab);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/merchant")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Order Requests</h1>
            <p className="text-sm text-muted-foreground">Manage farmer orders</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="pending" className="relative">
              Pending
              {orders.filter(o => o.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                  {orders.filter(o => o.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No orders found</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending" 
                    ? "No pending orders to review"
                    : `No ${activeTab} orders`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status as keyof typeof statusConfig];
                  const StatusIcon = status?.icon || Package;
                  
                  return (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {order.products?.name || "Unknown Product"}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              From: {order.profiles?.full_name || "Unknown Farmer"}
                            </p>
                          </div>
                          <Badge className={status?.class}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status?.label || order.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">
                              {order.quantity} {order.products?.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-medium text-primary">₹{order.total_price}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Date</p>
                            <p className="font-medium">{formatDate(order.created_at)}</p>
                          </div>
                        </div>

                        {/* Action Buttons for Pending Orders */}
                        {order.status === "pending" && (
                          <div className="flex items-center gap-2 pt-4 border-t">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 bg-success hover:bg-success/90"
                              onClick={() => updateOrderStatus(
                                order.id, 
                                "accepted", 
                                order.products?.id, 
                                order.quantity
                              )}
                              disabled={updatingOrder === order.id}
                            >
                              {updatingOrder === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => updateOrderStatus(order.id, "rejected")}
                              disabled={updatingOrder === order.id}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Complete Button for Accepted Orders */}
                        {order.status === "accepted" && (
                          <div className="pt-4 border-t">
                            <Button
                              variant="merchant"
                              size="sm"
                              className="w-full"
                              onClick={() => updateOrderStatus(order.id, "completed")}
                              disabled={updatingOrder === order.id}
                            >
                              {updatingOrder === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Mark as Completed
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MerchantOrders;
