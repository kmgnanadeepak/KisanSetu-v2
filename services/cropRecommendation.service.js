import { generateGroqText } from "./vision.service.js";

const waterRank = {
  Low: 1,
  Medium: 2,
  High: 3,
};

// Mock crop suitability + mandi price dataset tailored for Indian conditions
const cropDatabase = [
  {
    crop: "Tomato",
    soilTypes: ["loamy", "red", "black"],
    seasons: ["Kharif", "Rabi"],
    waterNeed: "Medium",
    baseYieldPerAcreKg: 2500,
    inputCostPerAcre: 28000,
    priceRangePerKg: [12, 18],
    fertilizers: ["NPK 19:19:19", "Organic compost"],
  },
  {
    crop: "Wheat",
    soilTypes: ["loamy", "clay", "black"],
    seasons: ["Rabi"],
    waterNeed: "Medium",
    baseYieldPerAcreKg: 2200,
    inputCostPerAcre: 24000,
    priceRangePerKg: [18, 24],
    fertilizers: ["DAP", "Urea", "Zinc sulphate"],
  },
  {
    crop: "Paddy (Rice)",
    soilTypes: ["clay", "loamy", "black"],
    seasons: ["Kharif"],
    waterNeed: "High",
    baseYieldPerAcreKg: 2600,
    inputCostPerAcre: 32000,
    priceRangePerKg: [18, 22],
    fertilizers: ["NPK 10:26:26", "Organic manure"],
  },
  {
    crop: "Cotton",
    soilTypes: ["black"],
    seasons: ["Kharif"],
    waterNeed: "Medium",
    baseYieldPerAcreKg: 800,
    inputCostPerAcre: 30000,
    priceRangePerKg: [65, 85],
    fertilizers: ["NPK 20:20:0", "Potash"],
  },
  {
    crop: "Groundnut",
    soilTypes: ["sandy", "red", "loamy"],
    seasons: ["Kharif"],
    waterNeed: "Low",
    baseYieldPerAcreKg: 900,
    inputCostPerAcre: 22000,
    priceRangePerKg: [60, 75],
    fertilizers: ["Gypsum", "Single super phosphate"],
  },
  {
    crop: "Onion",
    soilTypes: ["red", "loamy"],
    seasons: ["Rabi", "Summer"],
    waterNeed: "Medium",
    baseYieldPerAcreKg: 1500,
    inputCostPerAcre: 26000,
    priceRangePerKg: [10, 18],
    fertilizers: ["NPK 12:32:16", "Farmyard manure"],
  },
  {
    crop: "Chillies",
    soilTypes: ["black", "red", "loamy"],
    seasons: ["Kharif", "Rabi"],
    waterNeed: "Medium",
    baseYieldPerAcreKg: 800,
    inputCostPerAcre: 25000,
    priceRangePerKg: [80, 120],
    fertilizers: ["NPK 19:19:19", "Micronutrient mix"],
  },
];

function formatRupees(value) {
  const rounded = Math.round(value);
  return new Intl.NumberFormat("en-IN").format(rounded);
}

function computeRuleBasedBaseline(input) {
  const { soilType, season, waterAvailability, budget, farmSize } = input;

  const filtered = cropDatabase
    .map((entry) => {
      const matchesSoil = entry.soilTypes.includes(soilType);
      const matchesSeason = entry.seasons.includes(season);
      const waterOk = waterRank[waterAvailability] >= waterRank[entry.waterNeed];

      const avgPrice = (entry.priceRangePerKg[0] + entry.priceRangePerKg[1]) / 2;
      const grossPerAcre = entry.baseYieldPerAcreKg * avgPrice;
      const profitPerAcre = grossPerAcre - entry.inputCostPerAcre;

      const totalCost = entry.inputCostPerAcre * farmSize;
      const withinBudget = totalCost <= budget;

      const suitabilityScore =
        (matchesSoil ? 3 : 0) +
        (matchesSeason ? 3 : 0) +
        (waterOk ? 2 : 0) +
        (withinBudget ? 2 : 0);

      return {
        entry,
        matchesSoil,
        matchesSeason,
        waterOk,
        withinBudget,
        profitPerAcre,
        suitabilityScore,
        avgPrice,
      };
    })
    .sort((a, b) => {
      if (b.suitabilityScore !== a.suitabilityScore) {
        return b.suitabilityScore - a.suitabilityScore;
      }
      return b.profitPerAcre - a.profitPerAcre;
    });

  const top = filtered.slice(0, 3);

  return top.map((item) => {
    const { entry, profitPerAcre, avgPrice } = item;
    const [minPrice, maxPrice] = entry.priceRangePerKg;

    return {
      crop: entry.crop,
      expectedProfitPerAcre: Math.max(0, profitPerAcre),
      expectedProfit: `₹${formatRupees(Math.max(0, profitPerAcre))} / acre`,
      expectedPriceRange: `₹${minPrice}-${maxPrice}/kg`,
      fertilizers: entry.fertilizers,
      waterNeed: entry.waterNeed,
      avgPricePerKg: avgPrice,
    };
  });
}

