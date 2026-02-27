export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${process.env.USDA_KEY}`
    );
    const data = await response.json();

    const nutrients = data.foodNutrients ?? [];

    const per100 = (name) =>
      nutrients.find((n) => n?.nutrient?.name === name)?.amount ?? 0;

    const protein100 = per100("Protein");
    const carbs100 = per100("Carbohydrate, by difference");
    const fats100 = per100("Total lipid (fat)");
    const calories100 = per100("Energy");

    // Build portion options (grams + label)
    const portions = [];

    // A) branded serving size (often best for "1 item")
    if (typeof data.servingSize === "number" && data.servingSize > 0) {
      portions.push({
        label: data.householdServingFullText || "1 serving",
        grams: data.servingSize
      });
    }

    // B) foodPortions (Foundation/Survey foods)
    if (Array.isArray(data.foodPortions)) {
      for (const p of data.foodPortions) {
        const grams = p?.gramWeight;
        if (!grams || grams <= 0) continue;

        const amount = p.amount ?? 1;
        const unit = p.measureUnit?.name || "";
        const modifier = p.modifier || unit || "portion";

        const label = `${amount} ${modifier}`.trim(); // e.g. "1 medium", "1 cup"
        portions.push({ label, grams });
      }
    }

    // de-dup similar portion labels/grams
    const dedup = [];
    const seen = new Set();
    for (const p of portions) {
      const key = `${p.label.toLowerCase()}|${Math.round(p.grams)}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push({ label: p.label, grams: p.grams });
      }
    }

    // Default grams choice:
    // 1) servingSize if present
    // 2) a portion with amount===1
    // 3) first portion
    // 4) fallback 100g
    let defaultGrams =
      (typeof data.servingSize === "number" && data.servingSize > 0)
        ? data.servingSize
        : (data.foodPortions?.find((p) => p.amount === 1 && p.gramWeight > 0)?.gramWeight)
          ?? (dedup[0]?.grams ?? 100);

    return res.status(200).json({
      name: data.description ?? "",
      per100: { protein: protein100, carbs: carbs100, fats: fats100, calories: calories100 },
      portions: dedup,               // [{label, grams}, ...]
      defaultGrams                   // number
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch food details" });
  }
}
