/**
 * Static Pricing Service
 * All prices come from a local lookup table — never from AI, never from external APIs.
 * Unit conversion: liter/kg base units only.
 */

// ---------- Static Price Table ----------

const PRICE_TABLE = {
    // Fungicides
    "Chlorothalonil": { type: "liquid", pricePerLiter: 900, pricePerKg: null },
    "Mancozeb": { type: "powder", pricePerLiter: null, pricePerKg: 350 },
    "Copper Oxychloride": { type: "powder", pricePerLiter: null, pricePerKg: 420 },
    "Carbendazim": { type: "powder", pricePerLiter: null, pricePerKg: 480 },
    "Propiconazole": { type: "liquid", pricePerLiter: 1200, pricePerKg: null },
    "Hexaconazole": { type: "liquid", pricePerLiter: 1100, pricePerKg: null },
    "Metalaxyl": { type: "powder", pricePerLiter: null, pricePerKg: 600 },
    "Thiram": { type: "powder", pricePerLiter: null, pricePerKg: 380 },
    "Zineb": { type: "powder", pricePerLiter: null, pricePerKg: 300 },
    "Sulfur": { type: "powder", pricePerLiter: null, pricePerKg: 150 },
    "Bordeaux Mixture": { type: "powder", pricePerLiter: null, pricePerKg: 250 },
    "Trichoderma": { type: "powder", pricePerLiter: null, pricePerKg: 400 },
    "Mancozeb Fungicide": { type: "powder", pricePerLiter: null, pricePerKg: 350 },

    // Insecticides
    "Imidacloprid": { type: "liquid", pricePerLiter: 1800, pricePerKg: null },
    "Chlorpyrifos": { type: "liquid", pricePerLiter: 650, pricePerKg: null },
    "Cypermethrin": { type: "liquid", pricePerLiter: 750, pricePerKg: null },
    "Dimethoate": { type: "liquid", pricePerLiter: 500, pricePerKg: null },
    "Neem Oil": { type: "liquid", pricePerLiter: 400, pricePerKg: null },
    "Spinosad": { type: "liquid", pricePerLiter: 2200, pricePerKg: null },
    "Fipronil": { type: "liquid", pricePerLiter: 1500, pricePerKg: null },

    // Fertilizers
    "Urea": { type: "powder", pricePerLiter: null, pricePerKg: 8 },
    "Urea (46-0-0)": { type: "powder", pricePerLiter: null, pricePerKg: 8 },
    "DAP": { type: "powder", pricePerLiter: null, pricePerKg: 27 },
    "Potash (MOP)": { type: "powder", pricePerLiter: null, pricePerKg: 18 },
    "Ammonium Nitrate": { type: "powder", pricePerLiter: null, pricePerKg: 12 },
    "NPK 10-26-26": { type: "powder", pricePerLiter: null, pricePerKg: 24 },
    "Organic Compost": { type: "powder", pricePerLiter: null, pricePerKg: 3 },
    "Micronutrient Mix": { type: "powder", pricePerLiter: null, pricePerKg: 200 },

    // Herbicides
    "Glyphosate": { type: "liquid", pricePerLiter: 600, pricePerKg: null },
    "2,4-D": { type: "liquid", pricePerLiter: 450, pricePerKg: null },
    "Atrazine": { type: "powder", pricePerLiter: null, pricePerKg: 350 },
    "Pendimethalin": { type: "liquid", pricePerLiter: 700, pricePerKg: null },
};

// ---------- Fuzzy Lookup ----------

/**
 * Look up a product in PRICE_TABLE using case-insensitive substring matching.
 * @param {string} name
 * @returns {{ type: string, pricePerLiter: number|null, pricePerKg: number|null } | null}
 */
function lookupPrice(name) {
    if (!name) return null;
    const lower = name.toLowerCase();

    // Exact match first
    for (const [key, val] of Object.entries(PRICE_TABLE)) {
        if (key.toLowerCase() === lower) return val;
    }
    // Substring match fallback
    for (const [key, val] of Object.entries(PRICE_TABLE)) {
        if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
            return val;
        }
    }
    return null;
}

// ---------- Unit-Safe Cost Calculation ----------

