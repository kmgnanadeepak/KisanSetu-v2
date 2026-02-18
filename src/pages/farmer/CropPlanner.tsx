import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { callAI } from "@/lib/callAI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Droplets,
  IndianRupee,
  Loader2,
  MapPin,
  Sprout,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  soilType: z.enum(["sandy", "clay", "loamy", "black", "red"], {
    required_error: "Select a soil type",
  }),
  region: z
    .string()
    .min(1, "Region is required")
    .max(120, "Region is too long"),
  season: z.enum(["Kharif", "Rabi", "Summer"], {
    required_error: "Select a season",
  }),
  waterAvailability: z.enum(["Low", "Medium", "High"], {
    required_error: "Select water availability",
  }),
  budget: z.coerce
    .number({
      required_error: "Budget is required",
      invalid_type_error: "Enter a valid budget",
    })
    .positive("Budget must be greater than 0"),
  farmSize: z.coerce
    .number({
      required_error: "Farm size is required",
      invalid_type_error: "Enter a valid farm size",
    })
    .positive("Farm size must be greater than 0"),
});

type FormValues = z.infer<typeof formSchema>;

type Recommendation = {
  crop: string;
  expectedProfit: string;
  expectedProfitValue?: number;
  expectedPriceRange: string;
  fertilizers: string[];
  waterNeed: string;
  whyRecommended?: string;
};

type CachePayload = {
  input: FormValues;
  recommendations: Recommendation[];
  cachedAt: string;
};

const CACHE_KEY = "kisansetu.smartCropPlanner.cache";