function buildPrompt(input, baselineRecommendations) {
  const { soilType, region, season, waterAvailability, budget, farmSize } = input;

  const baselineText = baselineRecommendations
    .map(
      (rec, idx) =>
        `${idx + 1}. ${rec.crop} – Profit ~${rec.expectedProfit}, Water: ${rec.waterNeed}, ` +
        `Price: ${rec.expectedPriceRange}, Fertilizers: ${rec.fertilizers.join(", ")}`,
    )
    .join("\n");

  return `You are an AI agricultural planning assistant helping Indian farmers plan crops for the next season.

Farmer context:
- Soil type: ${soilType}
- Region: ${region || "Not specified"}
- Season: ${season}
- Water availability: ${waterAvailability}
- Budget: ₹${formatRupees(budget)} total
- Farm size: ${farmSize} acres

You also have rule-based baseline suggestions and mandi-style price estimates:
${baselineText || "No strong rule-based matches – suggest robust, low-risk crops."}

Using agronomy knowledge plus market understanding, suggest the TOP 3 most profitable yet realistic crops to grow next season.

Very important:
- Make suggestions practical for small and medium Indian farmers.
- Respect water constraints and budget (avoid extremely high input cost crops if budget is low).
- Prefer crops that match the soil and season; only deviate if no suitable option exists.
- Consider risk diversification – don't suggest three ultra-volatile crops together.

Return ONLY a JSON object in the following format:
{
  "recommendations": [
    {
      "crop": "Tomato",
      "expectedProfit": "₹45000 / acre",
      "expectedProfitValue": 45000,
      "expectedPriceRange": "₹14-18/kg",
      "fertilizers": ["NPK 19:19:19", "Organic compost"],
      "waterNeed": "Medium",
      "whyRecommended": "Short-season cash crop suitable for loamy soil in Maharashtra with medium water and strong urban demand."
    }
  ]
}

Rules:
- expectedProfitValue must be a NUMBER representing profit per acre in rupees (no currency symbol).
- expectedProfit must be a human-readable string using Indian format, e.g. "₹45,000 / acre".
- fertilizers must be a short array of 2–4 input recommendations.
- whyRecommended must be a 1–2 sentence explanation tailored to the given inputs.
- Do NOT include any extra commentary outside JSON.`;
}

async function callAI(prompt) {
  try {
    const text = await generateGroqText(prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.recommendations)) {
      throw new Error("AI response missing recommendations array");
    }

    return {
      recommendations: parsed.recommendations.map((rec) => ({
        crop: String(rec.crop ?? "").trim(),
        expectedProfit:
          typeof rec.expectedProfit === "string"
            ? rec.expectedProfit
            : `₹${formatRupees(Number(rec.expectedProfitValue || 0))} / acre`,
        expectedProfitValue: Number(rec.expectedProfitValue ?? 0),
        expectedPriceRange: String(rec.expectedPriceRange ?? "").trim(),
        fertilizers: Array.isArray(rec.fertilizers)
          ? rec.fertilizers.map((f) => String(f))
          : [],
        waterNeed: String(rec.waterNeed ?? "Medium"),
        whyRecommended: String(
          rec.whyRecommended ??
            "Recommended based on soil, season, water availability, and budget profile.",
        ).trim(),
      })),
    };
  } catch (error) {
    console.error("AI API call failed:", error);
    throw error;
  }
}

export async function getCropRecommendations(input) {
  const baseline = computeRuleBasedBaseline(input);

  try {
    const prompt = buildPrompt(input, baseline);
    const aiResult = await callAI(prompt);

    // If AI returned obviously empty data, fall back to baseline
    if (!aiResult.recommendations.length) {
      throw new Error("Empty AI recommendation list");
    }

    return aiResult;
  } catch (error) {
    console.error("AI crop recommendation failed, falling back to rule-based:", error);

    return {
      recommendations: baseline.map((rec) => ({
        crop: rec.crop,
        expectedProfit: rec.expectedProfit,
        expectedProfitValue: rec.expectedProfitPerAcre,
        expectedPriceRange: rec.expectedPriceRange,
        fertilizers: rec.fertilizers,
        waterNeed: rec.waterNeed,
        whyRecommended:
          `Based on your ${input.soilType} soil in ${input.region || "your region"}, ` +
          `${rec.crop} fits the ${input.season} season, works with ${input.waterAvailability.toLowerCase()} water ` +
          `availability, and matches your budget for ${input.farmSize} acre(s).`,
      })),
    };
  }
}

