import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callAI } from "@/lib/callAI";

interface Recommendation {
  title: string;
  category: string;
  reason: string;
  listing_id?: string;
  priority: "high" | "medium" | "low";
}

interface RecommendationsResult {
  recommendations: Recommendation[];
  seasonal_tip: string;
}

export const useAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [seasonalTip, setSeasonalTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Not authenticated");
        return;
      }

      // First try to get cached recommendations
      const { data: prefs } = await supabase
        .from("customer_preferences")
        .select("last_recommendations, recommendations_updated_at")
        .eq("customer_id", session.user.id)
        .single();

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (prefs?.last_recommendations && prefs.recommendations_updated_at) {
        const updatedAt = new Date(prefs.recommendations_updated_at);
        if (updatedAt > oneHourAgo) {
          const cached = prefs.last_recommendations as unknown as RecommendationsResult;
          setRecommendations(cached.recommendations || []);
          setSeasonalTip(cached.seasonal_tip || "");
          setLoading(false);
          return;
        }
      }

      // Fetch fresh recommendations via centralized backend
      const data = await callAI("customer-recommendations", {
        customer_id: session.user.id,
      });

      if (data) {
        setRecommendations(data.recommendations || []);
        setSeasonalTip(data.seasonal_tip || "");
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError(err instanceof Error ? err.message : "Failed to get recommendations");
    }

    setLoading(false);
  }, []);

  return {
    recommendations,
    seasonalTip,
    loading,
    error,
    fetchRecommendations,
  };
};
