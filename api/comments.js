export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: 'Database not configured. Create a KV database in Vercel Storage tab.' });
  }

  const headers = { Authorization: `Bearer ${token}` };

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${url}/lrange/comments/0/99`, { headers });
      const data = await r.json();
      const comments = (data.result || []).map(c => { try { return JSON.parse(c); } catch(e) { return null; } }).filter(Boolean);
      return res.status(200).json({ comments });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { name, text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text required' });
    
    const comment = {
      name: (name || 'زائر').slice(0, 50).trim(),
      text: text.slice(0, 500).trim(),
      time: new Date().toISOString()
    };

    try {
      await fetch(`${url}/lpush/comments/${encodeURIComponent(JSON.stringify(comment))}`, { method: 'POST', headers });
      // keep only latest 100
      await fetch(`${url}/ltrim/comments/0/99`, { method: 'POST', headers });
      return res.status(200).json({ ok: true, comment });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
