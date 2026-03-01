// /api/search.js
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const body = await readJsonBody(req);
    const query = (body.query || "").trim();
    if (!query) return res.status(400).json({ error: "Missing query" });

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_KEY}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 5 }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "USDA search failed",
        status: r.status,
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Search server error", details: String(err) });
  }
}
