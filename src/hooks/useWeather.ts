import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  rainChance: number;
  tempMax: number;
  tempMin: number;
}

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (latitude: number, longitude: number) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke("get-weather", {
        body: { latitude, longitude },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.success && data?.weather) {
        setWeather(data.weather);
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
      // Set fallback weather data
      setWeather({
        temperature: 28,
        condition: "Partly cloudy",
        humidity: 65,
        windSpeed: 12,
        precipitation: 0,
        rainChance: 20,
        tempMax: 32,
        tempMin: 24,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (geoError) => {
          console.warn("Geolocation error:", geoError.message);
          // Default to Delhi coordinates
          fetchWeather(28.6139, 77.209);
        },
        { timeout: 5000 }
      );
    } else {
      // Default coordinates for Delhi
      fetchWeather(28.6139, 77.209);
    }
  }, [fetchWeather]);

  return { weather, loading, error, refetch: fetchWeather };
};
