export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${process.env.USDA_KEY}`
    );

    const data = await response.json();

    // Safely handle missing nutrients
    const nutrients = data.foodNutrients ?? [];

    const getAmount = (nutrientName) =>
      (nutrients.find((n) => n?.nutrient?.name === nutrientName)?.amount) ?? 0;

    const protein = getAmount("Protein");
    const carbs = getAmount("Carbohydrate, by difference");
    const fats = getAmount("Total lipid (fat)");
    const calories = getAmount("Energy");

    // ✅ Return a simple, consistent response for your frontend
    return res.status(200).json({
      name: data.description ?? "",
      protein,
      carbs,
      fats,
      calories
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch food details" });
  }
}
