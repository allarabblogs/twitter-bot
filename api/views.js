export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'Database not configured' });
  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (req.method === 'POST') {
      // Increment and return new count
      const r = await fetch(`${url}/incr/page_views`, { method: 'POST', headers });
      const data = await r.json();
      return res.status(200).json({ views: data.result || 0 });
    }
    // GET - just read
    const r = await fetch(`${url}/get/page_views`, { headers });
    const data = await r.json();
    return res.status(200).json({ views: parseInt(data.result) || 0 });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
