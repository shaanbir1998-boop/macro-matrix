// /api/food.js
export default async function handler(req, res) {
  // Optional CORS (safe to keep; helps if you ever call from elsewhere)
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

    if (!response.ok) {
      return res.status(response.status).json({
        error: "USDA request failed",
        status: response.status,
        details: data,
      });
    }

    const nutrients = Array.isArray(data.foodNutrients) ? data.foodNutrients : [];

    const getPer100 = (name) =>
      nutrients.find((n) => n?.nutrient?.name === name)?.amount ?? 0;

    // USDA amounts are typically per 100g basis
    const protein100 = getPer100("Protein");
    const carbs100 = getPer100("Carbohydrate, by difference");
    const fats100 = getPer100("Total lipid (fat)");
    const calories100 = getPer100("Energy");

    // We prefer "1 serving" if available, else fallback to a portion, else 100g.
    let grams = null;
    let servingLabel = null;

    // 1) Prefer official servingSize (commonly branded foods)
    if (typeof data.servingSize === "number" && data.servingSize > 0) {
      grams = data.servingSize;
      servingLabel = data.householdServingFullText || "1 serving";
    }

    // 2) Otherwise, use foodPortions (try to find a 1-unit portion)
    if (!grams && Array.isArray(data.foodPortions) && data.foodPortions.length) {
      const p =
        data.foodPortions.find((x) => x?.amount === 1 && x?.gramWeight > 0) ||
        data.foodPortions.find((x) => x?.gramWeight > 0) ||
        null;

      if (p) {
        grams = p.gramWeight;
        const unit = p?.measureUnit?.name || "portion";
        const modifier = (p.modifier || unit || "portion").toString().trim();
        // If modifier already includes a number (e.g., "1 cup"), avoid "1 1 cup"
        servingLabel = /^\d/.test(modifier) ? modifier : `1 ${modifier}`;
      }
    }

    // 3) Last resort fallback
    if (!grams) {
      grams = 100;
      servingLabel = "100 g (fallback)";
    }

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
