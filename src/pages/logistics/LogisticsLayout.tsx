import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sprout,
  Truck,
  LogOut,
  MapPinned,
  ListChecks,
  Route,
  Wallet,
  User,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface LogisticsLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const navItems = [
  { label: "Overview", path: "/logistics", icon: Truck },
  { label: "Orders", path: "/logistics/orders", icon: ListChecks },
  { label: "Deliveries", path: "/logistics/deliveries", icon: MapPinned },
  { label: "Routes", path: "/logistics/routes", icon: Route },
  { label: "Earnings", path: "/logistics/earnings", icon: Wallet },
  { label: "Profile", path: "/logistics/profile", icon: User },
];

export const LogisticsLayout = ({ title, subtitle, children }: LogisticsLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const getInitials = (name?: string | null) =>
    (name || "DP")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 border-r bg-card/40 backdrop-blur-sm">
        <div className="p-4 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-glow">
            <Sprout className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">KisanSetu</p>
            <p className="text-xs text-muted-foreground">Delivery Partner</p>
          </div>
        </div>
        <div className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.path ||
              (item.path === "/logistics" && location.pathname === "/logistics/dashboard");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-3 py-4 mt-auto">
          <Card className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-primary/40">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium leading-tight">Delivery Partner</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Logistics Account</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleLogout}>
              <LogOut className="w-3 h-3" />
            </Button>
          </Card>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 glass-subtle border-b border-border/50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Sprout className="w-4 h-4" />
                  <span>KisanSetu</span>
                </button>
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher mode={theme.mode} onModeChange={theme.setMode} />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 flex-1">{children}</main>
      </div>
    </div>
  );
};

export default LogisticsLayout;

