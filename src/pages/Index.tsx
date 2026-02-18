import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Store, Sprout, ShoppingBag, Truck } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/hooks/useTheme";

const Index = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const roles = [
    {
      id: "farmer",
      title: "Farmer",
      description: "Detect diseases, get treatment guidance & place orders",
      icon: Leaf,
      bgClass: "bg-primary/10 group-hover:bg-primary",
      borderClass: "hover:border-primary/50",
      iconClass: "text-primary group-hover:text-primary-foreground",
    },
    {
      id: "merchant",
      title: "Merchant",
      description: "Manage stock, receive orders & grow your business",
      icon: Store,
      bgClass: "bg-accent/10 group-hover:bg-accent",
      borderClass: "hover:border-accent/50",
      iconClass: "text-accent group-hover:text-accent-foreground",
    },
    {
      id: "customer",
      title: "Customer",
      description: "Browse fresh produce & order directly from farmers",
      icon: ShoppingBag,
      bgClass: "bg-success/10 group-hover:bg-success",
      borderClass: "hover:border-success/50",
      iconClass: "text-success group-hover:text-success-foreground",
    },
    {
      id: "logistics",
      title: "Delivery Partner",
      description: "Manage assigned deliveries & track earnings",
      icon: Truck,
      bgClass: "bg-info/10 group-hover:bg-info",
      borderClass: "hover:border-info/50",
      iconClass: "text-info group-hover:text-info-foreground",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "radial-gradient(135deg, #0a1a10 0%, #060e09 100%)" }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/5 animate-float-particle"
            style={{
              width: `${10 + i * 6}px`,
              height: `${10 + i * 6}px`,
              left: `${5 + i * 20}%`,
              top: `${10 + (i % 3) * 30}%`,
              animationDelay: `${i * 1}s`,
              animationDuration: `${5 + i * 1.5}s`,
            }}
          />
        ))}
      </div>

      <header className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
            <Sprout className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">KisanSetu</span>
        </div>
        <ThemeSwitcher mode={theme.mode} onModeChange={theme.setMode} />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12 relative z-10">
        <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow-lg animate-glow-pulse">
              <Sprout className="w-14 h-14 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">
              Kisan<span className="text-gradient">Setu</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              The Farmer's Bridge — Connecting farmers, merchants & customers
            </p>
          </div>

          <div className="gradient-divider" />

          <div className="space-y-4 pt-2 stagger-children">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Select your role to continue
            </p>
            
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => navigate(`/auth?role=${role.id}`)}
                className={`w-full p-6 glass-card ${role.borderClass} group btn-ripple text-left`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl ${role.bgClass} flex items-center justify-center transition-all duration-300`}>
                    <role.icon className={`w-8 h-8 ${role.iconClass} transition-colors duration-300`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">{role.title}</h2>
                    <p className="text-muted-foreground text-sm">{role.description}</p>
                  </div>
                  <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-xl">→</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-6 text-center relative z-10">
        <p className="text-sm text-muted-foreground">© 2026 KisanSetu. Empowering Agriculture.</p>
      </footer>
    </div>
  );
};

export default Index;
