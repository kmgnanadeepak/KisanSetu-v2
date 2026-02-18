import { createClient } from "@supabase/supabase-js";
import { generateGroqText } from "./vision.service.js";

export async function generateCustomerRecommendations(customerId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    .eq("customer_id", customerId)
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
    ?.map((o) => o.listing?.category)
    .filter(Boolean) || [];

  const purchasedItems = orderHistory
    ?.map((o) => o.listing?.title)
    .filter(Boolean) || [];

  const currentMonth = new Date().toLocaleString("default", { month: "long" });

  const prompt = `Based on the following customer purchase history and current available produce, suggest 5 personalized crop recommendations.

Customer Purchase History:
- Categories bought: ${[...new Set(purchasedCategories)].join(", ") || "None yet"}
- Items purchased: ${[...new Set(purchasedItems)].slice(0, 10).join(", ") || "None yet"}
- Current month: ${currentMonth} (consider seasonal availability)

Available listings:
${availableListings?.map((l) => `- ${l.title} (${l.category}, ₹${l.price}/${l.unit}, ${l.farming_method || "conventional"})`).join("\n") || "None"}

Provide recommendations that:
1. Match customer preferences based on history
2. Consider seasonal availability for ${currentMonth}
3. Include a mix of their favorites and new discoveries
4. Prioritize organic/sustainable options when available

Return ONLY a JSON object in the following format:
{
  "recommendations": [
    {
      "title": "Product or crop name",
      "category": "Category",
      "reason": "Why this is recommended",
      "listing_id": "optional listing id from the list above",
      "priority": "high" | "medium" | "low"
    }
  ],
  "seasonal_tip": "One paragraph seasonal tip"
}

The response must be valid JSON with no extra commentary.`;

  const text = await generateGroqText(prompt);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const recommendations = {
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      seasonal_tip: parsed.seasonal_tip ?? "",
    };

    // Save recommendations to customer preferences
    await supabase
      .from("customer_preferences")
      .upsert(
        {
          customer_id: customerId,
          last_recommendations: recommendations,
          recommendations_updated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id" },
      );

    return recommendations;
  } catch (error) {
    console.error("Failed to parse customer recommendations JSON:", error, text);
    return {
      recommendations: [],
      seasonal_tip: "",
    };
  }
}
