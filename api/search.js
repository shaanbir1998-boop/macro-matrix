export default async function handler(req, res) {
  const { query } = req.body;

  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 5 })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