const CropPlanner = () => {
  const navigate = useNavigate();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [lastCachedAt, setLastCachedAt] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      soilType: "loamy",
      region: "",
      season: "Kharif",
      waterAvailability: "Medium",
      budget: 50000,
      farmSize: 1,
    },
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          navigate("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("city, state")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const city = (profile as any)?.city?.trim();
        const state = (profile as any)?.state?.trim();
        const region =
          city && state
            ? `${city}, ${state}`
            : state || city || "";

        if (region && !form.getValues("region")) {
          form.setValue("region", region, { shouldDirty: false });
        }
      } catch (error) {
        console.error("Failed to prefill region from profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    bootstrap();

    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachePayload = JSON.parse(raw);
        if (parsed?.input) {
          form.reset(parsed.input);
        }
        if (Array.isArray(parsed?.recommendations)) {
          setRecommendations(parsed.recommendations);
        }
        if (parsed.cachedAt) {
          setLastCachedAt(parsed.cachedAt);
        }
      }
    } catch (error) {
      console.warn("Failed to load cached crop plan:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const chartData = useMemo(() => {
    const parseProfit = (rec: Recommendation) => {
      if (typeof rec.expectedProfitValue === "number" && !Number.isNaN(rec.expectedProfitValue)) {
        return rec.expectedProfitValue;
      }
      const match = String(rec.expectedProfit).replace(/,/g, "").match(/(\d+(\.\d+)?)/);
      return match ? Number(match[1]) : 0;
    };

    return recommendations.slice(0, 3).map((rec) => ({
      name: rec.crop,
      profit: parseProfit(rec),
    }));
  }, [recommendations]);

  const onSubmit = async (values: FormValues) => {
    setAnalyzing(true);
    try {
      const data = await callAI("crop-recommendation", values);
      const recs = Array.isArray(data.recommendations) ? data.recommendations : [];

      if (!recs.length) {
        toast.info("No strong matches found. Try adjusting your inputs.");
      }

      setRecommendations(recs);

      const payload: CachePayload = {
        input: values,
        recommendations: recs,
        cachedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      setLastCachedAt(payload.cachedAt);
    } catch (error) {
      console.error("Unexpected error while calling crop-planner API:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const chartConfig = {
    profit: {
      label: "Expected profit (₹/acre)",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
      <header className="sticky top-0 z-40 glass border-b border-border/60 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Smart Crop Planner</h1>
              <p className="text-xs text-muted-foreground">
                AI-powered planning using soil, season, water & mandi trends
              </p>
            </div>
          </div>
        </div>
      </header>

      {analyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm border-primary/30 shadow-2xl animate-fade-in">
            <CardHeader className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <CardTitle className="text-base">Analyzing regional data...</CardTitle>
              <CardDescription className="text-center text-xs">
                Combining soil profile, season, water constraints, mandi price trends and input costs
                to rank the most profitable crops for your farm.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] items-start">
          <Card className="border-primary/15 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Plan next season</span>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Sparkles className="w-3 h-3 text-primary" />
                  AI-powered
                </Badge>
              </CardTitle>
              <CardDescription>
                Fill in your farm details and let KisanSetu suggest the most profitable crops for the
                coming season.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="soilType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soil type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select soil type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sandy">Sandy</SelectItem>
                              <SelectItem value="clay">Clay</SelectItem>
                              <SelectItem value="loamy">Loamy</SelectItem>
                              <SelectItem value="black">Black</SelectItem>
                              <SelectItem value="red">Red</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="e.g. Nashik, Maharashtra"
                                {...field}
                              />
                              <MapPin className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
                            </div>
                          </FormControl>
                          <FormMessage />
                          {loadingProfile && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Prefilling from your profile...
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="season"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Season</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select season" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Kharif">Kharif</SelectItem>
                              <SelectItem value="Rabi">Rabi</SelectItem>
                              <SelectItem value="Summer">Summer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="waterAvailability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water availability</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (₹)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                              <Input
                                type="number"
                                min={0}
                                step={1000}
                                className="pl-8"
                                placeholder="Total budget for this season"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="farmSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm size (acres)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0.1}
                              step={0.1}
                              placeholder="e.g. 2.5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Droplets className="w-3 h-3" />
                        <span>Optimizes water & risk</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Sprout className="w-3 h-3" />
                        <span>Tailored for Indian mandi prices</span>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="gap-2"
                      disabled={analyzing}
                    >
                      {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Generate plan</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Profit outlook (top 3 crops)</span>
                  <Badge variant="outline" className="text-[11px]">
                    Premium insight
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Subtle visualization of expected profit per acre across your best-fit crops.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length ? (
                  <ChartContainer config={chartConfig}>
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `₹${Math.round(value / 1000)}k`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="name"
                            labelKey="name"
                          />
                        }
                      />
                      <Bar
                        dataKey="profit"
                        fill="var(--color-profit)"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Run the planner to see a comparative profit view for your top crops.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI recommendations</CardTitle>
                <CardDescription className="text-xs">
                  Ranked suggestions combining crop suitability rules, mandi trends and cost estimates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {lastCachedAt && (
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 px-3 py-2 text-xs">
                    <div className="flex flex-col">
                      <span className="font-medium">Last plan cached</span>
                      <span className="text-muted-foreground">
                        {new Date(lastCachedAt).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Instant reopen
                    </Badge>
                  </div>
                )}

                {recommendations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recommendations yet. Fill in your farm details and generate a plan to see AI-picked
                    crops for your next season.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div
                        key={`${rec.crop}-${index}`}
                        className="rounded-xl border border-border/60 bg-background/60 px-3 py-3 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <h3 className="font-semibold flex items-center gap-1.5">
                                <Sprout className="w-4 h-4 text-primary" />
                                {rec.crop}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.whyRecommended ||
                                "Recommended based on your soil, region, season, water availability and budget."}
                            </p>
                          </div>
                          <Badge variant={index === 0 ? "default" : "outline"} className="text-[11px]">
                            {index === 0 ? "Best fit" : "Alternative"}
                          </Badge>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3 mt-1">
                          <div className="rounded-lg bg-muted/60 px-2.5 py-1.5 flex flex-col gap-0.5">
                            <Label className="text-[10px] uppercase text-muted-foreground tracking-wide">
                              Profit estimate
                            </Label>
                            <span className="text-sm font-semibold">{rec.expectedProfit}</span>
                          </div>
                          <div className="rounded-lg bg-muted/60 px-2.5 py-1.5 flex flex-col gap-0.5">
                            <Label className="text-[10px] uppercase text-muted-foreground tracking-wide">
                              Market price
                            </Label>
                            <span className="text-sm font-medium">{rec.expectedPriceRange}</span>
                          </div>
                          <div className="rounded-lg bg-muted/60 px-2.5 py-1.5 flex flex-col gap-0.5">
                            <Label className="text-[10px] uppercase text-muted-foreground tracking-wide">
                              Water requirement
                            </Label>
                            <span className="text-sm font-medium flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-primary" />
                              {rec.waterNeed}
                            </span>
                          </div>
                        </div>

                        {rec.fertilizers?.length > 0 && (
                          <div className="mt-1">
                            <Label className="text-[10px] uppercase text-muted-foreground tracking-wide">
                              Recommended fertilizers / inputs
                            </Label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {rec.fertilizers.map((f, fIdx) => (
                                <Badge key={`${rec.crop}-fert-${fIdx}`} variant="outline" className="text-[11px]">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-primary/20 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium">How this works</p>
              <p className="text-muted-foreground">
                Your inputs feed into an AI model backed by rule-based agronomy logic, mandi price trends
                (mock data) and input cost estimates to rank crops by expected profit per acre.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Sprout className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Always cross-check with your local agronomist before final decisions.
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CropPlanner;

