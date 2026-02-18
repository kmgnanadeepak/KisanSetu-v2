import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Plus,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  listing: {
    id: string;
    farmer_id: string;
    title: string;
    price: number;
    unit: string;
  };
}

interface Address {
  id: string;
  label: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  phone: string | null;
  is_default: boolean;
}

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deliveryPreference, setDeliveryPreference] = useState("any");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "Home",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await Promise.all([fetchCart(session.user.id), fetchAddresses(session.user.id)]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchCart = async (userId: string) => {
    const { data } = await supabase
      .from("customer_cart")
      .select(`
        id,
        listing_id,
        quantity,
        listing:marketplace_listings (
          id,
          farmer_id,
          title,
          price,
          unit
        )
      `)
      .eq("customer_id", userId);

    const validItems = (data || []).filter(item => item.listing) as unknown as CartItem[];
    setCartItems(validItems);
  };

  const fetchAddresses = async (userId: string) => {
    const { data } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", userId)
      .order("is_default", { ascending: false });

    const addrs = (data || []) as Address[];
    setAddresses(addrs);
    
    // Select default address
    const defaultAddr = addrs.find(a => a.is_default);
    if (defaultAddr) {
      setSelectedAddressId(defaultAddr.id);
    } else if (addrs.length > 0) {
      setSelectedAddressId(addrs[0].id);
    }
  };

  const addNewAddress = async () => {
    if (!currentUserId) return;
    if (!newAddress.address_line || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error("Please fill all required fields");
      return;
    }

    const { data, error } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: currentUserId,
        ...newAddress,
        is_default: addresses.length === 0,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add address");
      return;
    }

    const addr = data as Address;
    setAddresses([...addresses, addr]);
    setSelectedAddressId(addr.id);
    setShowAddAddress(false);
    setNewAddress({
      label: "Home",
      address_line: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
    });
    toast.success("Address added");
  };

  const placeOrder = async () => {
    if (!currentUserId || !selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      // Group by farmer
      const ordersByFarmer: Record<string, CartItem[]> = {};
      cartItems.forEach(item => {
        const farmerId = item.listing.farmer_id;
        if (!ordersByFarmer[farmerId]) {
          ordersByFarmer[farmerId] = [];
        }
        ordersByFarmer[farmerId].push(item);
      });

      // Create orders for each farmer
      const orderPromises = Object.entries(ordersByFarmer).map(async ([farmerId, items]) => {
        const ordersData = items.map(item => ({
          customer_id: currentUserId,
          farmer_id: farmerId,
          listing_id: item.listing_id,
          quantity: item.quantity,
          total_price: item.listing.price * item.quantity,
          delivery_address_id: selectedAddressId,
          delivery_preference: deliveryPreference,
          notes: notes || null,
          estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        }));

        const { data: insertedOrders, error: orderError } = await supabase
          .from("customer_orders")
          .insert(ordersData)
          .select("id");

        if (orderError) throw orderError;

        const orderIds = (insertedOrders || []).map(o => o.id as string);

        // Trigger automatic delivery assignment asynchronously (fire-and-forget)
        if (orderIds.length > 0) {
          supabase.functions.invoke("logistics-assignment", {
            body: {
              action: "assign",
              // If multiple orders were created, we just pass the first one for assignment.
              // The assignment service can also be run in bulk via assignPending if needed.
              order_id: orderIds[0],
            },
          }).catch((err) => {
            console.error("Failed to invoke logistics-assignment for new order", err);
          });
        }

        // Notify farmer
        await supabase.functions.invoke("create-notification", {
          body: {
            user_id: farmerId,
            type: "customer_order",
            title: "New Customer Order!",
            message: `You have ${items.length} new item(s) ordered`,
            data: { items: items.length },
          },
        });
      });

      await Promise.all(orderPromises);

      // Clear cart
      await supabase
        .from("customer_cart")
        .delete()
        .eq("customer_id", currentUserId);

      toast.success("Orders placed successfully!");
      navigate("/customer/orders");
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = cartItems.reduce((sum, item) => sum + item.listing.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customer/cart")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Checkout</h1>
            <p className="text-sm text-muted-foreground">Complete your order</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Delivery Address */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </CardTitle>
            <Dialog open={showAddAddress} onOpenChange={setShowAddAddress}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Address</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                      placeholder="Home, Office, etc."
                    />
                  </div>
                  <div>
                    <Label>Address *</Label>
                    <Textarea
                      value={newAddress.address_line}
                      onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City *</Label>
                      <Input
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>State *</Label>
                      <Input
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pincode *</Label>
                      <Input
                        value={newAddress.pincode}
                        onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button variant="farmer" className="w-full" onClick={addNewAddress}>
                    Save Address
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No addresses saved. Add one to continue.
              </p>
            ) : (
              <RadioGroup value={selectedAddressId || ""} onValueChange={setSelectedAddressId}>
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="flex items-start gap-3">
                      <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                      <label htmlFor={addr.id} className="flex-1 cursor-pointer">
                        <p className="font-medium">{addr.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        {addr.phone && <p className="text-sm text-muted-foreground">{addr.phone}</p>}
                      </label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Delivery Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Delivery Preference
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={deliveryPreference} onValueChange={setDeliveryPreference}>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <label htmlFor="morning" className="cursor-pointer">Morning</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="evening" id="evening" />
                  <label htmlFor="evening" className="cursor-pointer">Evening</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="any" id="any" />
                  <label htmlFor="any" className="cursor-pointer">Any Time</label>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Order Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
            />
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.listing.title} x {item.quantity}</span>
                <span>₹{(item.listing.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
            <Button
              variant="farmer"
              size="lg"
              className="w-full"
              onClick={placeOrder}
              disabled={submitting || !selectedAddressId || cartItems.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Placing Order...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerCheckout;
