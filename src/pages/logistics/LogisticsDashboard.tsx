import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Truck, CheckCircle2, Activity, Wallet } from "lucide-react";
import LogisticsLayout from "./LogisticsLayout";

interface DeliveryOrder {
  id: string;
  status: string;
  delivery_status: string | null;
  total_price: number;
  delivered_time: string | null;
}

const DELIVERY_COMPLETED_STATUSES = ["delivered", "completed"];

const LogisticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }

      const { data, error } = await supabase
        .from("customer_orders")
        .select("id, status, delivery_status, total_price, delivered_time, delivery_partner_id")
        .eq("delivery_partner_id", session.user.id);

      if (!error && data) {
        setOrders(data as unknown as DeliveryOrder[]);
      }

      setLoading(false);
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const assignedDeliveries = orders.filter((o) => (o.delivery_status || "assigned") === "assigned").length;
  const activeDeliveries = orders.filter(
    (o) => !DELIVERY_COMPLETED_STATUSES.includes((o.delivery_status || "").toLowerCase())
  ).length;

  const today = new Date().toDateString();
  const completedToday = orders.filter((o) => {
    if (!o.delivered_time) return false;
    return new Date(o.delivered_time).toDateString() === today;
  }).length;

  const earningsToday = orders
    .filter((o) => {
      if (!o.delivered_time) return false;
      return new Date(o.delivered_time).toDateString() === today;
    })
    .reduce((sum, o) => sum + o.total_price * 0.05, 0);

  const completionRate =
    orders.length === 0
      ? 0
      : Math.round(
          (orders.filter((o) => DELIVERY_COMPLETED_STATUSES.includes((o.delivery_status || "").toLowerCase())).length /
            orders.length) *
            100
        );

  return (
    <LogisticsLayout
      title="Delivery Partner Dashboard"
      subtitle="Track assigned deliveries, performance & earnings"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Assigned Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{assignedDeliveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-info" />
              Active Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeDeliveries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              Earnings Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{earningsToday.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Approx. 5% of order value</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Delivery Performance</span>
              <Badge variant="outline" className="text-xs">
                {completionRate}% completion
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-muted/60">
                  <p className="text-muted-foreground mb-1">Total Deliveries</p>
                  <p className="text-lg font-semibold">{orders.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/60">
                  <p className="text-muted-foreground mb-1">In Progress</p>
                  <p className="text-lg font-semibold">{activeDeliveries}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/60">
                  <p className="text-muted-foreground mb-1">Completed</p>
                  <p className="text-lg font-semibold">
                    {
                      orders.filter((o) =>
                        DELIVERY_COMPLETED_STATUSES.includes((o.delivery_status || "").toLowerCase())
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned</span>
              <span className="font-medium">{assignedDeliveries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">In Transit</span>
              <span className="font-medium">
                {
                  orders.filter(
                    (o) =>
                      (o.delivery_status || "").toLowerCase() === "in_transit" ||
                      (o.delivery_status || "").toLowerCase() === "in transit"
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Delivered</span>
              <span className="font-medium">
                {
                  orders.filter((o) =>
                    DELIVERY_COMPLETED_STATUSES.includes((o.delivery_status || "").toLowerCase())
                  ).length
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </LogisticsLayout>
  );
};

export default LogisticsDashboard;

