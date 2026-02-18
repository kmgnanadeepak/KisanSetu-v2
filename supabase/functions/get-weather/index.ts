import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required");
    }

    console.log(`Fetching weather for coordinates: ${latitude}, ${longitude}`);

    // Using Open-Meteo API (free, no API key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const response = await fetch(weatherUrl);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Map weather codes to conditions
    const weatherCodeMap: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with heavy hail",
    };

    const weatherCode = data.current?.weather_code || 0;
    const condition = weatherCodeMap[weatherCode] || "Unknown";

    const weatherData = {
      temperature: Math.round(data.current?.temperature_2m || 0),
      condition,
      humidity: data.current?.relative_humidity_2m || 0,
      windSpeed: Math.round(data.current?.wind_speed_10m || 0),
      precipitation: data.current?.precipitation || 0,
      rainChance: data.daily?.precipitation_probability_max?.[0] || 0,
      tempMax: Math.round(data.daily?.temperature_2m_max?.[0] || 0),
      tempMin: Math.round(data.daily?.temperature_2m_min?.[0] || 0),
    };

    console.log("Weather data fetched successfully:", weatherData);

    return new Response(JSON.stringify({ success: true, weather: weatherData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-weather:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
