import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Package,
  ShoppingBag,
  MapPin,
  Phone,
  Loader2,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { Mic } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface Listing {
  id: string;
  farmer_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  image_url: string | null;
  location: string | null;
  status: string;
  created_at: string;
  farmer_name?: string;
}

interface MarketplaceOrder {
  id: string;
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  total_price: number;
  status: string;
  notes: string | null;
  created_at: string;
  listing?: Listing;
}

const produceCategories = [
  "Vegetables",
  "Fruits",
  "Grains",
  "Pulses",
  "Spices",
  "Dairy",
  "Other",
];

const VoiceFieldButton = ({ onText }: { onText: (value: string) => void }) => {
  const {
    supported,
    isListening,
    finalTranscript,
    detectedLanguage,
    startListening,
    stopListening,
    resetTranscript,
    resetError,
  } = useVoiceInput();

  const handleClick = () => {
    if (!supported) {
      return;
    }
    resetError();
    if (isListening) {
      stopListening();
      return;
    }
    resetTranscript();
    startListening();
  };

  if (finalTranscript) {
    onText(finalTranscript);
    resetTranscript();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted hover:bg-primary/10 border border-muted-foreground/20"
      title={
        supported
          ? `Tap to speak (${detectedLanguage.label || "Auto"})`
          : "Voice input not supported"
      }
    >
      <Mic className={`w-3 h-3 ${isListening ? "text-red-500" : "text-muted-foreground"}`} />
    </button>
  );
};

