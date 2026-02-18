import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Phone,
  MapPin,
  Loader2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface CustomerOrder {
  id: string;
  customer_id: string;
  farmer_id: string;
  listing_id: string;
  quantity: number;
  total_price: number;
  status: string;
  delivery_preference: string | null;
  delivery_address_id: string | null;
  estimated_delivery: string | null;
  notes: string | null;
  farmer_notes: string | null;
  farmer_contact_visible: boolean;
  created_at: string;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  listing?: {
    title: string;
    unit: string;
    price: number;
  };
  address?: {
    address_line: string;
    city: string;
    state: string;
    pincode: string;
    phone: string | null;
  };
  customer_profile?: {
    full_name: string;
    phone: string | null;
  };
}

const statusFlow = ["pending", "confirmed", "packed", "dispatched", "delivered"];

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-warning", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "bg-primary", label: "Confirmed" },
  packed: { icon: Package, color: "bg-accent", label: "Packed" },
  dispatched: { icon: Truck, color: "bg-info", label: "Dispatched" },
  delivered: { icon: CheckCircle, color: "bg-success", label: "Delivered" },
  cancelled: { icon: XCircle, color: "bg-destructive", label: "Cancelled" },
};

const FarmerCustomerOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [farmerNotes, setFarmerNotes] = useState("");
  const [updating, setUpdating] = useState(false);

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
        .channel("farmer-customer-orders")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "customer_orders",
            filter: `farmer_id=eq.${session.user.id}`,
          },
          () => fetchOrders(session.user.id)
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
        listing:marketplace_listings (title, unit, price),
        address:customer_addresses (address_line, city, state, pincode, phone)
      `)
      .eq("farmer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }

    // Fetch customer profiles separately
    const customerIds = [...new Set((data || []).map(o => o.customer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", customerIds);

    const profileMap: Record<string, { full_name: string; phone: string | null }> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = { full_name: p.full_name, phone: p.phone };
    });

    const enrichedOrders = (data || []).map(order => ({
      ...order,
      customer_profile: profileMap[order.customer_id],
    }));

    setOrders(enrichedOrders as CustomerOrder[]);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === "packed") updates.packed_at = new Date().toISOString();
      if (newStatus === "dispatched") updates.dispatched_at = new Date().toISOString();
      if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();
      if (farmerNotes) updates.farmer_notes = farmerNotes;

      const { error } = await supabase
        .from("customer_orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      // Send notification to customer
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await supabase.functions.invoke("create-notification", {
          body: {
            user_id: order.customer_id,
            type: "order_status",
            title: `Order ${statusConfig[newStatus]?.label || newStatus}`,
            message: `Your order for ${order.listing?.title} has been ${newStatus}`,
            data: { order_id: orderId, status: newStatus },
          },
        });
      }

      toast.success(`Order ${statusConfig[newStatus]?.label || newStatus}`);
      setSelectedOrder(null);
      setFarmerNotes("");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session) fetchOrders(session.user.id);

      // When an order becomes ready for delivery (dispatched), trigger assignment
      if (newStatus === "dispatched") {
        supabase.functions.invoke("logistics-assignment", {
          body: {
            action: "assign",
            order_id: orderId,
          },
        }).catch((err) => {
          console.error("Failed to invoke logistics-assignment on dispatched order", err);
        });
      }
    } catch (err) {
      console.error("Error updating order:", err);
      toast.error("Failed to update order");
    }
    setUpdating(false);
  };

  const rejectOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, "cancelled");
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIdx = statusFlow.indexOf(currentStatus);
    if (currentIdx === -1 || currentIdx >= statusFlow.length - 1) return null;
    return statusFlow[currentIdx + 1];
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "pending") return order.status === "pending";
    if (activeTab === "active") return ["confirmed", "packed", "dispatched"].includes(order.status);
    if (activeTab === "completed") return order.status === "delivered";
    if (activeTab === "cancelled") return order.status === "cancelled";
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
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Customer Orders</h1>
              <p className="text-sm text-muted-foreground">{orders.length} orders</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {orders.filter(o => o.status === "pending").length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive">
                  {orders.filter(o => o.status === "pending").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No {activeTab} orders</h2>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const nextStatus = getNextStatus(order.status);

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className={`h-1 ${config.color}`} />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.listing?.title || "Product"}</CardTitle>
                          <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                        </div>
                        <Badge className={config.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Customer Info */}
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{order.customer_profile?.full_name || "Customer"}</span>
                      </div>

                      {/* Delivery Address */}
                      {order.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>{order.address.address_line}</p>
                            <p className="text-muted-foreground">
                              {order.address.city}, {order.address.state} - {order.address.pincode}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Order Details */}
                      <div className="grid grid-cols-3 gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                        <div>
                          <p className="text-muted-foreground">Quantity</p>
                          <p className="font-medium">{order.quantity} {order.listing?.unit}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">₹{order.total_price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Delivery</p>
                          <p className="font-medium capitalize">{order.delivery_preference || "Any"}</p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Customer Notes:</p>
                          <p className="italic">"{order.notes}"</p>
                        </div>
                      )}

                      {/* Order Timeline */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        {statusFlow.map((step, idx) => {
                          const stepIdx = statusFlow.indexOf(order.status);
                          const isCompleted = idx <= stepIdx;
                          const isCurrent = step === order.status;

                          return (
                            <div key={step} className="flex flex-col items-center flex-1">
                              <div
                                className={`w-4 h-4 rounded-full ${
                                  isCompleted ? "bg-primary" : "bg-muted"
                                } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                              />
                              <span className="text-xs mt-1 text-muted-foreground capitalize">{step}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      {order.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="farmer"
                            className="flex-1"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Accept Order
                          </Button>
                          <Button
                            variant="outline"
                            className="text-destructive"
                            onClick={() => rejectOrder(order.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {nextStatus && order.status !== "pending" && (
                        <Button
                          variant="farmer"
                          className="w-full"
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                          disabled={updating}
                        >
                          {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Mark as {statusConfig[nextStatus]?.label || nextStatus}
                        </Button>
                      )}

                      {/* Contact Customer (only for confirmed orders) */}
                      {order.farmer_contact_visible && order.address?.phone && order.status !== "delivered" && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(`tel:${order.address?.phone}`)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call Customer
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Accept Order Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Add notes for this order (optional):</p>
                <Textarea
                  value={farmerNotes}
                  onChange={(e) => setFarmerNotes(e.target.value)}
                  placeholder="e.g., Will deliver by evening..."
                />
              </div>
              <Button
                variant="farmer"
                className="w-full"
                onClick={() => selectedOrder && updateOrderStatus(selectedOrder.id, "confirmed")}
                disabled={updating}
              >
                {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default FarmerCustomerOrders;