/**
 * @param {string} dosageStr - e.g. "500 ml per acre", "2.5 kg per acre", "2.5"
 * @param {{ type: string, pricePerLiter: number|null, pricePerKg: number|null }} priceEntry
 * @returns {{ totalCost: number, unitPrice: number, requiredQuantity: string, currency: string } | null}
 */
function calculateCost(dosageStr, priceEntry) {
    if (!priceEntry) return null;

    // Extract numeric value and unit from dosage string
    const numMatch = String(dosageStr).match(/([\d.]+)/);
    if (!numMatch) return null;
    const numericValue = parseFloat(numMatch[1]);
    if (Number.isNaN(numericValue) || numericValue <= 0) return null;

    const dosageLower = String(dosageStr).toLowerCase();
    let totalCost = 0;
    let unitPrice = 0;
    let displayQty = "";

    if (priceEntry.type === "liquid" && priceEntry.pricePerLiter != null) {
        unitPrice = priceEntry.pricePerLiter;
        // Determine if value is in ml or liters
        if (dosageLower.includes("ml")) {
            totalCost = (priceEntry.pricePerLiter / 1000) * numericValue;
            displayQty = `${numericValue} ml`;
        } else if (dosageLower.includes("liter") || dosageLower.includes("litre") || dosageLower.includes("l")) {
            totalCost = priceEntry.pricePerLiter * numericValue;
            displayQty = `${numericValue} L`;
        } else {
            // Default: assume ml for small values, liters for large
            if (numericValue >= 10) {
                totalCost = (priceEntry.pricePerLiter / 1000) * numericValue;
                displayQty = `${numericValue} ml`;
            } else {
                totalCost = priceEntry.pricePerLiter * numericValue;
                displayQty = `${numericValue} L`;
            }
        }
    } else if (priceEntry.type === "powder" && priceEntry.pricePerKg != null) {
        unitPrice = priceEntry.pricePerKg;
        // Determine if value is in grams or kg
        if (dosageLower.includes("gram") || dosageLower.includes(" g")) {
            totalCost = (priceEntry.pricePerKg / 1000) * numericValue;
            displayQty = `${numericValue} g`;
        } else if (dosageLower.includes("kg") || dosageLower.includes("kilo")) {
            totalCost = priceEntry.pricePerKg * numericValue;
            displayQty = `${numericValue} kg`;
        } else {
            // Default: assume kg for dosagePerAcre values
            totalCost = priceEntry.pricePerKg * numericValue;
            displayQty = `${numericValue} kg`;
        }
    } else {
        return null;
    }

    return {
        totalCost: Math.round(totalCost * 100) / 100,
        unitPrice,
        requiredQuantity: displayQty,
        currency: "INR",
    };
}

// ---------- Strip AI-Generated Financial Fields ----------

const PRICE_FIELDS_TO_STRIP = [
    "price", "pricePerUnit", "pricePerLiter", "pricePerKg",
    "cost", "totalCost", "unitPrice", "savings", "estimatedProfit",
    "currency", "profit", "revenue",
];

function stripPriceFields(treatment) {
    const clean = { ...treatment };
    for (const field of PRICE_FIELDS_TO_STRIP) {
        delete clean[field];
    }
    return clean;
}

// ---------- Public API ----------

/**
 * Enrich treatments from AI with static prices from PRICE_TABLE.
 * Strips any price fields the AI may have hallucinated.
 *
 * @param {Array<{ name: string, dosagePerAcre?: string|number, unit?: string, description?: string }>} treatments
 * @returns {Array}
 */
export function enrichTreatmentsWithPricing(treatments) {
    if (!Array.isArray(treatments) || treatments.length === 0) {
        return [];
    }

    return treatments.map((treatment) => {
        // Strip any AI-hallucinated financial fields
        const clean = stripPriceFields(treatment);

        const priceEntry = lookupPrice(clean.name);
        const dosage = clean.dosagePerAcre || clean.dosage || "0";
        const costInfo = calculateCost(String(dosage), priceEntry);

        return {
            product: clean.name,
            dosagePerAcre: String(dosage),
            description: clean.description || "",
            // Pricing from static table (null if product not found)
            unitPrice: costInfo?.unitPrice ?? null,
            totalCost: costInfo?.totalCost ?? null,
            requiredQuantity: costInfo?.requiredQuantity ?? String(dosage),
            currency: costInfo?.currency ?? "INR",
            pricingAvailable: costInfo !== null,
        };
    });
}