const Marketplace = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state for new listing
  const [newListing, setNewListing] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    unit: "kg",
    location: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await Promise.all([fetchListings(), fetchMyListings(session.user.id), fetchMyOrders(session.user.id)]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      return;
    }
    setListings((data || []) as unknown as Listing[]);
  };

  const fetchMyListings = async (userId: string) => {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("farmer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my listings:", error);
      return;
    }
    setMyListings((data || []) as unknown as Listing[]);
  };

  const fetchMyOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select("*")
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }
    setMyOrders((data || []) as unknown as MarketplaceOrder[]);
  };

  const handleAddListing = async () => {
    if (!currentUserId) return;
    if (!newListing.title || !newListing.category || !newListing.price || !newListing.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("marketplace_listings").insert({
        farmer_id: currentUserId,
        title: newListing.title,
        description: newListing.description,
        category: newListing.category,
        price: parseFloat(newListing.price),
        quantity: parseFloat(newListing.quantity),
        unit: newListing.unit,
        location: newListing.location || null,
      });

      if (error) throw error;

      toast.success("Listing created successfully!");
      setIsAddDialogOpen(false);
      setNewListing({
        title: "",
        description: "",
        category: "",
        price: "",
        quantity: "",
        unit: "kg",
        location: "",
      });
      fetchMyListings(currentUserId);
      fetchListings();
    } catch (err) {
      console.error("Error creating listing:", err);
      toast.error("Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!currentUserId || !selectedListing) return;
    if (orderQuantity <= 0 || orderQuantity > selectedListing.quantity) {
      toast.error("Invalid quantity");
      return;
    }

    setSubmitting(true);
    try {
      const totalPrice = selectedListing.price * orderQuantity;

      const { error } = await supabase.from("marketplace_orders").insert({
        listing_id: selectedListing.id,
        buyer_id: currentUserId,
        farmer_id: selectedListing.farmer_id,
        quantity: orderQuantity,
        total_price: totalPrice,
        notes: orderNotes || null,
      });

      if (error) throw error;

      // Create notification for the farmer
      await supabase.functions.invoke("create-notification", {
        body: {
          user_id: selectedListing.farmer_id,
          type: "marketplace_order",
          title: "New Order Received!",
          message: `Someone ordered ${orderQuantity} ${selectedListing.unit} of ${selectedListing.title}`,
          data: { listing_id: selectedListing.id },
        },
      });

      toast.success("Order placed successfully!");
      setIsOrderDialogOpen(false);
      setOrderQuantity(1);
      setOrderNotes("");
      setSelectedListing(null);
      fetchMyOrders(currentUserId);
    } catch (err) {
      console.error("Error placing order:", err);
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId);

      if (error) throw error;

      toast.success("Listing deleted");
      if (currentUserId) {
        fetchMyListings(currentUserId);
        fetchListings();
      }
    } catch (err) {
      console.error("Error deleting listing:", err);
      toast.error("Failed to delete listing");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary";
      case "pending":
        return "bg-warning";
      case "confirmed":
        return "bg-success";
      case "delivered":
        return "bg-primary";
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Marketplace</h1>
              <p className="text-sm text-muted-foreground">Buy & sell produce</p>
            </div>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="browse">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-listings">
              <Package className="w-4 h-4 mr-2" />
              My Listings
            </TabsTrigger>
            <TabsTrigger value="my-orders">
              <ShoppingBag className="w-4 h-4 mr-2" />
              My Orders
            </TabsTrigger>
          </TabsList>

          {/* Browse Listings */}
          <TabsContent value="browse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.filter(l => l.farmer_id !== currentUserId).length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No listings available right now</p>
                </div>
              ) : (
                listings
                  .filter((l) => l.farmer_id !== currentUserId)
                  .map((listing) => (
                    <Card key={listing.id} className="hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{listing.title}</CardTitle>
                            <CardDescription>{listing.category}</CardDescription>
                          </div>
                          <Badge className="bg-primary">
                            ₹{listing.price}/{listing.unit}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {listing.description && (
                          <p className="text-sm text-muted-foreground">{listing.description}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Available: {listing.quantity} {listing.unit}
                          </span>
                          {listing.location && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {listing.location}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="farmer"
                          className="w-full"
                          onClick={() => {
                            setSelectedListing(listing);
                            setIsOrderDialogOpen(true);
                          }}
                        >
                          Order Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>

          {/* My Listings */}
          <TabsContent value="my-listings">
            <div className="mb-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="farmer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Listing
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Listing</DialogTitle>
                    <DialogDescription>
                      List your produce for sale on the marketplace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Input
                            id="title"
                            value={newListing.title}
                            onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                            placeholder="e.g., Fresh Tomatoes"
                            className="pr-10"
                          />
                          <div className="absolute inset-y-0 right-2 flex items-center">
                            <VoiceFieldButton
                              onText={(value) =>
                                setNewListing((prev) => ({ ...prev, title: value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={newListing.category}
                        onValueChange={(value) => setNewListing({ ...newListing, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {produceCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price (₹) *</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Input
                              id="price"
                              type="number"
                              value={newListing.price}
                              onChange={(e) =>
                                setNewListing({ ...newListing, price: e.target.value })
                              }
                              placeholder="50"
                              className="pr-10"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center">
                              <VoiceFieldButton
                                onText={(value) =>
                                  setNewListing((prev) => ({ ...prev, price: value }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Input
                              id="quantity"
                              type="number"
                              value={newListing.quantity}
                              onChange={(e) =>
                                setNewListing({ ...newListing, quantity: e.target.value })
                              }
                              placeholder="100"
                              className="pr-10"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center">
                              <VoiceFieldButton
                                onText={(value) =>
                                  setNewListing((prev) => ({ ...prev, quantity: value }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={newListing.unit}
                        onValueChange={(value) => setNewListing({ ...newListing, unit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilogram (kg)</SelectItem>
                          <SelectItem value="quintal">Quintal</SelectItem>
                          <SelectItem value="ton">Ton</SelectItem>
                          <SelectItem value="piece">Piece</SelectItem>
                          <SelectItem value="dozen">Dozen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newListing.description}
                        onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                        placeholder="Describe your produce..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 relative">
                          <Input
                            id="location"
                            value={newListing.location}
                            onChange={(e) =>
                              setNewListing({ ...newListing, location: e.target.value })
                            }
                            placeholder="Village/City name"
                            className="pr-10"
                          />
                          <div className="absolute inset-y-0 right-2 flex items-center">
                            <VoiceFieldButton
                              onText={(value) =>
                                setNewListing((prev) => ({ ...prev, location: value }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="farmer"
                      className="w-full"
                      onClick={handleAddListing}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Listing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't created any listings yet</p>
                </div>
              ) : (
                myListings.map((listing) => (
                  <Card key={listing.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{listing.title}</CardTitle>
                          <CardDescription>{listing.category}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span>₹{listing.price}/{listing.unit}</span>
                        <span className="text-muted-foreground">
                          Stock: {listing.quantity} {listing.unit}
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteListing(listing.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* My Orders */}
          <TabsContent value="my-orders">
            <div className="space-y-4">
              {myOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>You haven't placed any orders yet</p>
                </div>
              ) : (
                myOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {order.quantity} | Total: ₹{order.total_price}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>
              Order {selectedListing?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedListing && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{selectedListing.title}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{selectedListing.price}/{selectedListing.unit}
                </p>
                <p className="text-sm text-muted-foreground">
                  Available: {selectedListing.quantity} {selectedListing.unit}
                </p>
              </div>
              <div>
                <Label htmlFor="orderQty">Quantity ({selectedListing.unit})</Label>
                <Input
                  id="orderQty"
                  type="number"
                  min="1"
                  max={selectedListing.quantity}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="orderNotes">Notes (optional)</Label>
                <Textarea
                  id="orderNotes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special instructions..."
                />
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{(selectedListing.price * orderQuantity).toFixed(2)}
                </p>
              </div>
              <Button
                variant="farmer"
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Order
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
