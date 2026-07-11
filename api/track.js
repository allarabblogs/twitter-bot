export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(200).json({ ok: false });
  const headers = { Authorization: `Bearer ${token}` };

  const { q } = req.body || {};
  if (!q || !q.trim()) return res.status(200).json({ ok: false });

  const entry = { q: String(q).slice(0, 100).trim(), time: new Date().toISOString() };

  try {
    await fetch(`${url}/lpush/searches/${encodeURIComponent(JSON.stringify(entry))}`, { method: 'POST', headers });
    await fetch(`${url}/ltrim/searches/0/999`, { method: 'POST', headers });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}
