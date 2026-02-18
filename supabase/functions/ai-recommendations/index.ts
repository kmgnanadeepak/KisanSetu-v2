import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateCropRecommendations } from "../services/ai.service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { customer_id } = await req.json();

    if (!customer_id) {
      throw new Error("customer_id is required");
    }

    // Fetch customer order history
    const { data: orderHistory } = await supabase
      .from("customer_orders")
      .select(`
        listing:marketplace_listings (
          category,
          title,
          farming_method
        )
      `)
      .eq("customer_id", customer_id)
      .eq("status", "delivered")
      .limit(20);

    // Fetch current available listings
    const { data: availableListings } = await supabase
      .from("marketplace_listings")
      .select("id, title, category, farming_method, price, quantity, unit, location")
      .eq("status", "active")
      .limit(50);

    // Build context for AI
    const purchasedCategories = orderHistory
      ?.map(o => (o.listing as any)?.category)
      .filter(Boolean) || [];
    
    const purchasedItems = orderHistory
      ?.map(o => (o.listing as any)?.title)
      .filter(Boolean) || [];

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    const prompt = `Based on the following customer purchase history and current available produce, suggest 5 personalized crop recommendations.

Customer Purchase History:
- Categories bought: ${[...new Set(purchasedCategories)].join(", ") || "None yet"}
- Items purchased: ${[...new Set(purchasedItems)].slice(0, 10).join(", ") || "None yet"}
- Current month: ${currentMonth} (consider seasonal availability)

Available listings:
${availableListings?.map(l => `- ${l.title} (${l.category}, ₹${l.price}/${l.unit}, ${l.farming_method || 'conventional'})`).join("\n") || "None"}

Provide recommendations that:
1. Match customer preferences based on history
2. Consider seasonal availability for ${currentMonth}
3. Include a mix of their favorites and new discoveries
4. Prioritize organic/sustainable options when available`;

    const recommendations = await generateCropRecommendations(prompt, GEMINI_API_KEY);

    // Save recommendations to customer preferences
    await supabase
      .from("customer_preferences")
      .upsert({
        customer_id,
        last_recommendations: recommendations,
        recommendations_updated_at: new Date().toISOString(),
      }, { onConflict: 'customer_id' });

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
