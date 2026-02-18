import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Phone, MapPin, Package, Check, X } from "lucide-react";
import { toast } from "sonner";
import LogisticsLayout from "./LogisticsLayout";

interface AssignmentOrder {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  delivery_status: string | null;
  delivery_preference: string | null;
  created_at: string;
  delivery_address_id: string | null;
  listing?: {
    title: string;
    unit: string;
  };
  address?: {
    address_line: string;
    city: string;
    state: string;
    pincode: string;
    phone: string | null;
  };
}

const LogisticsOrders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AssignmentOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"assigned" | "accepted" | "all">("assigned");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }

      await fetchOrders(session.user.id);
      setLoading(false);
    };

    init();
  }, []);

  const fetchOrders = async (partnerId: string) => {
    const { data, error } = await supabase
      .from("customer_orders")
      .select(
        `
        *,
        listing:marketplace_listings (title, unit),
        address:customer_addresses (address_line, city, state, pincode, phone)
      `
      )
      .eq("delivery_partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching delivery assignments", error);
      return;
    }
    setOrders((data || []) as unknown as AssignmentOrder[]);
  };

  const updateStatus = async (orderId: string, action: "accept" | "reject") => {
    setUpdatingId(orderId);
    try {
      const isAccept = action === "accept";
      const updates: any = {
        delivery_status: isAccept ? "accepted" : "rejected",
        updated_at: new Date().toISOString(),
      };

      if (!isAccept) {
        updates.delivery_partner_id = null;
      }

      const { error } = await supabase.from("customer_orders").update(updates).eq("id", orderId);
      if (error) throw error;

      toast.success(isAccept ? "Delivery accepted" : "Assignment rejected");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchOrders(session.user.id);
      }

      // If the current partner rejected, try automatic reassignment
      if (!isAccept) {
        supabase.functions.invoke("logistics-assignment", {
          body: {
            action: "reassign",
            order_id: orderId,
          },
        }).catch((err) => {
          console.error("Failed to invoke logistics-assignment for rejected order", err);
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update delivery assignment");
    }
    setUpdatingId(null);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "assigned") return (order.delivery_status || "assigned") === "assigned";
    if (activeTab === "accepted") return order.delivery_status === "accepted";
    return true;
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <LogisticsLayout
      title="Delivery Assignments"
      subtitle="Review and accept or reject assigned deliveries"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="assigned" className="relative">
            Assigned
            {orders.filter((o) => (o.delivery_status || "assigned") === "assigned").length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center">
                {orders.filter((o) => (o.delivery_status || "assigned") === "assigned").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>No deliveries in this state</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-2 flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {order.listing?.title || "Order"} · {order.quantity} {order.listing?.unit}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Assigned at {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {(order.delivery_status || "assigned").replace(/_/g, " ")}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {order.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p>{order.address.address_line}</p>
                        <p className="text-muted-foreground">
                          {order.address.city}, {order.address.state} - {order.address.pincode}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payout (est.)</span>
                    <span className="font-semibold">₹{(order.total_price * 0.05).toFixed(2)}</span>
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t">
                    {(order.delivery_status || "assigned") === "assigned" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-success hover:bg-success/90"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order.id, "accept")}
                        >
                          {updatingId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Accept Delivery
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          disabled={updatingId === order.id}
                          onClick={() => updateStatus(order.id, "reject")}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {order.address?.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`tel:${order.address?.phone}`)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Customer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </LogisticsLayout>
  );
};

export default LogisticsOrders;

