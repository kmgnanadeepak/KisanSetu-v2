import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CalendarDays, CheckCircle2 } from "lucide-react";
import LogisticsLayout from "./LogisticsLayout";

interface DeliveryOrder {
  id: string;
  total_price: number;
  delivery_status: string | null;
  delivered_time: string | null;
}

const computeEarnings = (orders: DeliveryOrder[]) =>
  orders.reduce((sum, o) => sum + o.total_price * 0.05, 0);

const LogisticsEarnings = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");

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
        .select("id, total_price, delivery_status, delivered_time, delivery_partner_id")
        .eq("delivery_partner_id", session.user.id)
        .in("delivery_status", ["delivered", "completed"]);

      if (!error && data) {
        setOrders(data as unknown as DeliveryOrder[]);
      }
      setLoading(false);
    };
    init();
  }, []);

  const now = new Date();
  const todayStr = now.toDateString();

  const todayOrders = orders.filter(
    (o) => o.delivered_time && new Date(o.delivered_time).toDateString() === todayStr
  );

  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekOrders = orders.filter(
    (o) => o.delivered_time && new Date(o.delivered_time) >= weekAgo
  );

  const monthAgo = new Date();
  monthAgo.setDate(now.getDate() - 30);
  const monthOrders = orders.filter(
    (o) => o.delivered_time && new Date(o.delivered_time) >= monthAgo
  );

  const tabConfig = {
    today: {
      label: "Today",
      orders: todayOrders,
    },
    week: {
      label: "Last 7 Days",
      orders: weekOrders,
    },
    month: {
      label: "Last 30 Days",
      orders: monthOrders,
    },
  } as const;

  const current = tabConfig[activeTab];
  const currentEarnings = computeEarnings(current.orders);
  const pendingPayouts = computeEarnings(orders) - currentEarnings;

  const formatDate = (dateString: string | null) =>
    dateString
      ? new Date(dateString).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  return (
    <LogisticsLayout
      title="Earnings"
      subtitle="Track confirmed earnings and upcoming payouts"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Earnings Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{computeEarnings(todayOrders).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-info" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{computeEarnings(weekOrders).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{pendingPayouts.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on completed deliveries awaiting settlement
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Delivery Earnings
            </CardTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="today" className="text-xs">
                  Today
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs">
                  7d
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs">
                  30d
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : current.orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No completed deliveries in this period
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">
                  {current.orders.length} deliveries ·{" "}
                  <span className="font-semibold">₹{currentEarnings.toFixed(2)}</span>
                </span>
              </div>
              {current.orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/60"
                >
                  <div>
                    <p className="font-medium text-xs">Order #{o.id.slice(0, 8)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Delivered {formatDate(o.delivered_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      ₹{(o.total_price * 0.05).toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {(o.delivery_status || "completed").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </LogisticsLayout>
  );
};

export default LogisticsEarnings;

