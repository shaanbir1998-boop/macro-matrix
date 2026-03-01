// /api/food.js
export default async function handler(req, res) {
  // Optional but helpful (CORS + preflight)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const url = `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(
      id
    )}?api_key=${process.env.USDA_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    // If USDA returns an error (bad key, rate limit, etc.)
    if (!response.ok) {
      return res.status(response.status).json({
        error: "USDA request failed",
        status: response.status,
        details: data,
      });
    }

    const nutrients = Array.isArray(data.foodNutrients) ? data.foodNutrients : [];

    const per100g = (name) =>
      nutrients.find((n) => n?.nutrient?.name === name)?.amount ?? 0;

    const protein100 = per100g("Protein");
    const carbs100 = per100g("Carbohydrate, by difference");
    const fats100 = per100g("Total lipid (fat)");
    const calories100 = per100g("Energy");

    // --------- Choose a "1 serving" gram weight ---------
    // Priority:
    // 1) Branded servingSize (often represents 1 serving)
    // 2) A portion in foodPortions that looks like 1 serving/item
    // 3) fallback: 100g (can't infer serving size)
    let grams = null;
    let servingLabel = null;

    // 1) servingSize (best match for "1 serving")
    if (typeof data.servingSize === "number" && data.servingSize > 0) {
      grams = data.servingSize;
      servingLabel = data.householdServingFullText || "1 serving";
    }

    // 2) foodPortions fallback (try to find a 1-unit serving)
    if (!grams && Array.isArray(data.foodPortions) && data.foodPortions.length) {
      const p =
        data.foodPortions.find((x) => x?.amount === 1 && x?.gramWeight > 0) ||
        data.foodPortions.find((x) => x?.gramWeight > 0) ||
        null;

      if (p) {
        grams = p.gramWeight;
        const unit = p?.measureUnit?.name || "portion";
        const modifier = (p.modifier || unit || "portion").toString().trim();
        // Avoid "1 1 cup" if modifier already starts with a number
        servingLabel = /^\d/.test(modifier) ? modifier : `${p.amount || 1} ${modifier}`.trim();
      }
    }

    // 3) final fallback only if USDA doesn't provide serving info
    if (!grams) {
      grams = 100;
      servingLabel = "100 g (fallback)";
    }

    // Scale from per-100g to per-serving/item
    const factor = grams / 100;

    const protein = +(protein100 * factor).toFixed(1);
    const carbs = +(carbs100 * factor).toFixed(1);
    const fats = +(fats100 * factor).toFixed(1);
    const calories = +(calories100 * factor).toFixed(0);

    return res.status(200).json({
      name: data.description ?? "",
      protein,
      carbs,
      fats,
      calories,
      servingLabel,
      grams,
      fdcId: data.fdcId ?? id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch food details" });
  }
}
