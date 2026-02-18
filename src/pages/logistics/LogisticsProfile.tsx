import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Truck, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import LogisticsLayout from "./LogisticsLayout";

type AvailabilityStatus = "available" | "busy" | "offline";

interface Profile {
  full_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
}

const LogisticsProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityStatus>("offline");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }

      const [{ data: profileData }, { data: statusData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone, city, state")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("delivery_partner_status")
          .select("status")
          .eq("partner_id", session.user.id)
          .maybeSingle(),
      ]);

      if (profileData) {
        setProfile(profileData as Profile);
      }
      if (statusData?.status) {
        setAvailability(statusData.status as AvailabilityStatus);
      }

      setLoading(false);
    };
    init();
  }, []);

  const updateAvailability = async (value: AvailabilityStatus) => {
    setAvailability(value);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("delivery_partner_status")
      .upsert({
        partner_id: session.user.id,
        status: value,
        updated_at: new Date().toISOString(),
      })
      .eq("partner_id", session.user.id);

    if (error) {
      console.error(error);
      toast.error("Failed to update availability");
    } else {
      toast.success("Availability updated");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          city: profile.city,
          state: profile.state,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const getInitials = (name?: string) =>
    (name || "DP")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <LogisticsLayout
      title="Profile & Availability"
      subtitle="Control your visibility for new delivery assignments"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={availability}
              onValueChange={(v) => updateAvailability(v as AvailabilityStatus)}
              className="space-y-3"
            >
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available" className="font-medium text-sm">
                    Available
                  </Label>
                </div>
                <span className="h-2 w-2 rounded-full bg-success" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="busy" id="busy" />
                  <Label htmlFor="busy" className="font-medium text-sm">
                    Busy
                  </Label>
                </div>
                <span className="h-2 w-2 rounded-full bg-warning" />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="offline" id="offline" />
                  <Label htmlFor="offline" className="font-medium text-sm">
                    Offline
                  </Label>
                </div>
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-10 w-10 border border-primary/40">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {profile?.full_name || "Delivery Partner"}
                  </p>
                  <p className="text-xs text-muted-foreground">Logistics Account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile?.full_name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, full_name: e.target.value } : { full_name: e.target.value, phone: null, city: null, state: null }
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="phone"
                      className="pl-9"
                      value={profile?.phone || ""}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, phone: e.target.value }
                            : { full_name: "", phone: e.target.value, city: null, state: null }
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      id="city"
                      className="pl-9"
                      value={profile?.city || ""}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev
                            ? { ...prev, city: e.target.value }
                            : { full_name: "", phone: null, city: e.target.value, state: null }
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile?.state || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? { ...prev, state: e.target.value }
                          : { full_name: "", phone: null, city: null, state: e.target.value }
                      )
                    }
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </LogisticsLayout>
  );
};

export default LogisticsProfile;

