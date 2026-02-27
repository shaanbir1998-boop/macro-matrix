export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${process.env.USDA_KEY}`
    );
    const data = await response.json();

    const nutrients = data.foodNutrients ?? [];

    const per100g = (name) =>
      (nutrients.find((n) => n?.nutrient?.name === name)?.amount) ?? 0;

    const protein100 = per100g("Protein");
    const carbs100 = per100g("Carbohydrate, by difference");
    const fats100 = per100g("Total lipid (fat)");
    const calories100 = per100g("Energy");

    // --------- Choose a "1 item" gram weight ---------
    // Priority:
    // 1) Branded servingSize (often represents 1 serving)
    // 2) A portion in foodPortions that looks like 1 serving/item
    // 3) fallback: 100g (can't infer item size)
    let grams = null;
    let servingLabel = null;

    // 1) servingSize
    if (typeof data.servingSize === "number" && data.servingSize > 0) {
      grams = data.servingSize;
      servingLabel = data.householdServingFullText || "1 serving";
    }

    // 2) foodPortions fallback
    if (!grams && Array.isArray(data.foodPortions) && data.foodPortions.length) {
      // Try to find a portion that represents "1" item/serving
      const p =
        data.foodPortions.find((x) => x.amount === 1 && x.gramWeight > 0) ||
        data.foodPortions.find((x) => x.gramWeight > 0) ||
        null;

      if (p) {
        grams = p.gramWeight;
        // Example label: "1 medium" or "1 cup"
        const unit = p.measureUnit?.name || "portion";
        servingLabel = `${p.amount || 1} ${p.modifier || unit}`.trim();
      }
    }

    // 3) final fallback
    if (!grams) {
      grams = 100;
      servingLabel = "100 g (default)";
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
      grams
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch food details" });
  }
}
