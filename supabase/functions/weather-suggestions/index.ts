import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  condition: string;
}

interface ActivitySuggestion {
  activity: string;
  timing: string;
  reason: string;
  priority: "high" | "medium" | "low";
  icon: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, crop_type } = await req.json();

    // Fetch current weather
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude || 20.5937}&longitude=${longitude || 78.9629}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );

    const weatherData = await weatherResponse.json();
    const current = weatherData.current || {};
    const daily = weatherData.daily || {};

    const weather: WeatherData = {
      temperature: current.temperature_2m || 28,
      humidity: current.relative_humidity_2m || 60,
      windSpeed: current.wind_speed_10m || 10,
      rainChance: current.precipitation_probability || 0,
      condition: current.precipitation_probability > 50 ? "Rainy" : 
                 current.temperature_2m > 35 ? "Hot" : 
                 current.temperature_2m < 15 ? "Cold" : "Clear",
    };

    const suggestions: ActivitySuggestion[] = [];

    // Generate weather-based suggestions
    if (weather.rainChance > 60) {
      suggestions.push({
        activity: "Postpone Pesticide Application",
        timing: "Wait for dry weather",
        reason: "High rain probability (${weather.rainChance}%) will wash away chemicals",
        priority: "high",
        icon: "cloud-rain",
      });
      suggestions.push({
        activity: "Check Drainage Systems",
        timing: "Today",
        reason: "Ensure fields have proper drainage to prevent waterlogging",
        priority: "high",
        icon: "droplets",
      });
    } else if (weather.rainChance < 20 && weather.humidity < 50) {
      suggestions.push({
        activity: "Irrigate Crops",
        timing: "Early morning (6-8 AM)",
        reason: "Low humidity and no rain expected - crops need water",
        priority: "high",
        icon: "droplets",
      });
    }

    if (weather.temperature > 35) {
      suggestions.push({
        activity: "Provide Shade for Nurseries",
        timing: "Before noon",
        reason: "High temperature (${weather.temperature}°C) can damage young plants",
        priority: "high",
        icon: "sun",
      });
      suggestions.push({
        activity: "Water in Evening",
        timing: "After 5 PM",
        reason: "Reduce water evaporation during peak heat",
        priority: "medium",
        icon: "sunset",
      });
    }

    if (weather.windSpeed > 20) {
      suggestions.push({
        activity: "Delay Spraying",
        timing: "Wait for calm weather",
        reason: "High winds (${weather.windSpeed} km/h) will cause spray drift",
        priority: "high",
        icon: "wind",
      });
      suggestions.push({
        activity: "Secure Structures",
        timing: "Immediately",
        reason: "Check and reinforce shade nets, poly houses, and supports",
        priority: "medium",
        icon: "home",
      });
    }

    if (weather.humidity > 80) {
      suggestions.push({
        activity: "Monitor for Fungal Diseases",
        timing: "Daily inspection",
        reason: "High humidity (${weather.humidity}%) promotes fungal growth",
        priority: "high",
        icon: "eye",
      });
    }

    // General best practices based on conditions
    if (weather.condition === "Clear" && weather.temperature >= 20 && weather.temperature <= 32) {
      suggestions.push({
        activity: "Ideal for Transplanting",
        timing: "Early morning",
        reason: "Perfect weather conditions for transplanting seedlings",
        priority: "medium",
        icon: "sprout",
      });
      suggestions.push({
        activity: "Apply Fertilizers",
        timing: "Before 10 AM",
        reason: "Good absorption conditions with moderate temperature",
        priority: "medium",
        icon: "leaf",
      });
    }

    // Crop-specific suggestions
    if (crop_type) {
      const cropLower = crop_type.toLowerCase();
      if (cropLower.includes("rice") || cropLower.includes("paddy")) {
        if (weather.rainChance > 40) {
          suggestions.push({
            activity: "Good for Paddy Transplanting",
            timing: "This week",
            reason: "Expected rainfall beneficial for rice cultivation",
            priority: "medium",
            icon: "cloud-rain",
          });
        }
      }
      if (cropLower.includes("wheat")) {
        if (weather.temperature < 25) {
          suggestions.push({
            activity: "Optimal for Wheat Sowing",
            timing: "This week",
            reason: "Cool temperatures ideal for wheat germination",
            priority: "medium",
            icon: "thermometer",
          });
        }
      }
    }

    // Ensure we have at least some suggestions
    if (suggestions.length === 0) {
      suggestions.push({
        activity: "Regular Field Inspection",
        timing: "Morning",
        reason: "Weather conditions are normal - maintain routine checks",
        priority: "low",
        icon: "check-circle",
      });
    }

    // 7-day forecast summary
    const forecast = {
      tomorrow_max: daily.temperature_2m_max?.[1] || 30,
      tomorrow_min: daily.temperature_2m_min?.[1] || 20,
      tomorrow_rain: daily.precipitation_probability_max?.[1] || 0,
      week_avg_rain: daily.precipitation_probability_max?.slice(0, 7).reduce((a: number, b: number) => a + b, 0) / 7 || 0,
    };

    return new Response(
      JSON.stringify({
        current_weather: weather,
        suggestions,
        forecast,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in weather-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
