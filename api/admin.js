export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD not set in environment variables' });

  const { password, action, index } = req.body || {};
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  try {
    if (action === 'searches') {
      const r = await fetch(`${url}/lrange/searches/0/999`, { headers });
      const data = await r.json();
      const searches = (data.result || []).map(c => { try { return JSON.parse(c); } catch(e) { return null; } }).filter(Boolean);
      return res.status(200).json({ searches });
    }

    if (action === 'list') {
      const r = await fetch(`${url}/lrange/comments/0/199`, { headers });
      const data = await r.json();
      const comments = (data.result || []).map(c => { try { return JSON.parse(c); } catch(e) { return null; } }).filter(Boolean);
      return res.status(200).json({ comments });
    }

    if (action === 'delete' && typeof index === 'number') {
      // Get all, remove by index, rewrite the list
      const r = await fetch(`${url}/lrange/comments/0/199`, { headers });
      const data = await r.json();
      const all = data.result || [];
      if (index < 0 || index >= all.length) return res.status(400).json({ error: 'Invalid index' });
      all.splice(index, 1);
      await fetch(`${url}/del/comments`, { method: 'POST', headers });
      for (let i = all.length - 1; i >= 0; i--) {
        await fetch(`${url}/lpush/comments/${encodeURIComponent(all[i])}`, { method: 'POST', headers });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'deleteAll') {
      await fetch(`${url}/del/comments`, { method: 'POST', headers });
      return res.status(200).json({ ok: true });
    }

    res.status(400).json({ error: 'Unknown action' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
