import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
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
import { format, isSameDay, isToday, isFuture } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Calendar as CalendarIcon,
  Droplets,
  Leaf,
  Bug,
  Truck,
  CloudRain,
  Sun,
  Thermometer,
  Loader2,
  Trash2,
  Bell,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  completed: boolean;
  reminder_enabled: boolean;
  crop_type: string | null;
  weather_dependent: boolean;
  suggested_by_ai: boolean;
}

interface WeatherSuggestion {
  activity: string;
  timing: string;
  reason: string;
  priority: "high" | "medium" | "low";
  icon: string;
}

const eventTypes = [
  { value: "planting", label: "Planting", icon: Leaf, color: "bg-success" },
  { value: "irrigation", label: "Irrigation", icon: Droplets, color: "bg-info" },
  { value: "fertilizing", label: "Fertilizing", icon: Sparkles, color: "bg-warning" },
  { value: "pesticide", label: "Pesticide", icon: Bug, color: "bg-destructive" },
  { value: "harvest", label: "Harvest", icon: Truck, color: "bg-primary" },
  { value: "other", label: "Other", icon: CalendarIcon, color: "bg-muted" },
];

const FarmerCalendar = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weatherSuggestions, setWeatherSuggestions] = useState<WeatherSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_type: "planting",
    reminder_enabled: true,
    crop_type: "",
    weather_dependent: false,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      setCurrentUserId(session.user.id);
      await fetchEvents(session.user.id);
      await fetchWeatherSuggestions();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchEvents = async (userId: string) => {
    const { data, error } = await supabase
      .from("farmer_calendar")
      .select("*")
      .eq("farmer_id", userId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }
    setEvents((data || []) as CalendarEvent[]);
  };

  const fetchWeatherSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("weather-suggestions", {
        body: { latitude: null, longitude: null },
      });

      if (!error && data?.suggestions) {
        setWeatherSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Error fetching weather suggestions:", err);
    }
    setLoadingSuggestions(false);
  };

  const handleAddEvent = async () => {
    if (!currentUserId || !newEvent.title || !newEvent.event_date) {
      toast.error("Please fill required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("farmer_calendar").insert({
        farmer_id: currentUserId,
        title: newEvent.title,
        description: newEvent.description || null,
        event_date: newEvent.event_date,
        event_type: newEvent.event_type,
        reminder_enabled: newEvent.reminder_enabled,
        crop_type: newEvent.crop_type || null,
        weather_dependent: newEvent.weather_dependent,
      });

      if (error) throw error;

      toast.success("Event added");
      setIsAddDialogOpen(false);
      setNewEvent({
        title: "",
        description: "",
        event_date: format(new Date(), "yyyy-MM-dd"),
        event_type: "planting",
        reminder_enabled: true,
        crop_type: "",
        weather_dependent: false,
      });
      fetchEvents(currentUserId);
    } catch (err) {
      console.error("Error adding event:", err);
      toast.error("Failed to add event");
    }
    setSubmitting(false);
  };

  const toggleCompleted = async (event: CalendarEvent) => {
    const { error } = await supabase
      .from("farmer_calendar")
      .update({ completed: !event.completed })
      .eq("id", event.id);

    if (!error && currentUserId) {
      fetchEvents(currentUserId);
      toast.success(event.completed ? "Marked incomplete" : "Marked complete");
    }
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("farmer_calendar")
      .delete()
      .eq("id", eventId);

    if (!error && currentUserId) {
      fetchEvents(currentUserId);
      toast.success("Event deleted");
    }
  };

  const addSuggestionAsEvent = async (suggestion: WeatherSuggestion) => {
    if (!currentUserId) return;

    const { error } = await supabase.from("farmer_calendar").insert({
      farmer_id: currentUserId,
      title: suggestion.activity,
      description: suggestion.reason,
      event_date: format(new Date(), "yyyy-MM-dd"),
      event_type: "other",
      reminder_enabled: true,
      weather_dependent: true,
      suggested_by_ai: true,
    });

    if (!error) {
      toast.success("Added to calendar");
      fetchEvents(currentUserId);
    }
  };

  const eventsForSelectedDate = events.filter(e => 
    isSameDay(new Date(e.event_date), selectedDate)
  );

  const upcomingEvents = events
    .filter(e => isFuture(new Date(e.event_date)) || isToday(new Date(e.event_date)))
    .filter(e => !e.completed)
    .slice(0, 5);

  const getEventTypeConfig = (type: string) => {
    return eventTypes.find(t => t.value === type) || eventTypes[eventTypes.length - 1];
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
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/farmer")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Smart Farming Calendar</h1>
              <p className="text-sm text-muted-foreground">Plan your farming activities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="farmer" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Calendar Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="e.g., Plant tomatoes"
                    />
                  </div>
                  <div>
                    <Label>Event Type</Label>
                    <Select
                      value={newEvent.event_type}
                      onValueChange={(v) => setNewEvent({ ...newEvent, event_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Crop Type</Label>
                    <Input
                      value={newEvent.crop_type}
                      onChange={(e) => setNewEvent({ ...newEvent, crop_type: e.target.value })}
                      placeholder="e.g., Wheat, Rice"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Additional notes..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newEvent.reminder_enabled}
                        onCheckedChange={(c) => setNewEvent({ ...newEvent, reminder_enabled: !!c })}
                      />
                      <Label>Enable Reminder</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={newEvent.weather_dependent}
                        onCheckedChange={(c) => setNewEvent({ ...newEvent, weather_dependent: !!c })}
                      />
                      <Label>Weather Dependent</Label>
                    </div>
                  </div>
                  <Button variant="farmer" className="w-full" onClick={handleAddEvent} disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                modifiers={{
                  hasEvents: events.map(e => new Date(e.event_date)),
                }}
                modifiersClassNames={{
                  hasEvents: "bg-primary/20 font-bold",
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Events for Selected Date */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Events for {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsForSelectedDate.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events scheduled</p>
              ) : (
                <div className="space-y-3">
                  {eventsForSelectedDate.map((event) => {
                    const config = getEventTypeConfig(event.event_type);
                    const Icon = config.icon;
                    
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          event.completed ? "opacity-50" : ""
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${event.completed ? "line-through" : ""}`}>
                              {event.title}
                            </h4>
                            {event.reminder_enabled && <Bell className="w-3 h-3 text-muted-foreground" />}
                            {event.weather_dependent && <CloudRain className="w-3 h-3 text-info" />}
                            {event.suggested_by_ai && (
                              <Badge variant="secondary" className="text-xs">AI</Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                          )}
                          {event.crop_type && (
                            <Badge variant="outline" className="mt-2">{event.crop_type}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={event.completed}
                            onCheckedChange={() => toggleCompleted(event)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weather-Based Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-warning" />
              Weather-Based Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : weatherSuggestions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No suggestions available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weatherSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      suggestion.priority === "high" ? "border-destructive bg-destructive/5" :
                      suggestion.priority === "medium" ? "border-warning bg-warning/5" :
                      "border-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{suggestion.activity}</h4>
                      <Badge
                        className={
                          suggestion.priority === "high" ? "bg-destructive" :
                          suggestion.priority === "medium" ? "bg-warning" :
                          "bg-muted"
                        }
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.timing}</p>
                    <p className="text-sm mt-2">{suggestion.reason}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => addSuggestionAsEvent(suggestion)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const config = getEventTypeConfig(event.event_type);
                  const Icon = config.icon;
                  
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Icon className={`w-4 h-4 ${config.color.replace("bg-", "text-")}`} />
                      <span className="flex-1">{event.title}</span>
                      <Badge variant="outline">
                        {format(new Date(event.event_date), "MMM d")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FarmerCalendar;
