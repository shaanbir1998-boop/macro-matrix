export default async function handler(req, res) {
  const { id } = req.query;

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${process.env.USDA_KEY}`
  );

  const data = await response.json();

  // Extract macros
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  let calories = 0;

  data.foodNutrients.forEach(nutrient => {
    const name = nutrient.nutrient.name;

    if (name === "Protein") protein = nutrient.amount;
    if (name === "Carbohydrate, by difference") carbs = nutrient.amount;
    if (name === "Total lipid (fat)") fats = nutrient.amount;
    if (name === "Energy") calories = nutrient.amount;
  });

  // Send ONLY needed data
  res.status(200).json({
    name: data.description,
    protein,
    carbs,
    fats,
    calories
  });
}
