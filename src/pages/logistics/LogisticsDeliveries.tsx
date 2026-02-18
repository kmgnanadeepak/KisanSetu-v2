import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import LogisticsLayout from "./LogisticsLayout";

interface DeliveryOrder {
  id: string;
  quantity: number;
  total_price: number;
  status: string;
  delivery_status: string | null;
  created_at: string;
  pickup_time: string | null;
  delivered_time: string | null;
  listing?: {
    title: string;
    unit: string;
  };
  address?: {
    address_line: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const flow = ["assigned", "accepted", "pickup_scheduled", "picked_up", "in_transit", "delivered", "completed"];

const LogisticsDeliveries = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
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
        address:customer_addresses (address_line, city, state, pincode)
      `
      )
      .eq("delivery_partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setOrders((data || []) as unknown as DeliveryOrder[]);
  };

  const transition = async (orderId: string, current: string | null) => {
    const idx = flow.indexOf((current || "assigned").toLowerCase());
    const next = idx === -1 ? "accepted" : flow[Math.min(idx + 1, flow.length - 1)];
    if (!next || next === current) return;

    setUpdatingId(orderId);
    try {
      const updates: any = {
        delivery_status: next,
        updated_at: new Date().toISOString(),
      };

      if (next === "pickup_scheduled") {
        updates.pickup_time = new Date().toISOString();
      }
      if (next === "delivered" || next === "completed") {
        updates.delivered_time = new Date().toISOString();
        updates.status = "delivered";
      }

      const { error } = await supabase.from("customer_orders").update(updates).eq("id", orderId);
      if (error) throw error;

      toast.success(`Delivery updated to ${next.replace(/_/g, " ")}`);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchOrders(session.user.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update delivery");
    }
    setUpdatingId(null);
  };

  const filteredOrders = orders.filter((o) => {
    const status = (o.delivery_status || "assigned").toLowerCase();
    if (activeTab === "completed") return status === "completed" || status === "delivered";
    return !(status === "completed" || status === "delivered");
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
      title="Delivery Progress"
      subtitle="Update pickup, transit and completion status for each delivery"
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
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
            filteredOrders.map((order) => {
              const status = (order.delivery_status || "assigned").toLowerCase();
              const currentIndex = flow.indexOf(status);

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-2 flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {order.listing?.title || "Order"} · {order.quantity} {order.listing?.unit}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created at {formatDate(order.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {status.replace(/_/g, " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
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

                    <div className="grid grid-cols-3 gap-4 bg-muted/50 p-3 rounded-lg">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold">₹{order.total_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pickup</p>
                        <p className="font-semibold">
                          {order.pickup_time ? formatDate(order.pickup_time) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delivered</p>
                        <p className="font-semibold">
                          {order.delivered_time ? formatDate(order.delivered_time) : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                      {flow.map((step, idx) => {
                        const isCompleted = currentIndex >= idx;
                        const isCurrent = currentIndex === idx;
                        return (
                          <div key={step} className="flex flex-col items-center flex-1">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                isCompleted ? "bg-primary" : "bg-muted"
                              } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                            />
                            <span className="text-[10px] mt-1 text-muted-foreground capitalize">
                              {step.replace(/_/g, " ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {status !== "completed" && status !== "delivered" && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => transition(order.id, order.delivery_status)}
                        disabled={updatingId === order.id}
                      >
                        {updatingId === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : status === "assigned" ? (
                          <Truck className="w-4 h-4 mr-2" />
                        ) : status === "pickup_scheduled" ? (
                          <Package className="w-4 h-4 mr-2" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Next step
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </LogisticsLayout>
  );
};

export default LogisticsDeliveries;

