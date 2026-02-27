export default async function handler(req, res) {
  try {
    // Step 1: Get query from URL instead of body
    const { query } = req.query;

    // Step 2: Validate query exists
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    // Step 3: Call USDA API using GET
    async function searchFood(searchTerm) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: searchTerm })
  });

  const data = await res.json();

  return data.foods;
}
      

    // Step 4: Convert to JSON
    const data = await response.json();

    // Step 5: Return data to frontend
    res.status(200).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "USDA fetch failed" });
  }
}
