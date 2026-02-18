import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sprout, Leaf, Store, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") as "farmer" | "merchant" | "customer" | "logistics" | null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!role || !["farmer", "merchant", "customer", "logistics"].includes(role)) {
      navigate("/");
    }
  }, [role, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer navigation to avoid blocking
        setTimeout(() => {
          redirectToDashboard();
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        redirectToDashboard();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const redirectToDashboard = () => {
    if (role === "farmer") {
      navigate("/farmer");
    } else if (role === "merchant") {
      navigate("/merchant");
    } else if (role === "customer") {
      navigate("/customer");
    } else if (role === "logistics") {
      navigate("/logistics");
    }
  };

  const validateForm = (isSignUp: boolean) => {
    try {
      authSchema.parse({
        email,
        password,
        ...(isSignUp && { fullName }),
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          full_name: fullName,
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Assign role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: role,
        });

        if (roleError) {
          console.error("Role assignment error:", roleError);
        }

        toast.success("Account created successfully!");
        redirectToDashboard();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success("Welcome back!");
        redirectToDashboard();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const RoleIcon = role === "farmer" ? Leaf : role === "customer" ? Sprout : Store;
  const roleColor = role === "farmer" ? "text-primary" : role === "customer" ? "text-success" : "text-accent";
  const roleBg = role === "farmer" ? "bg-primary/10" : role === "customer" ? "bg-success/10" : "bg-accent/10";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden hero-gradient"
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/5 animate-float-particle"
            style={{
              width: `${14 + i * 6}px`,
              height: `${14 + i * 6}px`,
              left: `${18 + i * 28}%`,
              top: `${18 + i * 18}%`,
              animationDelay: `${i}s`,
              animationDuration: `${5 + i * 1.4}s`,
            }}
          />
        ))}
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-10 md:px-6 relative z-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[460px] flex flex-col items-center gap-8">
          {/* Logo / title section */}
          <button
            onClick={() => navigate("/")}
            className="flex flex-col items-center gap-3 text-center hover:opacity-90 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-card/90 border border-border/60 flex items-center justify-center shadow-glow">
              <Sprout className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold font-display tracking-tight text-[var(--text-primary)]">
                KisanSetu Authentication
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Secure access for {role ?? "your"} smart farming workspace
              </p>
            </div>
          </button>

          {/* Single glass auth card */}
          <div className="w-full">
            <Card className="w-full animate-fade-in">
              <CardHeader className="text-center space-y-4 px-9 pt-9 pb-4 md:px-10 md:pt-10">
                <div className={`w-16 h-16 mx-auto rounded-2xl ${roleBg} flex items-center justify-center shadow-inner`}>
                  <RoleIcon className={`w-8 h-8 ${roleColor}`} />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-extrabold font-display capitalize">
                    {role ? `${role} portal` : "Welcome back"}
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">
                    {role === "farmer"
                      ? "Manage crops, detect diseases & connect with merchants."
                      : role === "merchant"
                        ? "Oversee inventory, orders & serve your farmer network."
                        : role === "customer"
                          ? "Discover fresh produce directly from trusted farmers."
                          : role === "logistics"
                            ? "Accept deliveries, track routes & manage earnings."
                            : "Sign in or create an account to continue."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-9 pb-9 pt-2 md:px-10 md:pb-10">
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 glass-subtle border border-border/60">
                    <TabsTrigger value="login" className="data-[state=active]:text-[var(--text-primary)]">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:text-[var(--text-primary)]">
                      Create Account
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-[var(--text-secondary)]">
                          Email
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-[var(--text-secondary)]">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        variant={role === "farmer" ? "farmer" : role === "customer" ? "customer" : "merchant"}
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-[var(--text-secondary)]">
                          Full Name
                        </Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={loading}
                        />
                        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-[var(--text-secondary)]">
                          Email
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-[var(--text-secondary)]">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        variant={role === "farmer" ? "farmer" : role === "customer" ? "customer" : "merchant"}
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
