import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Route, Truck, Loader2 } from "lucide-react";
import LogisticsLayout from "./LogisticsLayout";

interface RouteStop {
  id: string;
  delivery_status: string | null;
  created_at: string;
  address?: {
    address_line: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const LogisticsRoutes = () => {
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState<RouteStop[]>([]);

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
        .select(
          `
          id,
          delivery_status,
          created_at,
          address:customer_addresses (address_line, city, state, pincode)
        `
        )
        .eq("delivery_partner_id", session.user.id)
        .in("delivery_status", ["assigned", "accepted", "pickup_scheduled", "picked_up", "in_transit"])
        .order("created_at", { ascending: true });

      if (!error && data) {
        setStops(data as unknown as RouteStop[]);
      }
      setLoading(false);
    };
    init();
  }, []);

  return (
    <LogisticsLayout
      title="Today&apos;s Route"
      subtitle="See optimized sequence of upcoming stops"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="w-4 h-4 text-primary" />
            Planned Stops
            <Badge variant="outline" className="ml-auto text-xs">
              {stops.length} stops
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : stops.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p>No active deliveries requiring routing</p>
            </div>
          ) : (
            <ol className="space-y-4">
              {stops.map((stop, index) => (
                <li
                  key={stop.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/60"
                >
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    {index < stops.length - 1 && (
                      <div className="flex-1 w-px bg-border mt-1" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">
                        {stop.address?.city || "Destination"} · {stop.address?.pincode}
                      </p>
                    </div>
                    {stop.address && (
                      <p className="text-xs text-muted-foreground">
                        {stop.address.address_line}, {stop.address.city}, {stop.address.state}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Created at{" "}
                      {new Date(stop.created_at).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {(stop.delivery_status || "assigned").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </LogisticsLayout>
  );
};

export default LogisticsRoutes;

