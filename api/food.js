export default async function handler(req, res) {
  const { id } = req.query;

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${process.env.USDA_KEY}`
  );

  const data = await response.json();
  res.status(200).json(data);
}
