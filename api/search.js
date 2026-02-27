export default async function handler(req, res) {
  try {
    // Step 1: Get query from URL instead of body
    const { query } = req.query;

    // Step 2: Validate query exists
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    // Step 3: Call USDA API using GET
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_KEY}&query=${encodeURIComponent(query)}&pageSize=5&dataType=Foundation`
    );

    // Step 4: Convert to JSON
    const data = await response.json();

    // Step 5: Return data to frontend
    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "USDA fetch failed" });
  }
}
